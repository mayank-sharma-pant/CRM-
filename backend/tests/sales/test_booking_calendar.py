"""Phase 7.2 — public meeting booking and inbound calendar pull."""
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import pytest

from app.config import settings
from app.models.core.company_settings import CompanySettings
from app.models.sales.calendar import CalendarConnection
from app.models.sales.lead import Lead
from app.models.sales.meeting import Meeting
from app.utils.rate_limit import auth_limiter, public_form_limiter
from app.utils.totp_crypto import encrypt_secret
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


@pytest.fixture(autouse=True)
def _reset_limiters():
    auth_limiter._buckets.clear()
    public_form_limiter._buckets.clear()
    yield


@pytest.fixture(autouse=True)
def _frontend_url(monkeypatch):
    monkeypatch.setattr(settings, "FRONTEND_URL", "http://frontend.test")


def _future(hours: int = 48) -> str:
    return (datetime.now(timezone.utc) + timedelta(hours=hours)).strftime("%Y-%m-%dT%H:%M:%SZ")


def _admin(client, db, code, *, status="active", trial_ends_at=None):
    company = create_company(db, name=f"Book {code}", company_code=code, status=status)
    if trial_ends_at is not None:
        company.trial_ends_at = trial_ends_at
        db.commit()
    admin = create_active_user(
        db, email=f"admin@{code.lower()}.com", role="admin", company_id=company.id,
        full_name="Asha Rao",
    )
    login_user(client, admin.email)
    return company, admin


def _configure(client, slug, host_user_id):
    return client.patch("/api/meetings/booking", json={"slug": slug, "host_user_id": host_user_id})


def _live(client, db, code, slug):
    company, admin = _admin(client, db, code)
    res = _configure(client, slug, admin.id)
    assert res.status_code == 200, res.text
    return company, admin


def _connect(db, company, user, provider="google", status="active"):
    row = CalendarConnection(
        company_id=company.id,
        user_id=user.id,
        provider=provider,
        email="me@gmail.com",
        refresh_token_encrypted=encrypt_secret("refresh"),
        access_token_encrypted=encrypt_secret("access"),
        access_token_expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        status=status,
    )
    db.add(row)
    db.commit()
    return row


# --------------------------------------------------------------------------
# Config
# --------------------------------------------------------------------------

def test_booking_config_round_trip(client, db):
    company, admin = _admin(client, db, "BKA")
    empty = client.get("/api/meetings/booking")
    assert empty.status_code == 200, empty.text
    assert empty.json()["is_live"] is False
    assert empty.json()["slug"] is None

    saved = _configure(client, "Asha-Visits", admin.id)
    assert saved.status_code == 200, saved.text
    body = saved.json()
    assert body["slug"] == "asha-visits"
    assert body["host_user_id"] == admin.id
    assert body["host_name"] == "Asha Rao"
    assert body["public_path"] == "/book/asha-visits"
    assert body["is_live"] is True

    assert client.get("/api/meetings/booking").json() == body


def test_booking_config_requires_admin_or_md(client, db):
    company, admin = _admin(client, db, "BKB")
    rep = create_active_user(db, email="rep@bkb.com", role="sales", company_id=company.id)
    login_user(client, rep.email)
    assert client.get("/api/meetings/booking").status_code == 200
    assert _configure(client, "rep-visits", rep.id).status_code == 403


@pytest.mark.parametrize("slug", ["Bad Slug", "ab", "x" * 65, "-lead", "with_underscore"])
def test_booking_config_rejects_bad_slug(client, db, slug):
    company, admin = _admin(client, db, "BKC")
    res = _configure(client, slug, admin.id)
    assert res.status_code == 400, res.text


def test_booking_slug_taken_by_another_company_is_400(client, db):
    _live(client, db, "BKD", "shared-slug")
    other, other_admin = _admin(client, db, "BKE")
    res = _configure(client, "shared-slug", other_admin.id)
    assert res.status_code == 400, res.text
    assert "slug" in res.json()["detail"].lower()


