from datetime import datetime, timezone

import pytest

from app.models import Lead
from app.models.core.team import Team
from app.models.core.team_membership import TeamMembership
from app.models.sales.whatsapp import WhatsAppMessage
from app.utils.rate_limit import auth_limiter
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


@pytest.fixture(autouse=True)
def _reset_auth():
    auth_limiter._buckets.clear()
    yield


def test_sales_omits_other_exec_thread_owner_sees_unanswered(client, db):
    company = create_company(db, name="WA Threads Co", company_code="WT1")
    team = Team(company_id=company.id, name="A")
    db.add(team)
    db.commit()
    db.refresh(team)
    a = create_active_user(db, email="a@wt1.com", role="sales", company_id=company.id, team_id=team.id)
    b = create_active_user(db, email="b@wt1.com", role="sales", company_id=company.id, team_id=team.id)
    db.add_all([
        TeamMembership(company_id=company.id, team_id=team.id, user_id=a.id),
        TeamMembership(company_id=company.id, team_id=team.id, user_id=b.id),
    ])
    lead_b = Lead(
        company_id=company.id,
        name="Ravi",
        phone="999",
        status="Active",
        team_id=team.id,
        assigned_to_id=b.id,
    )
    db.add(lead_b)
    db.commit()
    db.refresh(lead_b)
    last_at = datetime(2026, 9, 21, 10, 0, 0, tzinfo=timezone.utc)
    db.add(WhatsAppMessage(
        company_id=company.id,
        lead_id=lead_b.id,
        to_phone="999",
        direction="inbound",
        body="hello",
        status="received",
        created_at=last_at,
    ))
    db.commit()

    login_user(client, a.email)
    a_listed = client.get("/api/whatsapp/threads", headers={"X-Team-Id": str(team.id)})
    assert a_listed.status_code == 200, a_listed.text
    a_body = a_listed.json()
    assert all(row.get("lead_id") != lead_b.id for row in a_body["items"])
    assert a_body["total"] == 0

    login_user(client, b.email)
    b_listed = client.get("/api/whatsapp/threads", headers={"X-Team-Id": str(team.id)})
    assert b_listed.status_code == 200, b_listed.text
    b_body = b_listed.json()
    assert b_body["total"] == 1
    assert len(b_body["items"]) == 1
    row = b_body["items"][0]
    assert row["lead_id"] == lead_b.id
    assert row["client_id"] is None
    assert row["name"] == "Ravi"
    assert row["phone"] == "999"
    assert row["last_direction"] == "inbound"
    assert row["last_body"] == "hello"
    assert row["last_at"] in ("2026-09-21T10:00:00+00:00", "2026-09-21T10:00:00Z")
    assert row["unanswered"] is True


def test_md_threads_stay_company_scope(client, db):
    company = create_company(db, name="MD WA Co", company_code="WT2")
    other = create_company(db, name="Other WA Co", company_code="WT2B")
    md = create_active_user(db, email="md@wt2.com", role="md", company_id=company.id)
    lead = Lead(company_id=company.id, name="Ravi", phone="999", status="Active")
    foreign_lead = Lead(company_id=other.id, name="Foreign", phone="888", status="Active")
    db.add_all([lead, foreign_lead])
    db.commit()
    db.refresh(lead)
    db.refresh(foreign_lead)
    last_at = datetime(2026, 9, 21, 10, 0, 0, tzinfo=timezone.utc)
    db.add_all([
        WhatsAppMessage(
            company_id=company.id,
            lead_id=lead.id,
            to_phone="999",
            direction="inbound",
            body="hello",
            status="received",
            created_at=last_at,
        ),
        WhatsAppMessage(
            company_id=other.id,
            lead_id=foreign_lead.id,
            to_phone="888",
            direction="inbound",
            body="other company",
            status="received",
            created_at=last_at,
        ),
    ])
    db.commit()
    login_user(client, md.email)
    listed = client.get("/api/whatsapp/threads")
    assert listed.status_code == 200, listed.text
    body = listed.json()
    lead_ids = {row["lead_id"] for row in body["items"]}
    assert lead.id in lead_ids
    assert foreign_lead.id not in lead_ids
    assert all(row.get("name") != "Foreign" for row in body["items"])
    assert body["total"] == 1


def test_purchase_threads_forbidden(client, db):
    company = create_company(db, name="Buy WA Co", company_code="WT3")
    purchase = create_active_user(db, email="buy@wt3.com", role="purchase", company_id=company.id)
    lead = Lead(company_id=company.id, name="Ravi", phone="999", status="Active")
    db.add(lead)
    db.commit()
    db.refresh(lead)
    db.add(WhatsAppMessage(
        company_id=company.id,
        lead_id=lead.id,
        to_phone="999",
        direction="inbound",
        body="hello",
        status="received",
        created_at=datetime(2026, 9, 21, 10, 0, 0, tzinfo=timezone.utc),
    ))
    db.commit()
    login_user(client, purchase.email)
    listed = client.get("/api/whatsapp/threads")
    assert listed.status_code == 403, listed.text


