from datetime import datetime
from decimal import Decimal

import pytest

from app.models.core.team import Team
from app.models.core.team_membership import TeamMembership
from app.models.sales.deal import Deal
from app.models.sales.pipeline import PipelineStage
from app.utils.rate_limit import auth_limiter
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


@pytest.fixture(autouse=True)
def _reset():
    auth_limiter._buckets.clear()
    yield


def test_upsert_quota_and_report_closed_and_weighted(client, db):
    company = create_company(db, name="FC", company_code="FC2")
    admin = create_active_user(db, email="admin@fc2.com", role="admin", company_id=company.id)
    sales = create_active_user(db, email="sales@fc2.com", role="sales", company_id=company.id)
    login_user(client, admin.email)

    put = client.put("/api/forecasting/quotas", json={
        "user_id": sales.id, "year": 2026, "month": 8, "amount": "1000.00",
    })
    assert put.status_code == 200, put.text

    open_deal = client.post(
        "/api/deals",
        json={"title": "Open", "amount": "100", "assigned_to_id": sales.id},
    ).json()
    stages = {s.name: s for s in db.query(PipelineStage).all()}

    won_deal = client.post(
        "/api/deals",
        json={"title": "Won", "amount": "500", "assigned_to_id": sales.id},
    ).json()
    client.patch(
        f"/api/deals/{won_deal['id']}/stage",
        json={"stage_id": stages["Won"].id},
    )
    deal_row = db.query(Deal).filter(Deal.id == won_deal["id"]).first()
    deal_row.closed_at = datetime(2026, 8, 15)
    db.commit()

    neg = client.post(
        "/api/deals",
        json={"title": "Neg", "amount": "200", "assigned_to_id": sales.id},
    ).json()
    client.patch(
        f"/api/deals/{neg['id']}/stage",
        json={"stage_id": stages["Negotiation"].id},
    )

    report = client.get("/api/forecasting/report", params={"year": 2026, "month": 8})
    assert report.status_code == 200
    row = next(r for r in report.json()["items"] if r["user_id"] == sales.id)
    assert row["quota"] == "1000.00"
    assert row["closed_won"] == "500.00"
    assert row["open_weighted"] == "150.00"
    assert row["closed_pct"] == 0.5
    assert row["pipeline_pct"] == 0.15
    assert row["quota_id"] is not None
    assert open_deal["id"] is not None


def test_sales_cannot_put_quota(client, db):
    company = create_company(db, name="FC3", company_code="FC3")
    create_active_user(db, email="admin@fc3.com", role="admin", company_id=company.id)
    sales = create_active_user(db, email="sales@fc3.com", role="sales", company_id=company.id)
    login_user(client, sales.email)
    assert client.put("/api/forecasting/quotas", json={
        "user_id": sales.id, "year": 2026, "month": 8, "amount": "100",
    }).status_code == 403


def test_bad_month_400(client, db):
    company = create_company(db, name="FC4", company_code="FC4")
    create_active_user(db, email="admin@fc4.com", role="admin", company_id=company.id)
    login_user(client, "admin@fc4.com")
    assert client.get("/api/forecasting/report", params={"year": 2026, "month": 13}).status_code == 400


def test_manager_can_set_quota_for_team_member(client, db):
    company = create_company(db, name="FC5", company_code="FC5")
    team = Team(company_id=company.id, name="T1")
    db.add(team)
    db.commit()
    db.refresh(team)
    manager = create_active_user(
        db, email="mgr@fc5.com", role="manager", company_id=company.id, team_id=team.id,
    )
    sales = create_active_user(db, email="sales@fc5.com", role="sales", company_id=company.id)
    db.add(TeamMembership(company_id=company.id, team_id=team.id, user_id=manager.id))
    db.add(TeamMembership(company_id=company.id, team_id=team.id, user_id=sales.id))
    db.commit()
    login_user(client, manager.email)
    resp = client.put("/api/forecasting/quotas", json={
        "user_id": sales.id, "year": 2026, "month": 8, "amount": "500.00",
    })
    assert resp.status_code == 200, resp.text


def test_manager_can_set_own_quota_with_active_team_without_membership(client, db):
    company = create_company(db, name="FC7", company_code="FC7")
    team = Team(company_id=company.id, name="T2")
    db.add(team)
    db.commit()
    db.refresh(team)
    manager = create_active_user(
        db, email="mgr@fc7.com", role="manager", company_id=company.id, team_id=team.id,
    )
    sales = create_active_user(db, email="sales@fc7.com", role="sales", company_id=company.id)
    db.add(TeamMembership(company_id=company.id, team_id=team.id, user_id=sales.id))
    db.commit()
    login_user(client, manager.email)
    client.headers["X-Team-Id"] = str(team.id)
    resp = client.put("/api/forecasting/quotas", json={
        "user_id": manager.id, "year": 2026, "month": 8, "amount": "1200.00",
    })
    assert resp.status_code == 200, resp.text
    assert resp.json()["amount"] == "1200.00"


def test_list_and_delete_quota(client, db):
    company = create_company(db, name="FC6", company_code="FC6")
    admin = create_active_user(db, email="admin@fc6.com", role="admin", company_id=company.id)
    sales = create_active_user(db, email="sales@fc6.com", role="sales", company_id=company.id)
    login_user(client, admin.email)
    put = client.put("/api/forecasting/quotas", json={
        "user_id": sales.id, "year": 2026, "month": 8, "amount": "750.00",
    })
    quota_id = put.json()["id"]
    listed = client.get("/api/forecasting/quotas", params={"year": 2026, "month": 8})
    assert listed.status_code == 200
    assert any(q["id"] == quota_id for q in listed.json()["items"])
    deleted = client.delete(f"/api/forecasting/quotas/{quota_id}")
    assert deleted.status_code == 200
    listed_after = client.get("/api/forecasting/quotas", params={"year": 2026, "month": 8})
    assert not any(q["id"] == quota_id for q in listed_after.json()["items"])
