"""Per-worker realtime hub for team chat.

Postgres is the source of truth. Events carry ids only (never message text);
clients fetch content over REST. Redis is shared by all gunicorn workers for
WS tickets, cross-worker event fan-out, presence and rate limits. Redis
pub/sub is at-most-once, so clients also reconcile over REST periodically.

Without REDIS_URL an in-process fallback is used, which only works with a
single worker; it is refused when ENVIRONMENT=production.
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import secrets
import time
import uuid
from collections import defaultdict, deque

from app.config import settings

logger = logging.getLogger("app.chat.realtime")

CHANNEL = "chat:events"
TICKET_TTL_SECONDS = 30
PRESENCE_TTL_SECONDS = 60
REDIS_OP_TIMEOUT = 0.5
# After a Redis failure, skip Redis for this long so a hung Redis costs one timeout, not one per request.
REDIS_BREAKER_SECONDS = 5.0
QUEUE_MAX = 200


class RealtimeUnavailable(Exception):
    pass


class Connection:
    """Must be created on the event loop that serves the socket."""

    def __init__(self, user_id: int, company_id: int):
        self.user_id = user_id
        self.company_id = company_id
        # Identifies this socket (one browser tab) so call setup can reach exactly one tab.
        self.conn_id = uuid.uuid4().hex
        self.queue: asyncio.Queue[str] = asyncio.Queue(maxsize=QUEUE_MAX)
        self.overflowed = False
        self._loop = asyncio.get_running_loop()

    def offer(self, payload: str) -> None:
        """Thread- and loop-safe: the put always runs on the socket's own loop, which wakes its sender."""
        try:
            self._loop.call_soon_threadsafe(self._put, payload)
        except RuntimeError:
            pass

    def _put(self, payload: str) -> None:
        try:
            self.queue.put_nowait(payload)
        except asyncio.QueueFull:
            self.overflowed = True


def _ticket_key(ticket: str) -> str:
    return "chat:ticket:" + hashlib.sha256(ticket.encode("utf-8")).hexdigest()