def test_admin_threads_allowed_purchase_still_forbidden(client, db):
    company = create_company(db, name="Allow WA Co", company_code="WT4")
    admin = create_active_user(db, email="admin@wt4.com", role="admin", company_id=company.id)
    purchase = create_active_user(db, email="buy@wt4.com", role="purchase", company_id=company.id)
    lead = Lead(company_id=company.id, name="Ravi", phone="999", status="Active")
    db.add(lead)
    db.commit()
    db.refresh(lead)
    db.add(WhatsAppMessage(
        company_id=company.id,
        lead_id=lead.id,
        to_phone="999",
        direction="inbound",
        body="hello",
        status="received",
        created_at=datetime(2026, 9, 21, 10, 0, 0, tzinfo=timezone.utc),
    ))
    db.commit()
    login_user(client, admin.email)
    listed = client.get("/api/whatsapp/threads")
    assert listed.status_code == 200, listed.text
    assert listed.json()["total"] == 1
    last_at = listed.json()["items"][0]["last_at"]
    assert last_at in ("2026-09-21T10:00:00+00:00", "2026-09-21T10:00:00Z")
    login_user(client, purchase.email)
    forbidden = client.get("/api/whatsapp/threads")
    assert forbidden.status_code == 403, forbidden.text


def test_manager_sees_team_lead_and_sent_by_or_not_other_team(client, db):
    company = create_company(db, name="Mgr WA Co", company_code="WT5")
    team_a = Team(company_id=company.id, name="A")
    team_b = Team(company_id=company.id, name="B")
    db.add_all([team_a, team_b])
    db.commit()
    db.refresh(team_a)
    db.refresh(team_b)
    manager_a = create_active_user(
        db, email="mgr@wt5.com", role="manager", company_id=company.id, team_id=team_a.id
    )
    sales_a = create_active_user(
        db, email="sa@wt5.com", role="sales", company_id=company.id, team_id=team_a.id
    )
    sales_b = create_active_user(
        db, email="sb@wt5.com", role="sales", company_id=company.id, team_id=team_b.id
    )
    db.add_all([
        TeamMembership(company_id=company.id, team_id=team_a.id, user_id=manager_a.id),
        TeamMembership(company_id=company.id, team_id=team_a.id, user_id=sales_a.id),
        TeamMembership(company_id=company.id, team_id=team_b.id, user_id=sales_b.id),
    ])
    lead_a = Lead(
        company_id=company.id, name="TeamA", phone="111", status="Active", team_id=team_a.id
    )
    lead_b = Lead(
        company_id=company.id, name="TeamB", phone="222", status="Active", team_id=team_b.id
    )
    lead_b_sent = Lead(
        company_id=company.id, name="TeamBSent", phone="333", status="Active", team_id=team_b.id
    )
    db.add_all([lead_a, lead_b, lead_b_sent])
    db.commit()
    db.refresh(lead_a)
    db.refresh(lead_b)
    db.refresh(lead_b_sent)
    last_at = datetime(2026, 9, 21, 10, 0, 0, tzinfo=timezone.utc)
    db.add_all([
        WhatsAppMessage(
            company_id=company.id,
            lead_id=lead_a.id,
            to_phone="111",
            direction="inbound",
            body="on A",
            status="received",
            created_at=last_at,
        ),
        WhatsAppMessage(
            company_id=company.id,
            lead_id=lead_b.id,
            to_phone="222",
            direction="inbound",
            body="on B",
            status="received",
            sent_by_id=sales_b.id,
            created_at=last_at,
        ),
        WhatsAppMessage(
            company_id=company.id,
            lead_id=lead_b_sent.id,
            to_phone="333",
            direction="inbound",
            body="sent by A",
            status="received",
            sent_by_id=sales_a.id,
            created_at=last_at,
        ),
    ])
    db.commit()
    login_user(client, manager_a.email)
    listed = client.get("/api/whatsapp/threads", headers={"X-Team-Id": str(team_a.id)})
    assert listed.status_code == 200, listed.text
    body = listed.json()
    lead_ids = {row["lead_id"] for row in body["items"]}
    assert lead_a.id in lead_ids
    assert lead_b.id not in lead_ids
    assert lead_b_sent.id in lead_ids


def test_sales_sees_thread_they_sent_on_others_lead(client, db):
    company = create_company(db, name="Sales WA Co", company_code="WT6")
    team = Team(company_id=company.id, name="A")
    db.add(team)
    db.commit()
    db.refresh(team)
    sender = create_active_user(
        db, email="sender@wt6.com", role="sales", company_id=company.id, team_id=team.id
    )
    owner = create_active_user(
        db, email="owner@wt6.com", role="sales", company_id=company.id, team_id=team.id
    )
    db.add_all([
        TeamMembership(company_id=company.id, team_id=team.id, user_id=sender.id),
        TeamMembership(company_id=company.id, team_id=team.id, user_id=owner.id),
    ])
    lead = Lead(
        company_id=company.id,
        name="Owned",
        phone="444",
        status="Active",
        team_id=team.id,
        assigned_to_id=owner.id,
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)
    db.add(WhatsAppMessage(
        company_id=company.id,
        lead_id=lead.id,
        to_phone="444",
        direction="outbound",
        body="from sender",
        status="sent",
        sent_by_id=sender.id,
        created_at=datetime(2026, 9, 21, 10, 0, 0, tzinfo=timezone.utc),
    ))
    db.commit()
    login_user(client, sender.email)
    listed = client.get("/api/whatsapp/threads", headers={"X-Team-Id": str(team.id)})
    assert listed.status_code == 200, listed.text
    body = listed.json()
    assert any(row.get("lead_id") == lead.id for row in body["items"])
    assert body["total"] >= 1
