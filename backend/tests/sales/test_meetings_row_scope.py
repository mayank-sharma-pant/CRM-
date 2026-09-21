from datetime import datetime, timedelta, timezone

import pytest

from app.models import Lead
from app.models.core.team import Team
from app.models.core.team_membership import TeamMembership
from app.models.sales.meeting import Meeting
from app.utils.rate_limit import auth_limiter
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


@pytest.fixture(autouse=True)
def _reset_auth_rate_limit():
    auth_limiter._buckets.clear()
    yield


def test_sales_does_not_see_other_exec_meeting(client, db):
    company = create_company(db, name="Meet Co", company_code="MT1")
    team = Team(company_id=company.id, name="A")
    db.add(team)
    db.commit()
    db.refresh(team)
    a = create_active_user(db, email="a@mt1.com", role="sales", company_id=company.id, team_id=team.id)
    b = create_active_user(db, email="b@mt1.com", role="sales", company_id=company.id, team_id=team.id)
    db.add_all([
        TeamMembership(company_id=company.id, team_id=team.id, user_id=a.id),
        TeamMembership(company_id=company.id, team_id=team.id, user_id=b.id),
    ])
    lead_b = Lead(company_id=company.id, name="B Lead", status="Active", team_id=team.id, assigned_to_id=b.id)
    db.add(lead_b)
    db.commit()
    db.refresh(lead_b)
    m = Meeting(
        company_id=company.id,
        subject="B only",
        starts_at=datetime.now(timezone.utc) + timedelta(days=1),
        status="scheduled",
        lead_id=lead_b.id,
        created_by_id=b.id,
    )
    db.add(m)
    db.commit()
    login_user(client, a.email)
    listed = client.get("/api/meetings", headers={"X-Team-Id": str(team.id)})
    assert listed.status_code == 200
    assert all(row["subject"] != "B only" for row in listed.json()["items"])


def test_summary_counts_overdue(client, db):
    company = create_company(db, name="Sum Co", company_code="MT2")
    md = create_active_user(db, email="md@mt2.com", role="md", company_id=company.id)
    lead = Lead(company_id=company.id, name="L", status="Active")
    db.add(lead)
    db.commit()
    db.refresh(lead)
    db.add(Meeting(
        company_id=company.id,
        subject="Past",
        starts_at=datetime.now(timezone.utc) - timedelta(days=2),
        status="scheduled",
        lead_id=lead.id,
        created_by_id=md.id,
    ))
    db.commit()
    login_user(client, md.email)
    resp = client.get("/api/meetings/summary")
    assert resp.status_code == 200
    body = resp.json()
    assert body["overdue"] >= 1
    assert "today" in body and "upcoming" in body and "total_scheduled" in body


def test_purchase_list_and_summary_forbidden(client, db):
    company = create_company(db, name="Buy Co", company_code="MT3")
    purchase = create_active_user(db, email="buy@mt3.com", role="purchase", company_id=company.id)
    md = create_active_user(db, email="md@mt3.com", role="md", company_id=company.id)
    lead = Lead(company_id=company.id, name="L", status="Active")
    db.add(lead)
    db.commit()
    db.refresh(lead)
    db.add(Meeting(
        company_id=company.id,
        subject="Hidden from purchase",
        starts_at=datetime.now(timezone.utc) + timedelta(days=1),
        status="scheduled",
        lead_id=lead.id,
        created_by_id=md.id,
    ))
    db.commit()
    login_user(client, purchase.email)
    listed = client.get("/api/meetings")
    summary = client.get("/api/meetings/summary")
    assert listed.status_code == 403, listed.text
    assert summary.status_code == 403, summary.text


