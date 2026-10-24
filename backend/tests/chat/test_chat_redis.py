"""Chat realtime hub against a real Redis. Two Hub instances stand in for two workers.

Runs only when CHAT_REDIS_TEST_URL points at a local Redis, e.g.
  CHAT_REDIS_TEST_URL=redis://127.0.0.1:6390/15
"""
import asyncio
import json
import os
import time

import pytest

from app.config import settings
from app.services.chat import realtime
from app.services.chat.realtime import Connection, Hub, RealtimeUnavailable
from tests.chat.safety import disposable_redis_url

REDIS_URL = os.environ.get("CHAT_REDIS_TEST_URL", "")

pytestmark = pytest.mark.skipif(
    not disposable_redis_url(REDIS_URL),
    reason="CHAT_REDIS_TEST_URL not set to a local Redis with a non-zero db number",
)

DEAD_REDIS = "redis://127.0.0.1:1/0"


@pytest.fixture
def redis_settings(monkeypatch):
    monkeypatch.setattr(settings, "CHAT_ENABLED", True)
    monkeypatch.setattr(settings, "REDIS_URL", REDIS_URL)
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")


async def _two_workers():
    a, b = Hub(), Hub()
    await a.start()
    await b.start()
    await a._redis.flushdb()
    await asyncio.sleep(0.3)  # let both subscribers attach
    return a, b


async def _stop(*hubs):
    for h in hubs:
        await h.stop()


def test_ticket_issued_on_one_worker_is_consumable_once_on_another(redis_settings):
    async def scenario():
        a, b = await _two_workers()
        try:
            data = {"user_id": 7, "company_id": 3, "token_version": 0, "exp": int(time.time()) + 60}
            ticket = await a.issue_ticket(data)
            ttl = await a._redis.ttl(realtime._ticket_key(ticket))
            assert 0 < ttl <= realtime.TICKET_TTL_SECONDS
            assert await b.consume_ticket(ticket) == data
            assert await a.consume_ticket(ticket) is None
            assert await b.consume_ticket(ticket) is None
        finally:
            await _stop(a, b)

    asyncio.run(scenario())


def test_ticket_expires(redis_settings, monkeypatch):
    monkeypatch.setattr(realtime, "TICKET_TTL_SECONDS", 1)

    async def scenario():
        a, b = await _two_workers()
        try:
            ticket = await a.issue_ticket({"user_id": 1})
            await asyncio.sleep(1.6)
            assert await b.consume_ticket(ticket) is None
        finally:
            await _stop(a, b)

    asyncio.run(scenario())


def test_concurrent_consumption_has_exactly_one_winner(redis_settings):
    async def scenario():
        a, b = await _two_workers()
        try:
            ticket = await a.issue_ticket({"user_id": 1})
            results = await asyncio.gather(*[(a if i % 2 else b).consume_ticket(ticket) for i in range(20)])
            assert sum(r is not None for r in results) == 1
        finally:
            await _stop(a, b)

    asyncio.run(scenario())


def test_event_published_on_one_worker_reaches_socket_on_other(redis_settings):
    async def scenario():
        a, b = await _two_workers()
        try:
            on_b = Connection(user_id=11, company_id=1)
            stranger_on_b = Connection(user_id=12, company_id=1)
            b.register(on_b)
            b.register(stranger_on_b)
            await a.publish([11], {"type": "message.new", "conversation_id": 5, "seq": 1, "sender_id": 10})
            payload = await asyncio.wait_for(on_b.queue.get(), 3)
            assert json.loads(payload)["conversation_id"] == 5
            await asyncio.sleep(0.2)
            assert stranger_on_b.queue.empty()
            assert a.local_connection_count() == 0
        finally:
            await _stop(a, b)

    asyncio.run(scenario())


def test_event_is_delivered_once_on_the_publishing_worker(redis_settings):
    async def scenario():
        a, b = await _two_workers()
        try:
            local = Connection(user_id=21, company_id=1)
            a.register(local)
            await a.publish([21], {"type": "ping-test"})
            await asyncio.wait_for(local.queue.get(), 3)
            await asyncio.sleep(0.3)
            assert local.queue.empty()
        finally:
            await _stop(a, b)

    asyncio.run(scenario())


def test_rate_limit_and_presence_are_shared(redis_settings):
    async def scenario():
        a, b = await _two_workers()
        try:
            allowed = [await (a if i % 2 else b).allow("send:99", 5, 10) for i in range(7)]
            assert allowed == [True] * 5 + [False] * 2
            await a.touch_presence(31)
            assert await b.online_user_ids([31, 32]) == {31}
        finally:
            await _stop(a, b)

    asyncio.run(scenario())


