import asyncio
import time

import pytest

from app.config import settings
from app.services.chat import realtime
from app.services.chat.realtime import Connection, Hub, RealtimeUnavailable


async def _blackhole_server():
    """Accepts TCP connections and never replies — a hung Redis."""
    held = []

    async def handle(reader, writer):
        held.append(writer)
        await asyncio.sleep(3600)

    server = await asyncio.start_server(handle, "127.0.0.1", 0)
    return server, server.sockets[0].getsockname()[1]


def test_hung_redis_costs_one_timeout_then_breaker_skips_it(monkeypatch):
    monkeypatch.setattr(settings, "CHAT_ENABLED", True)
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")

    async def scenario():
        server, port = await _blackhole_server()
        monkeypatch.setattr(settings, "REDIS_URL", f"redis://127.0.0.1:{port}/0")
        hub = Hub()
        await hub.start()
        try:
            conn = Connection(user_id=1, company_id=1)
            hub.register(conn)
            timings = []
            for i in range(20):
                started = time.monotonic()
                assert await hub.allow("send:1", 100, 10)
                await hub.publish([1], {"type": "message.new", "conversation_id": 1, "seq": i + 1, "sender_id": 2})
                timings.append(time.monotonic() - started)
            assert timings[0] <= realtime.REDIS_OP_TIMEOUT + 0.3
            assert max(timings[1:]) < 0.05, timings
            for i in range(20):
                assert (await asyncio.wait_for(conn.queue.get(), 1))
            with pytest.raises(RealtimeUnavailable):
                await hub.issue_ticket({"user_id": 1})
        finally:
            await hub.stop()
            server.close()

    asyncio.run(scenario())


def test_breaker_closes_after_cooldown(monkeypatch):
    monkeypatch.setattr(realtime, "REDIS_BREAKER_SECONDS", 0.2)
    hub = Hub()
    hub._redis = object()
    hub._trip(ConnectionError())
    assert hub._client() is None
    time.sleep(0.25)
    assert hub._client() is hub._redis


def test_memory_mode_refused_in_production(monkeypatch):
    monkeypatch.setattr(settings, "REDIS_URL", "")
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    hub = Hub()

    async def scenario():
        with pytest.raises(RealtimeUnavailable):
            await hub.issue_ticket({"user_id": 1})
        assert await hub.consume_ticket("x" * 43) is None

    asyncio.run(scenario())
