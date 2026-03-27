from app.models import Lead
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


def test_multi_tenancy_lead_isolation(client, db):
    company_a = create_company(db, name="Company A", company_code="COA")
    company_b = create_company(db, name="Company B", company_code="COB")

    admin_a = create_active_user(
        db,
        email="admin@a.com",
        role="admin",
        company_id=company_a.id,
        full_name="A Admin",
    )
    sales_b = create_active_user(
        db,
        email="sales@b.com",
        role="sales",
        company_id=company_b.id,
        full_name="B Sales",
    )

    lead_a = Lead(
        name="Lead A",
        email="la@a.com",
        company="Alpha Corp",
        company_id=company_a.id,
        status="New",
    )
    db.add(lead_a)
    db.commit()

    login_user(client, sales_b.email)
    response = client.get("/api/leads/")
    assert response.status_code == 200

    leads = response.json()["items"]
    assert not any(l["name"] == "Lead A" for l in leads)
    assert len(leads) == 0

    client.headers.pop("Authorization", None)
    login_user(client, admin_a.email)
    response = client.get("/api/leads/")
    assert response.status_code == 200

    leads = response.json()["items"]
    assert any(l["name"] == "Lead A" for l in leads)
    assert len(leads) == 1


def test_platform_admin_bypass(client, db):
    company_a = create_company(db, name="Company A", company_code="COA")

    lead_a = Lead(
        name="Lead A",
        email="la@a.com",
        company="Alpha Corp",
        company_id=company_a.id,
        status="New",
    )
    db.add(lead_a)
    db.commit()

    platform_admin = create_active_user(
        db,
        email="platform@admin.com",
        role="admin",
        company_id=None,
        full_name="Platform Admin",
    )

    login_user(client, platform_admin.email)
    response = client.get("/api/leads/")
    assert response.status_code == 200

    leads = response.json()["items"]
    assert any(l["name"] == "Lead A" for l in leads)
    assert len(leads) == 1
