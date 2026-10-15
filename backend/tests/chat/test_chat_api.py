import logging
import uuid

import pytest
from sqlalchemy import text

from app.config import settings
from app.models.core.chat import ChatMessage
from app.models.core.user import User
from tests.chat.conftest import As

NO_ACCESS = 404


def _conversation(org):
    sales = As("sales@a.test")
    md = As("md@a.test")
    res = sales.start(org["users"]["md"].id)
    assert res.status_code == 200, res.text
    return sales, md, res.json()["id"]


def test_disabled_chat_is_404_and_leaves_crm_unchanged(client, db, monkeypatch):
    monkeypatch.setattr(settings, "CHAT_ENABLED", False)
    res = client.get("/api/chat/status")
    assert res.status_code == 404
    assert client.get("/health").status_code == 200


def test_enabled_without_key_is_503(org, monkeypatch):
    monkeypatch.setattr(settings, "CHAT_ENCRYPTION_KEY", "")
    assert As("sales@a.test").get("/api/chat/status").status_code == 503


def test_invalid_key_is_503(org, monkeypatch):
    monkeypatch.setattr(settings, "CHAT_ENCRYPTION_KEY", "not-a-fernet-key")
    assert As("sales@a.test").get("/api/chat/status").status_code == 503


def test_unauthenticated_is_401(org, client):
    client.headers.pop("Authorization", None)
    client.cookies.clear()
    assert client.get("/api/chat/conversations").status_code == 401


def test_platform_admin_is_forbidden(org):
    platform = As("platform@x.test")
    assert platform.get("/api/chat/conversations").status_code == 403
    assert platform.get("/api/chat/directory").status_code == 403
    assert platform.post("/api/chat/ws-ticket").status_code == 403


def test_start_direct_is_idempotent_from_both_sides(org):
    sales, md, conv_id = _conversation(org)
    again = sales.start(org["users"]["md"].id)
    other_side = md.start(org["users"]["sales"].id)
    assert again.json()["id"] == conv_id
    assert other_side.json()["id"] == conv_id
    assert other_side.json()["other_user"]["id"] == org["users"]["sales"].id


def test_cannot_start_with_self_inactive_or_other_company(org, db):
    sales = As("sales@a.test")
    assert sales.start(org["users"]["sales"].id).status_code == 400
    assert sales.start(org["users"]["b_admin"].id).status_code == NO_ACCESS
    assert sales.start(org["users"]["platform"].id).status_code == NO_ACCESS
    assert sales.start(999999).status_code == NO_ACCESS
    inactive = org["users"]["purchase"]
    inactive.is_active = False
    db.commit()
    assert sales.start(inactive.id).status_code == NO_ACCESS


def test_send_and_read_back_in_order(org):
    sales, md, conv_id = _conversation(org)
    for i in range(3):
        res = sales.send(conv_id, f"hello {i}")
        assert res.status_code == 201, res.text
        assert res.json()["seq"] == i + 1
    res = md.get(f"/api/chat/conversations/{conv_id}/messages")
    assert res.status_code == 200
    items = res.json()["items"]
    assert [m["seq"] for m in items] == [1, 2, 3]
    assert [m["body"] for m in items] == ["hello 0", "hello 1", "hello 2"]
    assert res.json()["last_seq"] == 3


def test_body_is_encrypted_at_rest(org, db):
    sales, _, conv_id = _conversation(org)
    marker = "plaintext-marker-" + uuid.uuid4().hex
    assert sales.send(conv_id, marker).status_code == 201
    raw = db.execute(text("SELECT body_enc, key_id FROM chat_messages")).fetchall()
    assert len(raw) == 1
    assert marker not in raw[0][0]
    assert raw[0][1] and len(raw[0][1]) == 16