def test_manager_without_team_returns_empty_list_and_zero_summary(client, db):
    company = create_company(db, name="Mgr Co", company_code="MT4")
    manager = create_active_user(db, email="mgr@mt4.com", role="manager", company_id=company.id)
    md = create_active_user(db, email="md@mt4.com", role="md", company_id=company.id)
    lead = Lead(company_id=company.id, name="L", status="Active")
    db.add(lead)
    db.commit()
    db.refresh(lead)
    db.add(Meeting(
        company_id=company.id,
        subject="Company meeting",
        starts_at=datetime.now(timezone.utc) + timedelta(hours=3),
        status="scheduled",
        lead_id=lead.id,
        created_by_id=md.id,
    ))
    db.commit()
    login_user(client, manager.email)
    listed = client.get("/api/meetings")
    assert listed.status_code == 200, listed.text
    assert listed.json()["items"] == []
    assert listed.json()["total"] == 0
    summary = client.get("/api/meetings/summary")
    assert summary.status_code == 200, summary.text
    body = summary.json()
    assert body == {
        "today": 0,
        "upcoming": 0,
        "overdue": 0,
        "completed_week": 0,
        "cancelled_week": 0,
        "total_scheduled": 0,
    }


def test_sales_sees_own_and_assigned_lead_meetings(client, db):
    company = create_company(db, name="Own Co", company_code="MT5")
    team = Team(company_id=company.id, name="A")
    db.add(team)
    db.commit()
    db.refresh(team)
    sales = create_active_user(
        db, email="sales@mt5.com", role="sales", company_id=company.id, team_id=team.id
    )
    other = create_active_user(
        db, email="other@mt5.com", role="sales", company_id=company.id, team_id=team.id
    )
    db.add_all([
        TeamMembership(company_id=company.id, team_id=team.id, user_id=sales.id),
        TeamMembership(company_id=company.id, team_id=team.id, user_id=other.id),
    ])
    mine = Lead(
        company_id=company.id, name="Mine", status="Active",
        team_id=team.id, assigned_to_id=sales.id,
    )
    db.add(mine)
    db.commit()
    db.refresh(mine)
    now = datetime.now(timezone.utc)
    db.add_all([
        Meeting(
            company_id=company.id,
            subject="Created by me",
            starts_at=now + timedelta(days=1),
            status="scheduled",
            created_by_id=sales.id,
        ),
        Meeting(
            company_id=company.id,
            subject="On my lead",
            starts_at=now + timedelta(days=2),
            status="scheduled",
            lead_id=mine.id,
            created_by_id=other.id,
        ),
        Meeting(
            company_id=company.id,
            subject="Someone else",
            starts_at=now + timedelta(days=3),
            status="scheduled",
            created_by_id=other.id,
        ),
    ])
    db.commit()
    login_user(client, sales.email)
    listed = client.get("/api/meetings", headers={"X-Team-Id": str(team.id)})
    assert listed.status_code == 200, listed.text
    subjects = {row["subject"] for row in listed.json()["items"]}
    assert subjects == {"Created by me", "On my lead"}


def test_company_admin_list_stays_company_scope(client, db):
    company = create_company(db, name="Adm Co", company_code="MT6")
    other = create_company(db, name="Other Co", company_code="MT6B")
    team = Team(company_id=company.id, name="A")
    db.add(team)
    db.commit()
    db.refresh(team)
    admin = create_active_user(db, email="admin@mt6.com", role="admin", company_id=company.id)
    sales = create_active_user(
        db, email="sales@mt6.com", role="sales", company_id=company.id, team_id=team.id
    )
    foreign = create_active_user(db, email="admin@mt6b.com", role="admin", company_id=other.id)
    db.add(TeamMembership(company_id=company.id, team_id=team.id, user_id=sales.id))
    lead = Lead(
        company_id=company.id, name="B Lead", status="Active",
        team_id=team.id, assigned_to_id=sales.id,
    )
    foreign_lead = Lead(company_id=other.id, name="Foreign", status="Active")
    db.add_all([lead, foreign_lead])
    db.commit()
    db.refresh(lead)
    db.refresh(foreign_lead)
    db.add_all([
        Meeting(
            company_id=company.id,
            subject="Exec meeting",
            starts_at=datetime.now(timezone.utc) + timedelta(days=1),
            status="scheduled",
            lead_id=lead.id,
            created_by_id=sales.id,
        ),
        Meeting(
            company_id=other.id,
            subject="Other company",
            starts_at=datetime.now(timezone.utc) + timedelta(days=1),
            status="scheduled",
            lead_id=foreign_lead.id,
            created_by_id=foreign.id,
        ),
    ])
    db.commit()
    login_user(client, admin.email)
    listed = client.get("/api/meetings")
    assert listed.status_code == 200, listed.text
    subjects = {row["subject"] for row in listed.json()["items"]}
    assert "Exec meeting" in subjects
    assert "Other company" not in subjects


