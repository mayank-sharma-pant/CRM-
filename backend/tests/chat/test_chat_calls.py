"""1-to-1 voice calls: call log, chat-history entries, authorization."""
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException

from app.models.core.chat import ChatCall, ChatMessage
from app.services.chat import calls, service
from tests.chat.conftest import As


def _users(db, org):
    from app.models.core.user import User

    return {k: db.query(User).filter(User.id == u.id).one() for k, u in org["users"].items()}


def _conversation(org):
    sales, md = As("sales@a.test"), As("md@a.test")
    conv_id = sales.start(org["users"]["md"].id).json()["id"]
    return sales, md, conv_id


# ---- call log + history entries -------------------------------------------------------


def test_finished_call_becomes_one_chat_entry_with_duration(org, db):
    sales, md, conv_id = _conversation(org)
    u = _users(db, org)
    call = calls.create_call(db, u["sales"], conv_id)
    assert call.status == "ringing" and call.callee_id == u["md"].id
    assert calls.mark_active(db, call.id, call.company_id)
    row = db.query(ChatCall).filter(ChatCall.id == call.id).one()
    row.answered_at = datetime.now(timezone.utc) - timedelta(seconds=204)
    db.commit()

    done = calls.finish_call(db, call.id, call.company_id, "completed")
    assert done["recipients"] == [u["sales"].id, u["md"].id]
    entry = done["message"]
    assert entry["sender_id"] == u["sales"].id and entry["body"] == ""
    assert entry["call"]["status"] == "completed"
    assert 203 <= entry["call"]["duration_s"] <= 206

    # Both participants see the same entry in the thread; it carries no media details.
    for who in (sales, md):
        item = who.get(f"/api/chat/conversations/{conv_id}/messages").json()["items"][-1]
        assert item["call"]["id"] == call.id and item["call"]["status"] == "completed"
        assert set(item["call"]) == {"id", "status", "duration_s", "connection", "caller_id", "callee_id"}


def test_duplicate_endings_write_one_entry(org, db):
    _, _, conv_id = _conversation(org)
    u = _users(db, org)
    call = calls.create_call(db, u["sales"], conv_id)
    assert calls.finish_call(db, call.id, call.company_id, "cancelled") is not None
    assert calls.finish_call(db, call.id, call.company_id, "cancelled") is None
    assert calls.finish_call(db, call.id, call.company_id, "missed") is None
    assert db.query(ChatMessage).filter(ChatMessage.conversation_id == conv_id).count() == 1
    assert db.query(ChatCall).filter(ChatCall.id == call.id).one().status == "cancelled"


def test_missed_call_is_unread_for_the_callee_and_shows_in_the_list(org, db):
    sales, md, conv_id = _conversation(org)
    u = _users(db, org)
    call = calls.create_call(db, u["sales"], conv_id)
    calls.finish_call(db, call.id, call.company_id, "missed")
    assert md.get("/api/chat/unread").json()["unread_total"] == 1
    assert sales.get("/api/chat/unread").json()["unread_total"] == 0
    last = md.get("/api/chat/conversations").json()["items"][0]["last_message"]
    assert last["call"]["status"] == "missed" and last["preview"] == ""
    assert last["attachment"] is None
    assert md.get(f"/api/chat/conversations/{conv_id}/messages").json()["items"][-1]["call"]["duration_s"] is None


def test_mark_active_only_from_ringing(org, db):
    _, _, conv_id = _conversation(org)
    u = _users(db, org)
    call = calls.create_call(db, u["sales"], conv_id)
    calls.finish_call(db, call.id, call.company_id, "cancelled")
    assert calls.mark_active(db, call.id, call.company_id) is False


def test_connection_report_only_from_participants_and_known_values(org, db):
    _, _, conv_id = _conversation(org)
    u = _users(db, org)
    call = calls.create_call(db, u["sales"], conv_id)
    assert calls.set_connection(db, call.id, call.company_id, u["manager"].id, "relay") is False
    assert calls.set_connection(db, call.id, call.company_id, u["md"].id, "carrier-pigeon") is False
    assert calls.set_connection(db, call.id, call.company_id, u["sales"].id, "relay") is True
    assert db.query(ChatCall).filter(ChatCall.id == call.id).one().connection == "relay"


def test_finish_rejects_non_final_status(org, db):
    _, _, conv_id = _conversation(org)
    call = calls.create_call(db, _users(db, org)["sales"], conv_id)
    with pytest.raises(ValueError):
        calls.finish_call(db, call.id, call.company_id, "active")


# ---- authorization ------------------------------------------------------------------------


def test_only_participants_can_start_a_call(org, db):
    _, _, conv_id = _conversation(org)
    u = _users(db, org)
    for outsider in ("manager", "admin", "b_admin"):
        with pytest.raises(HTTPException) as exc:
            calls.create_call(db, u[outsider], conv_id)
        assert exc.value.status_code == 404, outsider
    assert db.query(ChatCall).count() == 0


def test_cannot_call_a_deactivated_user(org, db):
    _, _, conv_id = _conversation(org)
    u = _users(db, org)
    u["md"].is_active = False
    db.commit()
    with pytest.raises(HTTPException) as exc:
        calls.create_call(db, u["sales"], conv_id)
    assert exc.value.status_code == 409


def test_other_company_cannot_touch_a_call(org, db):
    _, _, conv_id = _conversation(org)
    u = _users(db, org)
    call = calls.create_call(db, u["sales"], conv_id)
    other_company = org["b"].id
    assert calls.mark_active(db, call.id, other_company) is False
    assert calls.finish_call(db, call.id, other_company, "completed") is None
    assert calls.set_connection(db, call.id, other_company, u["sales"].id, "direct") is False
    assert db.query(ChatCall).filter(ChatCall.id == call.id).one().status == "ringing"


# ---- stale calls ----------------------------------------------------------------------------


def test_stale_candidates_are_only_old_live_calls(org, db):
    _, _, conv_id = _conversation(org)
    u = _users(db, org)
    old = calls.create_call(db, u["sales"], conv_id)
    fresh = calls.create_call(db, u["sales"], conv_id)
    old_ended = calls.create_call(db, u["sales"], conv_id)
    for c in (old, old_ended):
        row = db.query(ChatCall).filter(ChatCall.id == c.id).one()
        row.started_at = datetime.now(timezone.utc) - timedelta(hours=1)
    db.commit()
    calls.finish_call(db, old_ended.id, old_ended.company_id, "completed")
    assert calls.stale_candidates(db, timedelta(minutes=2)) == [(old.id, old.company_id)]
    assert {c for c, _ in calls.stale_candidates(db, timedelta(0))} == {old.id, fresh.id}


def test_export_includes_calls_without_media_details(org, db):
    _, _, conv_id = _conversation(org)
    u = _users(db, org)
    call = calls.create_call(db, u["sales"], conv_id)
    calls.finish_call(db, call.id, call.company_id, "missed")
    exported = service.export_sent_messages(db, u["sales"])
    assert exported[-1]["call"]["status"] == "missed"