@pytest.mark.parametrize("role", ["sales2", "manager", "admin", "purchase"])
def test_same_company_non_participant_has_no_access(org, role):
    sales, _, conv_id = _conversation(org)
    assert sales.send(conv_id, "private").status_code == 201
    outsider = As(f"{role}@a.test")
    base = f"/api/chat/conversations/{conv_id}"
    assert outsider.get(base).status_code == NO_ACCESS
    assert outsider.get(f"{base}/messages").status_code == NO_ACCESS
    assert outsider.get(f"{base}/messages", params={"after_seq": 0}).status_code == NO_ACCESS
    assert outsider.send(conv_id, "intrusion").status_code == NO_ACCESS
    assert outsider.post(f"{base}/read", json={"seq": 1}).status_code == NO_ACCESS
    listed = outsider.get("/api/chat/conversations").json()
    assert listed["total"] == 0 and listed["items"] == []
    assert outsider.get("/api/chat/unread").json()["unread_total"] == 0
    assert outsider.get("/api/chat/sync").json()["conversations"] == []


def test_md_who_is_not_a_participant_has_no_access(org):
    sales = As("sales@a.test")
    conv_id = sales.start(org["users"]["manager"].id).json()["id"]
    sales.send(conv_id, "between sales and manager")
    md = As("md@a.test")
    assert md.get(f"/api/chat/conversations/{conv_id}/messages").status_code == NO_ACCESS
    assert md.send(conv_id, "x").status_code == NO_ACCESS


def test_other_company_admin_has_no_access(org):
    sales, _, conv_id = _conversation(org)
    sales.send(conv_id, "private")
    other = As("admin@b.test")
    assert other.get(f"/api/chat/conversations/{conv_id}/messages").status_code == NO_ACCESS
    assert other.send(conv_id, "x").status_code == NO_ACCESS
    assert other.post(f"/api/chat/conversations/{conv_id}/read", json={"seq": 1}).status_code == NO_ACCESS


def test_participants_positive_control(org):
    sales, md, conv_id = _conversation(org)
    assert sales.send(conv_id, "hi").status_code == 201
    assert md.send(conv_id, "hello").status_code == 201
    for caller in (sales, md):
        assert caller.get(f"/api/chat/conversations/{conv_id}").status_code == 200
        assert len(caller.get(f"/api/chat/conversations/{conv_id}/messages").json()["items"]) == 2


def test_retry_with_same_client_msg_id_does_not_duplicate(org, db):
    sales, md, conv_id = _conversation(org)
    cid = str(uuid.uuid4())
    first = sales.send(conv_id, "once", cid)
    second = sales.send(conv_id, "once", cid)
    assert first.status_code == 201
    assert second.status_code == 200
    assert second.json()["seq"] == first.json()["seq"] == 1
    assert db.query(ChatMessage).count() == 1
    other_conv = sales.start(org["users"]["manager"].id).json()["id"]
    assert sales.send(other_conv, "reuse", cid).status_code == 409


def test_validation_errors_never_echo_the_body(org):
    sales, _, conv_id = _conversation(org)
    secret = "SECRET-" + "x" * 4100
    res = sales.send(conv_id, secret)
    assert res.status_code == 422
    assert "SECRET-" not in res.text
    res = sales.post(f"/api/chat/conversations/{conv_id}/messages", json={"body": {"nested": "SECRET-NESTED"}, "client_msg_id": str(uuid.uuid4())})
    assert res.status_code == 422 and "SECRET-NESTED" not in res.text
    assert sales.send(conv_id, "   ").status_code == 422
    res = sales.post(f"/api/chat/conversations/{conv_id}/messages", json={"body": "SECRET-UUID", "client_msg_id": "not-a-uuid"})
    assert res.status_code == 422 and "SECRET-UUID" not in res.text


