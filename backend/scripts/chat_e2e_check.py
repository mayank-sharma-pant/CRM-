"""End-to-end team-chat check against a running backend (local multi-worker or staging).

Opens several WebSockets for the recipient, sends messages over fresh TCP
connections (so requests spread across gunicorn workers), and verifies every
socket received every message.new event in seq order, then reconciles over REST.

Optional Redis outage phase: --outage-stop-cmd / --outage-start-cmd run shell
commands mid-test; sends must keep succeeding and REST must still return every
message afterwards.

Example:
  python scripts/chat_e2e_check.py --api http://127.0.0.1:8011 \
      --ws ws://127.0.0.1:8011/api/chat/ws --origin http://localhost:3000 \
      --sender qa-sales@manualtest.local --recipient qa-md@manualtest.local \
      --password "$CHAT_E2E_PASSWORD" --messages 1000 --sockets 6 --server-port 8011
"""
import argparse
import asyncio
import json
import shlex
import statistics
import subprocess
import sys
import time
import uuid

import httpx
import websockets


def login(api: str, email: str, password: str) -> str:
    res = httpx.post(f"{api}/api/auth/login", data={"username": email, "password": password}, timeout=15)
    res.raise_for_status()
    return res.json()["access_token"]


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}", "Connection": "close"}


def worker_distribution(port: int, local_ports: list[int]) -> dict[str, int]:
    """Map each client socket to the server process that accepted it (via lsof)."""
    try:
        out = subprocess.run(
            ["lsof", "-nP", f"-iTCP:{port}", "-sTCP:ESTABLISHED", "-Fpn"],
            capture_output=True, text=True, timeout=10,
        ).stdout
    except (OSError, subprocess.SubprocessError):
        return {}
    pid, counts = None, {}
    for line in out.splitlines():
        if line.startswith("p"):
            pid = line[1:]
        elif line.startswith("n") and "->" in line:
            local, remote = line[1:].split("->")
            if local.endswith(f":{port}") and int(remote.rsplit(":", 1)[1]) in local_ports:
                counts[pid] = counts.get(pid, 0) + 1
    return counts


async def open_socket(api, ws_url, origin, token):
    res = httpx.post(f"{api}/api/chat/ws-ticket", headers=auth(token), timeout=10)
    res.raise_for_status()
    sock = await websockets.connect(ws_url, origin=origin, max_size=2**16)
    await sock.send(json.dumps({"type": "auth", "ticket": res.json()["ticket"]}))
    ready = json.loads(await asyncio.wait_for(sock.recv(), 10))
    assert ready["type"] == "ready", ready
    return sock


async def collect(sock, conv_id, received: list[int]):
    try:
        async for raw in sock:
            event = json.loads(raw)
            if event.get("type") == "message.new" and event.get("conversation_id") == conv_id:
                received.append(event["seq"])
    except websockets.ConnectionClosed:
        pass


def send_many(api, token, conv_id, count, latencies, label):
    for i in range(count):
        started = time.perf_counter()
        res = httpx.post(
            f"{api}/api/chat/conversations/{conv_id}/messages",
            headers=auth(token),
            json={"body": f"e2e {label} {i}", "client_msg_id": str(uuid.uuid4())},
            timeout=15,
        )
        latencies.append((time.perf_counter() - started) * 1000)
        if res.status_code != 201:
            raise SystemExit(f"send {label} #{i} failed: HTTP {res.status_code} {res.text[:200]}")


def rest_seqs(api, token, conv_id, after):
    seqs = []
    while True:
        res = httpx.get(
            f"{api}/api/chat/conversations/{conv_id}/messages",
            headers=auth(token), params={"after_seq": after, "limit": 50}, timeout=15,
        )
        res.raise_for_status()
        items = res.json()["items"]
        if not items:
            return seqs
        seqs.extend(m["seq"] for m in items)
        after = items[-1]["seq"]


def pct(values, p):
    ordered = sorted(values)
    return ordered[min(len(ordered) - 1, int(round(p / 100 * (len(ordered) - 1))))]