def test_booking_host_must_be_active_and_in_company(client, db):
    company, admin = _admin(client, db, "BKF")
    disabled = create_active_user(db, email="off@bkf.com", role="sales", company_id=company.id)
    disabled.is_active = False
    db.commit()
    assert _configure(client, "off-host", disabled.id).status_code == 400
    assert _configure(client, "ghost-host", 999999).status_code == 400


def test_clearing_the_slug_takes_the_page_down(client, db):
    company, admin = _live(client, db, "BKG", "down-soon")
    assert client.get("/api/public/book/down-soon").status_code == 200
    cleared = client.patch("/api/meetings/booking", json={"slug": None})
    assert cleared.status_code == 200, cleared.text
    assert cleared.json()["is_live"] is False
    assert client.get("/api/public/book/down-soon").status_code == 404


# --------------------------------------------------------------------------
# Public GET
# --------------------------------------------------------------------------

def test_public_booking_page_metadata(client, db):
    company, admin = _live(client, db, "BKH", "asha-site-visit")
    client.headers.pop("Authorization", None)
    res = client.get("/api/public/book/asha-site-visit")
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["company_name"] == "Book BKH"
    assert body["host_name"] == "Asha Rao"
    assert body["duration_minutes"] == 60
    assert "chat" not in str(body).lower()


def test_unknown_slug_is_404(client, db):
    _admin(client, db, "BKI")
    assert client.get("/api/public/book/nope-nope").status_code == 404


def test_slug_without_host_is_404(client, db):
    company, admin = _admin(client, db, "BKJ")
    row = db.query(CompanySettings).filter(CompanySettings.company_id == company.id).first()
    if row is None:
        row = CompanySettings(company_id=company.id, company_name="Book BKJ")
        db.add(row)
    row.booking_slug = "hostless"
    row.booking_host_user_id = None
    db.commit()
    assert client.get("/api/public/book/hostless").status_code == 404


def test_expired_trial_company_page_is_404(client, db):
    company, admin = _admin(
        client, db, "BKK", status="trial",
        trial_ends_at=datetime.now(timezone.utc) + timedelta(days=5),
    )
    assert _configure(client, "trial-visit", admin.id).status_code == 200
    assert client.get("/api/public/book/trial-visit").status_code == 200
    company.trial_ends_at = datetime.now(timezone.utc) - timedelta(days=1)
    db.commit()
    assert client.get("/api/public/book/trial-visit").status_code == 404


# --------------------------------------------------------------------------
# Public POST
# --------------------------------------------------------------------------

def test_public_booking_creates_meeting_attributed_to_host(client, db):
    company, admin = _live(client, db, "BKL", "book-me")
    starts = _future()
    res = client.post("/api/public/book/book-me/submit", json={
        "name": "Priya Nair",
        "email": "Priya@example.com",
        "starts_at": starts,
    })
    assert res.status_code == 201, res.text
    assert res.json()["ok"] is True

    meeting = db.query(Meeting).one()
    assert meeting.company_id == company.id
    assert meeting.created_by_id == admin.id
    assert meeting.ends_at - meeting.starts_at == timedelta(minutes=60)
    assert "Priya Nair" in meeting.notes
    assert "priya@example.com" in meeting.notes.lower()
    assert "Priya Nair" in meeting.subject

    listed = client.get("/api/meetings").json()
    assert listed["total"] == 1
    assert listed["items"][0]["id"] == meeting.id


def test_public_booking_honours_explicit_ends_at(client, db):
    _live(client, db, "BKM", "explicit-end")
    start = datetime.now(timezone.utc) + timedelta(days=2)
    res = client.post("/api/public/book/explicit-end/submit", json={
        "name": "Ravi",
        "email": "ravi@example.com",
        "starts_at": start.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "ends_at": (start + timedelta(minutes=30)).strftime("%Y-%m-%dT%H:%M:%SZ"),
    })
    assert res.status_code == 201, res.text
    meeting = db.query(Meeting).one()
    assert meeting.ends_at - meeting.starts_at == timedelta(minutes=30)