def test_unread_and_read_receipts(org):
    sales, md, conv_id = _conversation(org)
    sales.send(conv_id, "one")
    sales.send(conv_id, "two")
    assert sales.get("/api/chat/unread").json()["unread_total"] == 0
    assert md.get("/api/chat/unread").json()["unread_total"] == 2
    res = md.post(f"/api/chat/conversations/{conv_id}/read", json={"seq": 1})
    assert res.json()["last_read_seq"] == 1
    assert md.get("/api/chat/unread").json()["unread_total"] == 1
    assert md.post(f"/api/chat/conversations/{conv_id}/read", json={"seq": 0}).json()["last_read_seq"] == 1
    assert md.post(f"/api/chat/conversations/{conv_id}/read", json={"seq": 99}).json()["last_read_seq"] == 2
    summary = sales.get(f"/api/chat/conversations/{conv_id}").json()
    assert summary["other_last_read_seq"] == 2
    md.send(conv_id, "reply")
    assert md.get("/api/chat/unread").json()["unread_total"] == 0
    assert sales.get("/api/chat/unread").json()["unread_total"] == 1


def test_pagination_cursors(org, monkeypatch):
    from app.services.chat.realtime import hub

    async def _always(*_args, **_kwargs):
        return True

    monkeypatch.setattr(hub, "allow", _always)
    sales, md, conv_id = _conversation(org)
    for i in range(60):
        sales.send(conv_id, f"m{i}")
    latest = md.get(f"/api/chat/conversations/{conv_id}/messages").json()
    assert [m["seq"] for m in latest["items"]] == list(range(11, 61))
    assert latest["has_more_before"] is True
    older = md.get(f"/api/chat/conversations/{conv_id}/messages", params={"before_seq": 11}).json()
    assert [m["seq"] for m in older["items"]] == list(range(1, 11))
    assert older["has_more_before"] is False
    after = md.get(f"/api/chat/conversations/{conv_id}/messages", params={"after_seq": 55}).json()
    assert [m["seq"] for m in after["items"]] == list(range(56, 61))
    both = md.get(f"/api/chat/conversations/{conv_id}/messages", params={"after_seq": 1, "before_seq": 5})
    assert both.status_code == 422


def test_deactivated_partner_is_read_only(org, db):
    sales, md, conv_id = _conversation(org)
    md.send(conv_id, "before leaving")
    user = db.query(User).filter(User.id == org["users"]["md"].id).first()
    user.is_active = False
    user.status = "disabled"
    db.commit()
    assert sales.send(conv_id, "are you there?").status_code == 409
    history = sales.get(f"/api/chat/conversations/{conv_id}/messages").json()["items"]
    assert [m["body"] for m in history] == ["before leaving"]
    summary = sales.get(f"/api/chat/conversations/{conv_id}").json()
    assert summary["other_user"]["is_active"] is False


def test_directory_is_company_wide_and_minimal(org):
    sales = As("sales@a.test")
    items = sales.get("/api/chat/directory", params={"limit": 50}).json()["items"]
    ids = {i["id"] for i in items}
    users = org["users"]
    assert users["sales"].id not in ids
    assert {users[r].id for r in ("manager", "md", "admin", "purchase", "sales2")} <= ids
    assert users["b_admin"].id not in ids and users["platform"].id not in ids
    for item in items:
        assert set(item) == {"id", "full_name", "role", "team", "is_active"}
    search = sales.get("/api/chat/directory", params={"q": "Md"}).json()["items"]
    assert [i["id"] for i in search] == [users["md"].id]


def test_presence_only_reports_same_company_users(org):
    from app.services.chat.realtime import hub

    users = org["users"]
    hub._mem_presence[users["md"].id] = 10**12
    hub._mem_presence[users["b_admin"].id] = 10**12
    sales = As("sales@a.test")
    res = sales.get("/api/chat/presence", params={"user_ids": f"{users['md'].id},{users['b_admin'].id}"})
    assert res.json()["online"] == [users["md"].id]


def test_send_rate_limit(org):
    sales, _, conv_id = _conversation(org)
    codes = [sales.send(conv_id, f"flood {i}").status_code for i in range(21)]
    assert codes[:20] == [201] * 20
    assert codes[20] == 429


