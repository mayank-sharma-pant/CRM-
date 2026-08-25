from app.models.sales.lead import Lead
from app.utils.rate_limit import auth_limiter, public_form_limiter
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company
from tests.sales.test_public_lead_form import _seed_form


def setup_function():
    auth_limiter._buckets.clear()
    public_form_limiter._buckets.clear()


def test_widget_creates_lead_with_widget_source(client, db):
    company = create_company(db, name="WidCo", company_code="WID")
    _seed_form(db, company, slug="wid-a")
    resp = client.post("/api/public/widget/wid-a", json={
        "name": "Neha", "email": "neha@x.com", "message": "Need a site visit", "website": "",
    })
    assert resp.status_code == 201, resp.text
    lead = db.query(Lead).filter(Lead.company_id == company.id).one()
    assert lead.name == "Neha"
    assert lead.source == "Website widget"
    assert lead.notes == "Need a site visit"
    assert lead.email == "neha@x.com"


def test_widget_requires_contact(client, db):
    company = create_company(db, name="Wid2", company_code="WI2")
    _seed_form(db, company, slug="wid-b")
    resp = client.post("/api/public/widget/wid-b", json={"name": "OnlyName", "message": "hi"})
    assert resp.status_code == 400


def test_widget_unknown_slug_404(client, db):
    assert client.get("/api/public/widget/nope").status_code == 404
    assert client.post("/api/public/widget/nope", json={"name": "A", "email": "a@a.com"}).status_code == 404


def test_widget_embed_js_points_at_iframe(client, db):
    company = create_company(db, name="Wid3", company_code="WI3")
    _seed_form(db, company, slug="wid-c")
    resp = client.get("/api/public/widget/wid-c/embed.js")
    assert resp.status_code == 200, resp.text
    assert "javascript" in resp.headers["content-type"]
    body = resp.text
    assert "iframe" in body
    assert "/w/wid-c" in body


def test_other_company_cannot_see_widget_lead(client, db):
    a = create_company(db, name="WA", company_code="WIA")
    b = create_company(db, name="WB", company_code="WIB")
    _seed_form(db, a, slug="wid-d")
    create_active_user(db, email="admin@wib.com", role="admin", company_id=b.id)
    client.post("/api/public/widget/wid-d", json={"name": "Ravi", "phone": "1", "message": "hi"})
    lead = db.query(Lead).filter(Lead.company_id == a.id).one()
    login_user(client, "admin@wib.com")
    denied = client.get(f"/api/leads/{lead.id}")
    assert denied.status_code in (403, 404), denied.text
