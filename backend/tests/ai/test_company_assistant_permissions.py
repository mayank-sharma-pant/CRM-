from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


def test_ai_company_assistant_requires_md_or_admin(client, db):
    company = create_company(db, name="AI Co", company_code="AIC")

    sales = create_active_user(
        db,
        email="sales@ai.co",
        role="sales",
        company_id=company.id,
        full_name="AI Sales",
    )
    md_user = create_active_user(
        db,
        email="md@ai.co",
        role="md",
        company_id=company.id,
        full_name="AI MD",
    )

    login_user(client, sales.email)
    r = client.post("/api/ai/company-assistant", json={"message": "create team Alpha"})
    assert r.status_code == 403

    client.headers.pop("Authorization", None)
    login_user(client, md_user.email)
    r2 = client.post("/api/ai/company-assistant", json={"message": "create team Alpha"})
    assert r2.status_code in (200, 503, 502)