def test_list_bucket_overdue_and_summary_overlap(client, db):
    company = create_company(db, name="Bkt Co", company_code="MT7")
    md = create_active_user(db, email="md@mt7.com", role="md", company_id=company.id)
    lead = Lead(company_id=company.id, name="L", status="Active")
    db.add(lead)
    db.commit()
    db.refresh(lead)
    now = datetime.now(timezone.utc)
    today = now.date()
    later_today = datetime(today.year, today.month, today.day, 23, 59, 58, tzinfo=timezone.utc)
    earlier_today = datetime(today.year, today.month, today.day, 0, 0, 1, tzinfo=timezone.utc)
    if not (earlier_today < now < later_today):
        pytest.skip("UTC now is too close to midnight for today/upcoming/overdue overlap")
    week_ago_plus = now - timedelta(days=8)
    db.add_all([
        Meeting(
            company_id=company.id,
            subject="Later today",
            starts_at=later_today,
            status="scheduled",
            lead_id=lead.id,
            created_by_id=md.id,
        ),
        Meeting(
            company_id=company.id,
            subject="Earlier today",
            starts_at=earlier_today,
            status="scheduled",
            lead_id=lead.id,
            created_by_id=md.id,
        ),
        Meeting(
            company_id=company.id,
            subject="Done this week",
            starts_at=now - timedelta(days=1),
            status="completed",
            lead_id=lead.id,
            created_by_id=md.id,
            updated_at=now - timedelta(days=1),
        ),
        Meeting(
            company_id=company.id,
            subject="Old completed",
            starts_at=week_ago_plus,
            status="completed",
            lead_id=lead.id,
            created_by_id=md.id,
            updated_at=week_ago_plus,
        ),
        Meeting(
            company_id=company.id,
            subject="Cancelled this week",
            starts_at=now - timedelta(hours=2),
            status="cancelled",
            lead_id=lead.id,
            created_by_id=md.id,
            updated_at=now - timedelta(hours=1),
        ),
    ])
    db.commit()
    login_user(client, md.email)
    overdue = client.get("/api/meetings", params={"bucket": "overdue"})
    assert overdue.status_code == 200, overdue.text
    overdue_subjects = {row["subject"] for row in overdue.json()["items"]}
    assert "Earlier today" in overdue_subjects
    assert "Later today" not in overdue_subjects
    today = client.get("/api/meetings", params={"bucket": "today"})
    assert today.status_code == 200, today.text
    today_subjects = {row["subject"] for row in today.json()["items"]}
    assert "Earlier today" in today_subjects
    assert "Later today" in today_subjects
    upcoming = client.get("/api/meetings", params={"bucket": "upcoming"})
    assert upcoming.status_code == 200, upcoming.text
    upcoming_subjects = {row["subject"] for row in upcoming.json()["items"]}
    assert "Later today" in upcoming_subjects
    assert "Earlier today" not in upcoming_subjects
    completed = client.get("/api/meetings", params={"bucket": "completed"})
    assert {row["subject"] for row in completed.json()["items"]} == {
        "Done this week",
        "Old completed",
    }
    cancelled = client.get("/api/meetings", params={"bucket": "cancelled"})
    assert {row["subject"] for row in cancelled.json()["items"]} == {"Cancelled this week"}
    summary = client.get("/api/meetings/summary")
    assert summary.status_code == 200, summary.text
    body = summary.json()
    assert body["today"] >= 2
    assert body["upcoming"] >= 1
    assert body["overdue"] >= 1
    assert body["completed_week"] == 1
    assert body["cancelled_week"] == 1
    assert body["total_scheduled"] >= 2