def test_message_text_never_logged_or_notified(org, db, caplog):
    sales, md, conv_id = _conversation(org)
    marker = "log-marker-" + uuid.uuid4().hex
    with caplog.at_level(logging.DEBUG):
        assert sales.send(conv_id, marker).status_code == 201
        md.get(f"/api/chat/conversations/{conv_id}/messages")
        md.get("/api/chat/conversations")
    assert marker not in caplog.text
    rows = db.execute(text("SELECT title, message FROM notifications")).fetchall()
    assert all(marker not in (t or "") and marker not in (m or "") for t, m in rows)


def test_conversation_list_and_sync(org):
    sales, md, conv_id = _conversation(org)
    sales.send(conv_id, "a long message " * 20)
    listed = md.get("/api/chat/conversations").json()
    assert listed["total"] == 1
    item = listed["items"][0]
    assert item["unread"] == 1
    assert item["last_message"]["seq"] == 1
    assert len(item["last_message"]["preview"]) == 120
    assert item["other_user"]["id"] == org["users"]["sales"].id
    sync = md.get("/api/chat/sync").json()
    assert sync == {"conversations": [{"id": conv_id, "last_seq": 1, "last_read_seq": 0}], "unread_total": 1}


def test_key_rotation_keeps_old_messages_readable(org, monkeypatch):
    from cryptography.fernet import Fernet

    sales, md, conv_id = _conversation(org)
    old_key = settings.CHAT_ENCRYPTION_KEY
    sales.send(conv_id, "before rotation")
    monkeypatch.setattr(settings, "CHAT_ENCRYPTION_KEY", f"{Fernet.generate_key().decode()},{old_key}")
    sales.send(conv_id, "after rotation")
    bodies = [m["body"] for m in md.get(f"/api/chat/conversations/{conv_id}/messages").json()["items"]]
    assert bodies == ["before rotation", "after rotation"]


def test_unknown_key_marks_message_unavailable_without_failing(org, monkeypatch):
    from cryptography.fernet import Fernet

    sales, md, conv_id = _conversation(org)
    sales.send(conv_id, "orphaned")
    monkeypatch.setattr(settings, "CHAT_ENCRYPTION_KEY", Fernet.generate_key().decode())
    res = md.get(f"/api/chat/conversations/{conv_id}/messages")
    assert res.status_code == 200
    assert res.json()["items"][0]["body"] is None
    assert res.json()["items"][0]["unavailable"] is True


def test_privacy_export_includes_own_sent_messages_only(org):
    sales, md, conv_id = _conversation(org)
    sales.send(conv_id, "mine")
    md.send(conv_id, "theirs")
    exported = sales.get("/api/privacy/me").json()
    assert [m["body"] for m in exported["chat_messages_sent"]] == ["mine"]


def test_privacy_export_unchanged_when_chat_disabled(org, monkeypatch):
    sales, _, conv_id = _conversation(org)
    sales.send(conv_id, "mine")
    monkeypatch.setattr(settings, "CHAT_ENABLED", False)
    assert "chat_messages_sent" not in sales.get("/api/privacy/me").json()


def test_status_reports_ws_url_only_when_configured(org, monkeypatch):
    sales = As("sales@a.test")
    monkeypatch.setattr(settings, "CHAT_WS_PUBLIC_URL", "")
    assert sales.get("/api/chat/status").json()["ws_url"] is None
    monkeypatch.setattr(settings, "CHAT_WS_PUBLIC_URL", "wss://api.example.test/api/chat/ws")
    body = sales.get("/api/chat/status").json()
    assert body["ws_url"] == "wss://api.example.test/api/chat/ws"
    assert body["user_id"] == org["users"]["sales"].id
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    assert sales.get("/api/chat/status").json()["ws_url"] is None
