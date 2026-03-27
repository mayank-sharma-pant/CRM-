from app.models.sales.lead import Lead
from app.routers.ops import imports as imports_router
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


def test_import_leads_missing_name_column_returns_400(client, db):
    company = create_company(db, name="Import Co", company_code="IMC")
    admin = create_active_user(
        db,
        email="admin@imc.com",
        role="admin",
        company_id=company.id,
        full_name="Import Admin",
    )
    login_user(client, admin.email)

    response = client.post(
        "/api/import/leads",
        files={"file": ("bad.csv", b"email,company\nx@y.com,Acme\n", "text/csv")},
    )
    assert response.status_code == 400
    assert "name" in response.json()["detail"].lower()


def test_import_leads_internal_error_returns_sanitized_500(client, db, monkeypatch):
    company = create_company(db, name="Import Internal Co", company_code="IMI")
    admin = create_active_user(
        db,
        email="admin@imi.com",
        role="admin",
        company_id=company.id,
        full_name="Import Admin",
    )
    login_user(client, admin.email)

    def _raise_log_error(*_args, **_kwargs):
        raise RuntimeError("SENSITIVE-STACK-MESSAGE")

    monkeypatch.setattr(imports_router, "log_activity", _raise_log_error)

    response = client.post(
        "/api/import/leads",
        files={"file": ("ok.csv", b"name,email\nLead A,a@a.com\n", "text/csv")},
    )
    assert response.status_code == 500
    assert response.json()["detail"] == "Failed to process CSV file."
    assert "sensitive" not in response.json()["detail"].lower()

    # The row was created before activity logging; this test only verifies sanitization.
    assert db.query(Lead).filter(Lead.company_id == company.id).count() == 1