def test_redis_down_publish_is_bounded_and_tickets_refused(redis_settings, monkeypatch):
    monkeypatch.setattr(settings, "REDIS_URL", DEAD_REDIS)

    async def scenario():
        hub = Hub()
        await hub.start()
        try:
            local = Connection(user_id=41, company_id=1)
            hub.register(local)
            started = time.monotonic()
            await hub.publish([41], {"type": "message.new", "conversation_id": 1, "seq": 1, "sender_id": 2})
            elapsed = time.monotonic() - started
            assert elapsed < 1.0, elapsed
            assert json.loads(await asyncio.wait_for(local.queue.get(), 1))["seq"] == 1
            with pytest.raises(RealtimeUnavailable):
                await hub.issue_ticket({"user_id": 1})
            assert await hub.consume_ticket("x" * 43) is None
            assert await hub.allow("send:1", 1, 10) is True
            assert await hub.allow("send:1", 1, 10) is False
        finally:
            await hub.stop()

    asyncio.run(scenario())


def test_hub_start_never_raises_with_unreachable_redis(redis_settings, monkeypatch):
    monkeypatch.setattr(settings, "REDIS_URL", DEAD_REDIS)

    async def scenario():
        hub = Hub()
        await hub.start()
        await asyncio.sleep(0.3)
        await hub.stop()

    asyncio.run(scenario())


def test_upload_slots_are_shared_and_expire_individually(redis_settings):
    async def scenario():
        a, b = await _two_workers()
        try:
            assert await a.acquire_slot("server", "s1", 2, 60)
            assert await b.acquire_slot("server", "s2", 2, 60)
            assert not await a.acquire_slot("server", "s3", 2, 60)  # full across workers
            assert await b._redis.zcard("chat:slots:server") == 2  # refused slot left no trace
            await a.release_slot("server", "s1")
            assert await b.acquire_slot("server", "s3", 2, 60)
            # A crashed upload's slot ages out on its own.
            await a._redis.zadd("chat:slots:server", {"s2": time.time() - 120})
            assert await a.acquire_slot("server", "s4", 2, 60)
        finally:
            await _stop(a, b)

    asyncio.run(scenario())


def test_byte_budget_is_shared_and_refusals_cost_nothing(redis_settings):
    async def scenario():
        a, b = await _two_workers()
        try:
            assert await a.consume("bytes:7", 600, 1000, 3600)
            assert not await b.consume("bytes:7", 500, 1000, 3600)
            assert await b.consume("bytes:7", 400, 1000, 3600)
            assert not await a.consume("bytes:7", 1, 1000, 3600)
        finally:
            await _stop(a, b)

    asyncio.run(scenario())


def test_event_for_one_connection_reaches_only_that_tab_on_another_worker(redis_settings):
    async def scenario():
        a, b = await _two_workers()
        try:
            tab1, tab2 = Connection(7, 3), Connection(7, 3)
            b.register(tab1)
            b.register(tab2)
            await a.publish([7], {"type": "call.signal", "call_id": 1, "data": {"kind": "offer"}}, tab2.conn_id)
            await asyncio.sleep(0.3)
            assert tab1.queue.empty()
            assert json.loads(tab2.queue.get_nowait())["type"] == "call.signal"
            await a.publish([7], {"type": "call.incoming", "call_id": 1})
            await asyncio.sleep(0.3)
            assert not tab1.queue.empty() and not tab2.queue.empty()
        finally:
            await _stop(a, b)

    asyncio.run(scenario())


def test_call_state_store_is_shared_and_answer_claim_is_atomic(redis_settings):
    async def scenario():
        a, b = await _two_workers()
        try:
            assert await a.kv_set("chat:call:1", '{"state":"ringing"}', 60)
            assert await b.kv_get("chat:call:1") == '{"state":"ringing"}'
            claims = await asyncio.gather(*(
                h.kv_set("chat:call:1:answered", f"tab{i}", 60, only_if_absent=True)
                for i, h in enumerate([a, b, a, b, a, b])
            ))
            assert sum(claims) == 1
            await b.kv_expire("chat:call:1", 1)
            assert 0 < await a._redis.ttl("chat:call:1") <= 1
            await a.kv_delete("chat:call:1", "chat:call:1:answered")
            assert await b.kv_get("chat:call:1") is None
        finally:
            await _stop(a, b)

    asyncio.run(scenario())


def test_call_state_refuses_when_redis_is_down_in_production(redis_settings, monkeypatch):
    async def scenario():
        h = Hub()
        h._redis = None  # never started / tripped
        with pytest.raises(RealtimeUnavailable):
            await h.kv_get("chat:call:1")

    asyncio.run(scenario())