@pytest.mark.parametrize("payload_patch, reason", [
    ({"name": ""}, "missing name"),
    ({"email": ""}, "missing email"),
    ({"email": "not-an-email"}, "bad email"),
    ({"starts_at": ""}, "missing start"),
])
def test_public_booking_rejects_bad_guest_input(client, db, payload_patch, reason):
    _live(client, db, "BKN", "guard-rails")
    payload = {"name": "Ravi", "email": "ravi@example.com", "starts_at": _future()}
    payload.update(payload_patch)
    res = client.post("/api/public/book/guard-rails/submit", json=payload)
    assert res.status_code == 400, f"{reason}: {res.text}"
    assert db.query(Meeting).count() == 0


def test_public_booking_rejects_past_start(client, db):
    _live(client, db, "BKO", "no-time-travel")
    res = client.post("/api/public/book/no-time-travel/submit", json={
        "name": "Ravi",
        "email": "ravi@example.com",
        "starts_at": (datetime.now(timezone.utc) - timedelta(hours=2)).strftime("%Y-%m-%dT%H:%M:%SZ"),
    })
    assert res.status_code == 400, res.text
    assert db.query(Meeting).count() == 0


def test_public_booking_rejects_end_before_start(client, db):
    _live(client, db, "BKP", "bad-order")
    start = datetime.now(timezone.utc) + timedelta(days=2)
    res = client.post("/api/public/book/bad-order/submit", json={
        "name": "Ravi",
        "email": "ravi@example.com",
        "starts_at": start.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "ends_at": (start - timedelta(minutes=10)).strftime("%Y-%m-%dT%H:%M:%SZ"),
    })
    assert res.status_code == 400, res.text
    assert db.query(Meeting).count() == 0


def test_public_booking_links_matching_lead_case_insensitively(client, db):
    company, admin = _live(client, db, "BKQ", "match-lead")
    lead = Lead(company_id=company.id, name="Priya", email="PRIYA@example.com")
    db.add(lead)
    db.commit()
    db.refresh(lead)

    res = client.post("/api/public/book/match-lead/submit", json={
        "name": "Priya",
        "email": "priya@example.com",
        "starts_at": _future(),
    })
    assert res.status_code == 201, res.text
    assert db.query(Meeting).one().lead_id == lead.id


def test_public_booking_ignores_a_lead_in_another_company(client, db):
    other, other_admin = _admin(client, db, "BKR")
    foreign = Lead(company_id=other.id, name="Priya", email="priya@example.com")
    db.add(foreign)
    db.commit()

    company, admin = _live(client, db, "BKS", "no-cross-lead")
    res = client.post("/api/public/book/no-cross-lead/submit", json={
        "name": "Priya",
        "email": "priya@example.com",
        "starts_at": _future(),
    })
    assert res.status_code == 201, res.text
    assert db.query(Meeting).one().lead_id is None


def test_public_booking_honeypot_writes_nothing(client, db):
    _live(client, db, "BKT", "trap")
    res = client.post("/api/public/book/trap/submit", json={
        "name": "Bot",
        "email": "bot@example.com",
        "starts_at": _future(),
        "website": "http://spam.test",
    })
    assert res.status_code in (200, 201), res.text
    assert res.json()["ok"] is True
    assert db.query(Meeting).count() == 0


def test_public_booking_is_rate_limited(client, db):
    _live(client, db, "BKU", "flood")
    payload = {"name": "Ravi", "email": "ravi@example.com", "starts_at": _future()}
    codes = [
        client.post("/api/public/book/flood/submit", json=payload).status_code
        for _ in range(11)
    ]
    assert codes[-1] == 429, codes


