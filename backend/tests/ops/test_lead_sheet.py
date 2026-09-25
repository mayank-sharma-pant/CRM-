"""Google Sheet lead pull uses the same email-then-phone duplicate rules as CSV."""
from app.models.sales.lead import Lead
from app.services.sales.reminders import run_due_reminders
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company

SHEET = "https://docs.google.com/spreadsheets/d/abc123sheet/edit?gid=0"


class _Response:
    def __init__(self, status_code=200, content=b""):
        self.status_code = status_code
        self.content = content


class _Client:
    bodies = []

    def __init__(self, *args, **kwargs):
        pass

    def get(self, url):
        assert "abc123sheet" in url
        assert "gid=0" in url
        assert url.startswith("https://docs.google.com/spreadsheets/d/")
        body = _Client.bodies.pop(0)
        return _Response(200, body)

    def close(self):
        return None


def _setup(db, code="SH1"):
    company = create_company(db, name=f"Co {code}", company_code=code)
    admin = create_active_user(db, email=f"admin@{code}.com", role="admin", company_id=company.id)
    return company, admin


def test_rejects_non_google_url(client, db):
    _, admin = _setup(db)
    login_user(client, admin.email)
    resp = client.put("/api/import/sheets", json={"url": "https://example.com/sheet"})
    assert resp.status_code == 400


def test_sync_inserts_new_and_skips_duplicates(client, db, monkeypatch):
    company, admin = _setup(db, code="SH2")
    login_user(client, admin.email)
    saved = client.put("/api/import/sheets", json={"url": SHEET})
    assert saved.status_code == 200, saved.text
    assert saved.json()["url"] == SHEET

    monkeypatch.setattr("app.services.sales.lead_sheet.httpx.Client", _Client)
    _Client.bodies = [b"name,email,phone\nAda,ada@x.com,111\n"]
    first = client.post("/api/import/sheets/sync")
    assert first.status_code == 200, first.text
    assert first.json()["created"] == 1

    _Client.bodies = [b"name,email,phone\nAda,ada@x.com,111\nBea,bea@x.com,222\nSame,other@x.com,111\n"]
    second = client.post("/api/import/sheets/sync")
    assert second.status_code == 200, second.text
    assert second.json()["created"] == 1
    assert second.json()["skipped_duplicate"] == 2
    names = {row.name for row in db.query(Lead).filter(Lead.company_id == company.id).all()}
    assert names == {"Ada", "Bea"}
    sources = {row.source for row in db.query(Lead).filter(Lead.company_id == company.id).all()}
    assert sources == {"Google Sheet"}


def test_private_sheet_is_a_clear_error(client, db, monkeypatch):
    _, admin = _setup(db, code="SH3")
    login_user(client, admin.email)
    client.put("/api/import/sheets", json={"url": SHEET})

    class _HtmlClient:
        def __init__(self, *args, **kwargs):
            pass

        def get(self, url):
            return _Response(200, b"<!DOCTYPE html><html>login</html>")

        def close(self):
            return None

    monkeypatch.setattr("app.services.sales.lead_sheet.httpx.Client", _HtmlClient)
    resp = client.post("/api/import/sheets/sync")
    assert resp.status_code == 400
    assert "Anyone with the link" in resp.json()["detail"]
    status = client.get("/api/import/sheets")
    assert "Anyone with the link" in (status.json()["last_result"] or "")


def test_reminder_run_pulls_new_sheet_rows(client, db, monkeypatch):
    company, admin = _setup(db, code="SH4")
    login_user(client, admin.email)
    assert client.put("/api/import/sheets", json={"url": SHEET}).status_code == 200
    monkeypatch.setattr("app.services.sales.lead_sheet.httpx.Client", _Client)
    _Client.bodies = [b"name,email\nAda,ada@x.com\n"]
    result = run_due_reminders(db)
    assert result["sheets"] == 1
    names = {row.name for row in db.query(Lead).filter(Lead.company_id == company.id).all()}
    assert names == {"Ada"}
    _Client.bodies = [b"name,email\nAda,ada@x.com\n"]
    again = run_due_reminders(db)
    assert again["sheets"] == 0


def test_sales_cannot_connect_a_sheet(client, db):
    company = create_company(db, name="Co SH5", company_code="SH5")
    sales = create_active_user(db, email="sales@sh5.com", role="sales", company_id=company.id)
    login_user(client, sales.email)
    resp = client.put("/api/import/sheets", json={"url": SHEET})
    assert resp.status_code == 403
