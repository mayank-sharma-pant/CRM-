from app.models.sales.lead import Lead
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


def test_preview_does_not_treat_other_company_email_as_duplicate(client, db):
    a = create_company(db, name="A", company_code="IMA")
    b = create_company(db, name="B", company_code="IMB")
    create_active_user(db, email="admin@a.com", role="admin", company_id=a.id)
    create_active_user(db, email="admin@b.com", role="admin", company_id=b.id)
    db.add(Lead(company_id=a.id, name="A lead", email="shared@x.com", status="New"))
    db.commit()
    login_user(client, "admin@b.com")
    resp = client.post(
        "/api/import/leads/preview",
        files={"file": ("leads.csv", b"Full Name,E-mail\nBee,shared@x.com\n", "text/csv")},
    )
    assert resp.status_code == 200, resp.text
    rows = resp.json()["rows"]
    assert len(rows) == 1
    assert rows[0]["status"] == "new"
    login_user(client, "admin@a.com")
    resp_a = client.post(
        "/api/import/leads/preview",
        files={"file": ("leads.csv", b"Full Name,E-mail\nAnn,shared@x.com\n", "text/csv")},
    )
    assert resp_a.status_code == 200
    assert resp_a.json()["rows"][0]["status"] == "duplicate"