@patch("app.services.sales.calendar_sync.create_calendar_event", return_value="gcal-book-1")
def test_public_booking_pushes_to_host_calendar(mock_create, client, db):
    company, admin = _live(client, db, "BKV", "push-me")
    _connect(db, company, admin)
    res = client.post("/api/public/book/push-me/submit", json={
        "name": "Priya", "email": "priya@example.com", "starts_at": _future(),
    })
    assert res.status_code == 201, res.text
    mock_create.assert_called_once()
    meeting = db.query(Meeting).one()
    assert meeting.calendar_event_id == "gcal-book-1"
    assert meeting.calendar_provider == "google"


@patch("app.services.sales.calendar_sync.create_calendar_event", side_effect=RuntimeError("boom"))
def test_calendar_failure_does_not_fail_the_booking(mock_create, client, db):
    company, admin = _live(client, db, "BKW", "push-fails")
    _connect(db, company, admin)
    res = client.post("/api/public/book/push-fails/submit", json={
        "name": "Priya", "email": "priya@example.com", "starts_at": _future(),
    })
    assert res.status_code == 201, res.text
    meeting = db.query(Meeting).one()
    assert meeting.calendar_event_id is None


# --------------------------------------------------------------------------
# Inbound pull
# --------------------------------------------------------------------------

def _google_payload(*events):
    return {"items": list(events)}


def _google_event(event_id, *, start_hours=24, summary="Provider meeting", **extra):
    start = datetime.now(timezone.utc) + timedelta(hours=start_hours)
    event = {
        "id": event_id,
        "summary": summary,
        "start": {"dateTime": start.strftime("%Y-%m-%dT%H:%M:%SZ")},
        "end": {"dateTime": (start + timedelta(minutes=45)).strftime("%Y-%m-%dT%H:%M:%SZ")},
    }
    event.update(extra)
    return event


@patch("app.services.sales.calendar_sync.access_token_for", return_value="tok")
@patch("app.services.sales.calendar_sync.provider_list_events")
def test_inbound_google_creates_meetings_with_conference_url(mock_list, mock_tok, client, db):
    company, admin = _admin(client, db, "BKX")
    _connect(db, company, admin)
    mock_list.return_value = _google_payload(
        _google_event("g-1", location="Andheri site", hangoutLink="https://meet.google.com/abc-defg-hij"),
        _google_event("g-2", start_hours=30, summary="Second visit"),
    )
    res = client.post("/api/calendar/sync")
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["created"] == 2
    assert body["updated"] == 0

    first = db.query(Meeting).filter(Meeting.calendar_event_id == "g-1").one()
    assert first.company_id == company.id
    assert first.created_by_id == admin.id
    assert first.subject == "Provider meeting"
    assert first.location == "Andheri site"
    assert first.conference_url == "https://meet.google.com/abc-defg-hij"
    assert first.calendar_provider == "google"
    assert (first.ends_at - first.starts_at) == timedelta(minutes=45)
    assert db.query(Meeting).filter(Meeting.calendar_event_id == "g-2").one().conference_url is None


@patch("app.services.sales.calendar_sync.access_token_for", return_value="tok")
@patch("app.services.sales.calendar_sync.provider_list_events")
def test_inbound_upserts_in_place(mock_list, mock_tok, client, db):
    company, admin = _admin(client, db, "BKY")
    _connect(db, company, admin)
    mock_list.return_value = _google_payload(_google_event("g-9", summary="Original"))
    assert client.post("/api/calendar/sync").json()["created"] == 1

    mock_list.return_value = _google_payload(_google_event("g-9", summary="Renamed", location="New site"))
    second = client.post("/api/calendar/sync").json()
    assert second["created"] == 0
    assert second["updated"] == 1
    row = db.query(Meeting).one()
    assert row.subject == "Renamed"
    assert row.location == "New site"