class Hub:
    def __init__(self) -> None:
        self._local: dict[int, set[Connection]] = defaultdict(set)
        self._redis = None
        self._sub_task: asyncio.Task | None = None
        self._mem_tickets: dict[str, tuple[float, dict]] = {}
        self._mem_presence: dict[int, float] = {}
        self._mem_rate: dict[str, deque] = defaultdict(deque)
        self._mem_slots: dict[str, dict[str, float]] = defaultdict(dict)
        self._mem_totals: dict[str, tuple[int, int]] = {}
        self._mem_kv: dict[str, tuple[float, str]] = {}
        self._redis_down_until = 0.0

    # ---- lifecycle -------------------------------------------------------

    @property
    def uses_redis(self) -> bool:
        return bool(settings.REDIS_URL)

    def memory_mode_allowed(self) -> bool:
        return not self.uses_redis and (settings.ENVIRONMENT or "").lower() != "production"

    async def start(self) -> None:
        """Never raises: chat problems must not stop the CRM from booting."""
        if not settings.CHAT_ENABLED or not self.uses_redis or self._sub_task is not None:
            return
        try:
            import redis.asyncio as aioredis

            self._redis = aioredis.Redis.from_url(
                settings.REDIS_URL,
                socket_timeout=REDIS_OP_TIMEOUT,
                socket_connect_timeout=REDIS_OP_TIMEOUT,
                decode_responses=True,
            )
            self._sub_task = asyncio.create_task(self._subscribe_forever())
        except Exception:
            logger.exception("Chat realtime hub failed to start; continuing without live updates")
            self._redis = None
            self._sub_task = None

    async def stop(self) -> None:
        task, self._sub_task = self._sub_task, None
        if task is not None:
            task.cancel()
            try:
                await task
            except (asyncio.CancelledError, Exception):
                pass
        client, self._redis = self._redis, None
        if client is not None:
            try:
                await client.aclose()
            except Exception:
                pass

    async def _subscribe_forever(self) -> None:
        import redis.asyncio as aioredis

        backoff = 0.5
        while True:
            client = None
            pubsub = None
            try:
                client = aioredis.Redis.from_url(
                    settings.REDIS_URL,
                    socket_connect_timeout=REDIS_OP_TIMEOUT,
                    socket_keepalive=True,
                    health_check_interval=15,
                    decode_responses=True,
                )
                pubsub = client.pubsub(ignore_subscribe_messages=True)
                await pubsub.subscribe(CHANNEL)
                backoff = 0.5
                while True:
                    message = await pubsub.get_message(timeout=5.0)
                    if message and message.get("type") == "message":
                        self._deliver_raw(message.get("data"))
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                logger.warning("Chat event subscriber disconnected (%s); retrying in %.1fs", type(exc).__name__, backoff)
                await asyncio.sleep(backoff)
                backoff = min(backoff * 2, 10.0)
            finally:
                for closer in (pubsub, client):
                    if closer is not None:
                        try:
                            await closer.aclose()
                        except Exception:
                            pass

    def _client(self):
        if self._redis is None or time.monotonic() < self._redis_down_until:
            return None
        return self._redis

    def _trip(self, exc: Exception) -> None:
        if time.monotonic() >= self._redis_down_until:
            logger.warning("Chat Redis call failed (%s); using fallbacks for %.0fs", type(exc).__name__, REDIS_BREAKER_SECONDS)
        self._redis_down_until = time.monotonic() + REDIS_BREAKER_SECONDS

    # ---- local connections ----------------------------------------------

    def register(self, conn: Connection) -> None:
        self._local[conn.user_id].add(conn)

    def unregister(self, conn: Connection) -> None:
        conns = self._local.get(conn.user_id)
        if conns is not None:
            conns.discard(conn)
            if not conns:
                self._local.pop(conn.user_id, None)

    def local_connection_count(self) -> int:
        return sum(len(c) for c in self._local.values())

    def _deliver_local(self, user_ids: list[int], event: dict, conn_id: str | None = None) -> None:
        payload = json.dumps(event, separators=(",", ":"))
        for uid in user_ids:
            for conn in list(self._local.get(uid, ())):
                if conn_id is None or conn.conn_id == conn_id:
                    conn.offer(payload)

    def _deliver_raw(self, data) -> None:
        try:
            envelope = json.loads(data)
            to = [int(u) for u in envelope["to"]]
            event = envelope["event"]
            conn_id = envelope.get("conn")
        except (TypeError, ValueError, KeyError, AttributeError):
            logger.warning("Dropped malformed chat event envelope")
            return
        self._deliver_local(to, event, conn_id if isinstance(conn_id, str) else None)

    # ---- events ----------------------------------------------------------

    async def publish(self, user_ids: list[int], event: dict, conn_id: str | None = None) -> None:
        """Fire-and-forget fan-out; never raises. Event payloads must not contain message text.

        With `conn_id`, only that one socket (tab) of the given user receives the event.
        """
        if not user_ids:
            return
        client = self._client()
        if client is not None:
            body = {"to": list(user_ids), "event": event}
            if conn_id is not None:
                body["conn"] = conn_id
            envelope = json.dumps(body, separators=(",", ":"))
            try:
                await asyncio.wait_for(client.publish(CHANNEL, envelope), REDIS_OP_TIMEOUT)
                return
            except Exception as exc:
                self._trip(exc)
        self._deliver_local(user_ids, event, conn_id)

    # ---- tickets ---------------------------------------------------------

    async def issue_ticket(self, data: dict) -> str:
        ticket = secrets.token_urlsafe(32)
        if self.uses_redis:
            client = self._client()
            if client is None:
                raise RealtimeUnavailable()
            try:
                ok = await asyncio.wait_for(
                    client.set(_ticket_key(ticket), json.dumps(data), ex=TICKET_TTL_SECONDS, nx=True),
                    REDIS_OP_TIMEOUT,
                )
            except Exception as exc:
                self._trip(exc)
                raise RealtimeUnavailable() from exc
            if not ok:
                raise RealtimeUnavailable()
            return ticket
        if not self.memory_mode_allowed():
            raise RealtimeUnavailable()
        self._purge_memory_tickets()
        self._mem_tickets[_ticket_key(ticket)] = (time.monotonic() + TICKET_TTL_SECONDS, data)
        return ticket

    async def consume_ticket(self, ticket: str) -> dict | None:
        """Single use: the ticket is removed atomically on first read."""
        if not isinstance(ticket, str) or not (16 <= len(ticket) <= 128):
            return None
        key = _ticket_key(ticket)
        if self.uses_redis:
            client = self._client()
            if client is None:
                return None
            try:
                raw = await asyncio.wait_for(client.getdel(key), REDIS_OP_TIMEOUT)
            except Exception as exc:
                self._trip(exc)
                return None
            if raw is None:
                return None
            try:
                return json.loads(raw)
            except ValueError:
                return None
        if not self.memory_mode_allowed():
            return None
        entry = self._mem_tickets.pop(key, None)
        if entry is None or entry[0] < time.monotonic():
            return None
        return entry[1]

    def _purge_memory_tickets(self) -> None:
        now = time.monotonic()
        for key in [k for k, (exp, _) in self._mem_tickets.items() if exp < now]:
            self._mem_tickets.pop(key, None)

    # ---- presence --------------------------------------------------------

    async def touch_presence(self, user_id: int) -> None:
        if self.uses_redis:
            client = self._client()
            if client is not None:
                try:
                    await asyncio.wait_for(
                        client.set(f"chat:online:{int(user_id)}", "1", ex=PRESENCE_TTL_SECONDS),
                        REDIS_OP_TIMEOUT,
                    )
                except Exception as exc:
                    self._trip(exc)
            return
        self._mem_presence[int(user_id)] = time.monotonic() + PRESENCE_TTL_SECONDS

    async def online_user_ids(self, user_ids: list[int]) -> set[int]:
        ids = [int(u) for u in user_ids][:200]
        if not ids:
            return set()
        if self.uses_redis:
            client = self._client()
            if client is None:
                return {u for u in ids if u in self._local}
            try:
                values = await asyncio.wait_for(client.mget([f"chat:online:{u}" for u in ids]), REDIS_OP_TIMEOUT)
            except Exception as exc:
                self._trip(exc)
                return {u for u in ids if u in self._local}
            return {u for u, v in zip(ids, values) if v is not None}
        now = time.monotonic()
        return {u for u in ids if self._mem_presence.get(u, 0) > now}

    # ---- rate limiting ---------------------------------------------------

    async def allow(self, key: str, limit: int, window_seconds: int) -> bool:
        """Fixed-window counter in Redis (shared by workers); per-worker sliding window if Redis is unavailable."""
        client = self._client()
        if client is not None:
            redis_key = f"chat:rl:{key}:{int(time.time() // window_seconds)}"
            try:
                count = await asyncio.wait_for(client.incr(redis_key), REDIS_OP_TIMEOUT)
                if count == 1:
                    await asyncio.wait_for(client.expire(redis_key, window_seconds + 1), REDIS_OP_TIMEOUT)
                return count <= limit
            except Exception as exc:
                self._trip(exc)
        now = time.monotonic()
        bucket = self._mem_rate[key]
        while bucket and bucket[0] <= now - window_seconds:
            bucket.popleft()
        if len(bucket) >= limit:
            return False
        bucket.append(now)
        return True

    # ---- upload admission ------------------------------------------------

    async def acquire_slot(self, key: str, token: str, limit: int, ttl_seconds: int) -> bool:
        """Take one of `limit` concurrent slots. Each slot expires on its own after ttl,
        so a crashed upload can't hold a slot forever."""
        client = self._client()
        if client is not None:
            redis_key = f"chat:slots:{key}"
            now = time.time()
            try:
                async with client.pipeline(transaction=True) as pipe:
                    pipe.zremrangebyscore(redis_key, "-inf", now - ttl_seconds)
                    pipe.zadd(redis_key, {token: now})
                    pipe.zcard(redis_key)
                    pipe.expire(redis_key, ttl_seconds)
                    _, _, count, _ = await asyncio.wait_for(pipe.execute(), REDIS_OP_TIMEOUT)
                if count > limit:
                    await asyncio.wait_for(client.zrem(redis_key, token), REDIS_OP_TIMEOUT)
                    return False
                return True
            except Exception as exc:
                self._trip(exc)
        now = time.monotonic()
        slots = self._mem_slots[key]
        for t in [t for t, exp in slots.items() if exp <= now]:
            slots.pop(t, None)
        if len(slots) >= limit:
            return False
        slots[token] = now + ttl_seconds
        return True

    async def release_slot(self, key: str, token: str) -> None:
        self._mem_slots.get(key, {}).pop(token, None)
        client = self._client()
        if client is not None:
            try:
                await asyncio.wait_for(client.zrem(f"chat:slots:{key}", token), REDIS_OP_TIMEOUT)
            except Exception as exc:
                self._trip(exc)

    async def consume(self, key: str, amount: int, limit: int, window_seconds: int) -> bool:
        """Add `amount` to a fixed-window total; refuse (and add nothing) if it would exceed `limit`."""
        window = int(time.time() // window_seconds)
        client = self._client()
        if client is not None:
            redis_key = f"chat:total:{key}:{window}"
            try:
                total = await asyncio.wait_for(client.incrby(redis_key, int(amount)), REDIS_OP_TIMEOUT)
                if total == int(amount):
                    await asyncio.wait_for(client.expire(redis_key, window_seconds + 1), REDIS_OP_TIMEOUT)
                if total > limit:
                    await asyncio.wait_for(client.decrby(redis_key, int(amount)), REDIS_OP_TIMEOUT)
                    return False
                return True
            except Exception as exc:
                self._trip(exc)
        current_window, total = self._mem_totals.get(key, (window, 0))
        if current_window != window:
            total = 0
        if total + amount > limit:
            return False
        self._mem_totals[key] = (window, total + int(amount))
        return True


    # ---- small shared key/value store (call state) -------------------------

    def _kv_client(self):
        """Redis client, None for the in-process store, or RealtimeUnavailable if Redis is configured but down."""
        if self.uses_redis:
            client = self._client()
            if client is None:
                raise RealtimeUnavailable()
            return client
        if not self.memory_mode_allowed():
            raise RealtimeUnavailable()
        return None

    def _mem_live(self, key: str) -> tuple[float, str] | None:
        entry = self._mem_kv.get(key)
        if entry is not None and entry[0] <= time.monotonic():
            self._mem_kv.pop(key, None)
            return None
        return entry

    async def kv_set(self, key: str, value: str, ttl_seconds: int, only_if_absent: bool = False) -> bool:
        client = self._kv_client()
        if client is not None:
            try:
                ok = await asyncio.wait_for(
                    client.set(key, value, ex=ttl_seconds, nx=only_if_absent or None), REDIS_OP_TIMEOUT
                )
            except Exception as exc:
                self._trip(exc)
                raise RealtimeUnavailable() from exc
            return bool(ok)
        if only_if_absent and self._mem_live(key) is not None:
            return False
        self._mem_kv[key] = (time.monotonic() + ttl_seconds, value)
        return True

    async def kv_get(self, key: str) -> str | None:
        client = self._kv_client()
        if client is not None:
            try:
                return await asyncio.wait_for(client.get(key), REDIS_OP_TIMEOUT)
            except Exception as exc:
                self._trip(exc)
                raise RealtimeUnavailable() from exc
        entry = self._mem_live(key)
        return entry[1] if entry is not None else None

    async def kv_delete(self, *keys: str) -> None:
        if not keys:
            return
        client = self._kv_client()
        if client is not None:
            try:
                await asyncio.wait_for(client.delete(*keys), REDIS_OP_TIMEOUT)
            except Exception as exc:
                self._trip(exc)
                raise RealtimeUnavailable() from exc
            return
        for key in keys:
            self._mem_kv.pop(key, None)

    async def kv_expire(self, key: str, ttl_seconds: int) -> None:
        client = self._kv_client()
        if client is not None:
            try:
                await asyncio.wait_for(client.expire(key, ttl_seconds), REDIS_OP_TIMEOUT)
            except Exception as exc:
                self._trip(exc)
                raise RealtimeUnavailable() from exc
            return
        entry = self._mem_live(key)
        if entry is not None:
            self._mem_kv[key] = (time.monotonic() + ttl_seconds, entry[1])


hub = Hub()
