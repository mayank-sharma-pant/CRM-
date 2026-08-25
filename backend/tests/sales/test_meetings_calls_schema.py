from datetime import datetime

from sqlalchemy import inspect

from app.models.core.enums import CallDirection, MeetingStatus
from app.models.sales.call_log import CallLog
from app.models.sales.meeting import Meeting


def test_meeting_and_call_tables_exist_and_have_company_id(db_engine):
    tables = set(inspect(db_engine).get_table_names())
    assert {"meetings", "call_logs"} <= tables
    for t in ("meetings", "call_logs"):
        cols = {c["name"] for c in inspect(db_engine).get_columns(t)}
        assert "company_id" in cols


def test_meeting_status_and_call_direction_values():
    assert MeetingStatus.SCHEDULED.value == "scheduled"
    assert MeetingStatus.COMPLETED.value == "completed"
    assert MeetingStatus.CANCELLED.value == "cancelled"
    assert CallDirection.INBOUND.value == "inbound"
    assert CallDirection.OUTBOUND.value == "outbound"


def test_can_persist_a_meeting_and_a_call(db):
    meeting = Meeting(
        company_id=1,
        subject="Site visit",
        starts_at=datetime(2026, 9, 1, 10, 0, 0),
        lead_id=1,
    )
    call = CallLog(
        company_id=1,
        direction=CallDirection.OUTBOUND,
        logged_at=datetime(2026, 9, 1, 9, 0, 0),
        lead_id=1,
    )
    db.add_all([meeting, call])
    db.commit()
    db.refresh(meeting)
    db.refresh(call)
    assert meeting.id is not None
    assert meeting.status == MeetingStatus.SCHEDULED
    assert call.id is not None
    assert call.direction == CallDirection.OUTBOUND