@patch("app.services.sales.calendar_sync.access_token_for", return_value="tok")
@patch("app.services.sales.calendar_sync.provider_list_events")
def test_inbound_never_deletes_a_vanished_event(mock_list, mock_tok, client, db):
    company, admin = _admin(client, db, "BKZ")
    _connect(db, company, admin)
    mock_list.return_value = _google_payload(_google_event("g-keep"), _google_event("g-gone", start_hours=40))
    assert client.post("/api/calendar/sync").json()["created"] == 2

    mock_list.return_value = _google_payload(_google_event("g-keep"))
    assert client.post("/api/calendar/sync").status_code == 200
    assert db.query(Meeting).filter(Meeting.calendar_event_id == "g-gone").count() == 1


@patch("app.services.sales.calendar_sync.access_token_for", return_value="tok")
@patch("app.services.sales.calendar_sync.provider_list_events")
def test_inbound_google_skips_cancelled_and_all_day(mock_list, mock_tok, client, db):
    company, admin = _admin(client, db, "BCA")
    _connect(db, company, admin)
    tomorrow = (datetime.now(timezone.utc) + timedelta(days=1)).date().isoformat()
    mock_list.return_value = _google_payload(
        _google_event("g-ok"),
        _google_event("g-cancelled", status="cancelled"),
        {"id": "g-allday", "summary": "Holiday", "start": {"date": tomorrow}, "end": {"date": tomorrow}},
        {"summary": "No id at all", "start": {"dateTime": "2026-09-01T10:00:00Z"}},
    )
    body = client.post("/api/calendar/sync").json()
    assert body["created"] == 1
    assert body["skipped"] == 3
    assert db.query(Meeting).count() == 1


@patch("app.services.sales.calendar_sync.access_token_for", return_value="tok")
@patch("app.services.sales.calendar_sync.provider_list_events")
def test_inbound_graph_reads_join_url_and_seven_digit_fractions(mock_list, mock_tok, client, db):
    company, admin = _admin(client, db, "BCB")
    _connect(db, company, admin, provider="microsoft")
    start = datetime.now(timezone.utc) + timedelta(days=1)
    mock_list.return_value = {"value": [
        {
            "id": "m-1",
            "subject": "Teams review",
            "start": {"dateTime": start.strftime("%Y-%m-%dT%H:%M:%S.0000000"), "timeZone": "UTC"},
            "end": {"dateTime": (start + timedelta(minutes=30)).strftime("%Y-%m-%dT%H:%M:%S.0000000"), "timeZone": "UTC"},
            "location": {"displayName": "Teams"},
            "onlineMeeting": {"joinUrl": "https://teams.microsoft.com/l/meetup-join/xyz"},
            "isCancelled": False,
            "isAllDay": False,
        },
        {"id": "m-cancelled", "subject": "Dropped", "isCancelled": True,
         "start": {"dateTime": start.strftime("%Y-%m-%dT%H:%M:%S.0000000"), "timeZone": "UTC"},
         "end": {"dateTime": start.strftime("%Y-%m-%dT%H:%M:%S.0000000"), "timeZone": "UTC"}},
        {"id": "m-allday", "subject": "Leave", "isAllDay": True,
         "start": {"dateTime": start.strftime("%Y-%m-%dT%H:%M:%S.0000000"), "timeZone": "UTC"},
         "end": {"dateTime": start.strftime("%Y-%m-%dT%H:%M:%S.0000000"), "timeZone": "UTC"}},
    ]}
    body = client.post("/api/calendar/sync").json()
    assert body["created"] == 1
    assert body["skipped"] == 2
    row = db.query(Meeting).one()
    assert row.subject == "Teams review"
    assert row.location == "Teams"
    assert row.conference_url == "https://teams.microsoft.com/l/meetup-join/xyz"
    assert row.calendar_provider == "microsoft"
    assert (row.ends_at - row.starts_at) == timedelta(minutes=30)