async def main(args) -> int:
    sender_token = login(args.api, args.sender, args.password)
    recipient_token = login(args.api, args.recipient, args.password)
    recipient_id = httpx.get(f"{args.api}/api/users/me", headers=auth(recipient_token), timeout=10).json()["id"]
    conv = httpx.post(
        f"{args.api}/api/chat/conversations/direct",
        headers=auth(sender_token), json={"user_id": recipient_id}, timeout=10,
    )
    conv.raise_for_status()
    conv_id, base = conv.json()["id"], conv.json()["last_seq"]

    sockets = [await open_socket(args.api, args.ws, args.origin, recipient_token) for _ in range(args.sockets)]
    received = [[] for _ in sockets]
    tasks = [asyncio.create_task(collect(s, conv_id, r)) for s, r in zip(sockets, received)]
    if args.server_port:
        local_ports = [s.local_address[1] for s in sockets]
        print("socket distribution by server pid:", worker_distribution(args.server_port, local_ports))

    latencies, outage_latencies = [], []
    loop = asyncio.get_running_loop()
    send_api = args.send_api or args.api
    if args.outage_stop_cmd:
        half = args.messages // 2
        await loop.run_in_executor(None, send_many, send_api, sender_token, conv_id, half, latencies, "before")
        subprocess.run(shlex.split(args.outage_stop_cmd), check=True)
        await loop.run_in_executor(None, send_many, send_api, sender_token, conv_id, args.messages - half, outage_latencies, "outage")
        subprocess.run(shlex.split(args.outage_start_cmd), check=True)
        await asyncio.sleep(args.recovery_wait)
    else:
        await loop.run_in_executor(None, send_many, send_api, sender_token, conv_id, args.messages, latencies, "live")

    expected = list(range(base + 1, base + args.messages + 1))
    deadline = time.monotonic() + args.wait
    while time.monotonic() < deadline and not all(r == expected for r in received):
        await asyncio.sleep(0.2)
    for s in sockets:
        await s.close()
    await asyncio.gather(*tasks, return_exceptions=True)

    rest = rest_seqs(args.api, recipient_token, conv_id, base)
    ok = rest == expected
    report = {
        "conversation_id": conv_id,
        "messages": args.messages,
        "sockets": args.sockets,
        "rest_reconcile_complete_and_gap_free": ok,
        "socket_results": [],
        "send_latency_ms": {"p50": round(statistics.median(latencies), 1), "p95": round(pct(latencies, 95), 1)} if latencies else None,
    }
    if outage_latencies:
        report["send_latency_during_redis_outage_ms"] = {
            "p50": round(statistics.median(outage_latencies), 1),
            "p95": round(pct(outage_latencies, 95), 1),
        }
    for r in received:
        in_order = r == sorted(r)
        report["socket_results"].append({
            "received": len(r),
            "duplicates": len(r) - len(set(r)),
            "in_order": in_order,
            "complete": r == expected,
        })
    print(json.dumps(report, indent=2))
    if not ok:
        return 1
    if not args.outage_stop_cmd and not all(x["complete"] for x in report["socket_results"]):
        return 1
    if any(x["duplicates"] or not x["in_order"] for x in report["socket_results"]):
        return 1
    return 0


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--api", required=True)
    p.add_argument("--send-api", default="", help="send messages via a different server (cross-process check)")
    p.add_argument("--ws", required=True)
    p.add_argument("--origin", required=True)
    p.add_argument("--sender", required=True)
    p.add_argument("--recipient", required=True)
    p.add_argument("--password", required=True)
    p.add_argument("--messages", type=int, default=100)
    p.add_argument("--sockets", type=int, default=4)
    p.add_argument("--wait", type=float, default=20.0)
    p.add_argument("--server-port", type=int, default=0)
    p.add_argument("--outage-stop-cmd", default="")
    p.add_argument("--outage-start-cmd", default="")
    p.add_argument("--recovery-wait", type=float, default=3.0)
    sys.exit(asyncio.run(main(p.parse_args())))