def test_inbound_without_a_connection_is_400(client, db):
    _admin(client, db, "BCC")
    res = client.post("/api/calendar/sync")
    assert res.status_code == 400, res.text
    assert "calendar" in res.json()["detail"].lower()
    assert db.query(Meeting).count() == 0


def test_inbound_with_an_errored_connection_is_400(client, db):
    company, admin = _admin(client, db, "BCD")
    _connect(db, company, admin, status="error")
    res = client.post("/api/calendar/sync")
    assert res.status_code == 400, res.text
    assert db.query(Meeting).count() == 0


@patch("app.services.sales.calendar_sync.access_token_for", return_value="tok")
@patch("app.services.sales.calendar_sync.provider_list_events", side_effect=RuntimeError("google said no"))
def test_inbound_provider_failure_is_502_and_writes_nothing(mock_list, mock_tok, client, db):
    company, admin = _admin(client, db, "BCE")
    connection = _connect(db, company, admin)
    res = client.post("/api/calendar/sync")
    assert res.status_code == 502, res.text
    assert db.query(Meeting).count() == 0
    db.refresh(connection)
    assert connection.status == "error"


@patch("app.services.sales.calendar_sync.access_token_for", return_value="tok")
@patch("app.services.sales.calendar_sync.provider_list_events")
def test_meeting_serialize_exposes_conference_url(mock_list, mock_tok, client, db):
    company, admin = _admin(client, db, "BCF")
    _connect(db, company, admin)
    mock_list.return_value = _google_payload(
        _google_event("g-conf", hangoutLink="https://meet.google.com/zzz-zzzz-zzz")
    )
    assert client.post("/api/calendar/sync").json()["created"] == 1
    meeting_id = db.query(Meeting).one().id
    body = client.get(f"/api/meetings/{meeting_id}").json()
    assert body["conference_url"] == "https://meet.google.com/zzz-zzzz-zzz"


# --------------------------------------------------------------------------
# Cross-tenant
# --------------------------------------------------------------------------

def test_cannot_configure_a_host_from_another_company(client, db):
    other, other_admin = _admin(client, db, "BCG")
    company, admin = _admin(client, db, "BCH")
    res = _configure(client, "borrowed-host", other_admin.id)
    assert res.status_code == 400, res.text


@patch("app.services.sales.calendar_sync.access_token_for", return_value="tok")
@patch("app.services.sales.calendar_sync.provider_list_events")
def test_colliding_event_ids_stay_in_their_own_company(mock_list, mock_tok, client, db):
    company_a, admin_a = _admin(client, db, "BCI")
    _connect(db, company_a, admin_a)
    mock_list.return_value = _google_payload(_google_event("same-id", summary="A's event"))
    assert client.post("/api/calendar/sync").json()["created"] == 1

    company_b, admin_b = _admin(client, db, "BCJ")
    _connect(db, company_b, admin_b)
    mock_list.return_value = _google_payload(_google_event("same-id", summary="B's event"))
    assert client.post("/api/calendar/sync").json()["created"] == 1

    rows = db.query(Meeting).filter(Meeting.calendar_event_id == "same-id").all()
    assert {r.company_id for r in rows} == {company_a.id, company_b.id}
    a_row = next(r for r in rows if r.company_id == company_a.id)
    assert a_row.subject == "A's event"


def test_other_company_cannot_read_a_booked_meeting(client, db):
    company_a, admin_a = _live(client, db, "BCK", "a-books")
    client.post("/api/public/book/a-books/submit", json={
        "name": "Priya", "email": "priya@example.com", "starts_at": _future(),
    })
    meeting_id = db.query(Meeting).one().id

    company_b, admin_b = _admin(client, db, "BCL")
    assert client.get(f"/api/meetings/{meeting_id}").status_code == 404

    login_user(client, admin_a.email)
    assert client.get(f"/api/meetings/{meeting_id}").status_code == 200
