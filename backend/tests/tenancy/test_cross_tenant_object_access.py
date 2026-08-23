"""Cross-tenant object-access matrix.

The list-scoping test (`test_multi_tenancy.py`) proves company B's *list* omits
company A's rows. This proves the stronger invariant the roadmap requires
(§Phase 0.2): company B cannot GET or DELETE company A's row *by id*. That is
where leaks actually hide — a detail/mutation handler that fetches by primary
key without re-applying the company filter.

Company B's actor is an **admin** so that per-role gating cannot mask a tenancy
leak: if isolation holds it is the company scope, not the role, doing the work.
A leak shows up as a 2xx returning A's data (read) or a successful mutation.
"""

import datetime
import tempfile

import pytest

from app.utils.rate_limit import auth_limiter
from app.models import Lead, Client, Task, Invoice
from app.models.sales.follow_up import FollowUp
from app.models.sales.notification import Notification
from app.models.ops.document import Document
from app.models.ops.stock_item import StockItem
from app.models.finance.ledger import LedgerEntry
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


NO_ACCESS = (403, 404)


@pytest.fixture(autouse=True)
def _reset_auth_rate_limit():
    """The auth limiter is a process-global; repeated logins across the
    parametrized cases would trip it and mask the tenancy result with a 429."""
    auth_limiter._buckets.clear()
    yield


@pytest.fixture()
def two_companies(db):
    """Company A owns one row of every resource; return ids and B's admin login."""
    company_a = create_company(db, name="Company A", company_code="COA")
    company_b = create_company(db, name="Company B", company_code="COB")

    admin_a = create_active_user(
        db, email="admin@a.com", role="admin", company_id=company_a.id, full_name="A Admin"
    )
    admin_b = create_active_user(
        db, email="admin@b.com", role="admin", company_id=company_b.id, full_name="B Admin"
    )

    lead = Lead(name="Lead A", email="la@a.com", company="Alpha", company_id=company_a.id, status="New")
    client_row = Client(name="Client A", company_id=company_a.id, assigned_to_id=admin_a.id)
    db.add_all([lead, client_row])
    db.commit()

    task = Task(title="Task A", company_id=company_a.id, assigned_to_id=admin_a.id)
    follow_up = FollowUp(
        company_id=company_a.id,
        lead_id=lead.id,
        scheduled_date=datetime.date(2026, 9, 1),
        created_by_id=admin_a.id,
    )
    invoice = Invoice(
        company_id=company_a.id,
        invoice_number="INV-A-1",
        client_id=client_row.id,
        created_by_id=admin_a.id,
    )
    # A real file on disk so the owner's download is a genuine 200; that is what
    # makes company B's 404 prove the *scope* check, not a missing-file 404.
    doc_file = tempfile.NamedTemporaryFile(suffix=".pdf", delete=False)
    doc_file.write(b"%PDF-1.4 test")
    doc_file.close()
    document = Document(
        filename="a.pdf",
        stored_filename="stored-a.pdf",
        file_path=doc_file.name,
        company_id=company_a.id,
        client_id=client_row.id,
        uploaded_by_id=admin_a.id,
    )
    stock = StockItem(name="Widget A", company_id=company_a.id, created_by_id=admin_a.id)
    notification = Notification(user_id=admin_a.id, title="A's alert", message="private")
    ledger_entry = LedgerEntry(
        company_id=company_a.id,
        ledger_slug="payments_made",
        data={"party_name": "Vendor A", "amount": 1000},
        created_by=admin_a.id,
    )
    db.add_all([task, follow_up, invoice, document, stock, notification, ledger_entry])
    db.commit()

    ids = {
        "lead": lead.id,
        "client": client_row.id,
        "task": task.id,
        "follow_up": follow_up.id,
        "invoice": invoice.id,
        "document": document.id,
        "stock": stock.id,
        "notification": notification.id,
        "ledger_entry": ledger_entry.id,
    }
    return ids, admin_b.email


# (resource, method, url-template) — url filled from the seeded ids.
READ_CASES = [
    ("lead", "GET", "/api/leads/{lead}"),
    ("client", "GET", "/api/clients/{client}"),
    ("task", "GET", "/api/tasks/{task}"),
    ("follow_up", "GET", "/api/follow-ups/{follow_up}"),
    ("invoice", "GET", "/api/invoices/{invoice}"),
    ("document", "GET", "/api/documents/download/{document}"),
]

DELETE_CASES = [
    ("lead", "DELETE", "/api/leads/{lead}"),
    ("client", "DELETE", "/api/clients/{client}"),
    ("task", "DELETE", "/api/tasks/{task}"),
    ("follow_up", "DELETE", "/api/follow-ups/{follow_up}"),
    ("document", "DELETE", "/api/documents/{document}"),
    ("stock", "DELETE", "/api/inventory/{stock}"),
    ("ledger_entry", "DELETE", "/api/ledgers/payments_made/{ledger_entry}"),
    ("notification_read", "POST", "/api/notifications/{notification}/read"),
]

# (resource, method, url-template, valid body). Bodies are valid so the ONLY thing
# that can stop the mutation is the company-scope check — a 200 here would be a leak.
MUTATION_CASES = [
    ("lead", "PATCH", "/api/leads/{lead}/status", {"status": "Contacted"}),
    ("client", "PUT", "/api/clients/{client}", {"name": "hacked"}),
    ("task", "PUT", "/api/tasks/{task}", {"title": "hacked"}),
    ("follow_up", "PUT", "/api/follow-ups/{follow_up}", {"notes": "hacked"}),
    ("stock", "PATCH", "/api/inventory/{stock}", {"name": "hacked"}),
]


@pytest.mark.parametrize("resource,method,url_tmpl", READ_CASES, ids=[c[0] for c in READ_CASES])
def test_owner_can_read_own_resource(client, two_companies, resource, method, url_tmpl):
    """Positive control: company A's admin CAN read its own rows. Without this,
    the cross-tenant 404s below could be passing vacuously (row never seeded /
    endpoint always 404s), which would prove nothing about isolation."""
    ids, _ = two_companies
    login_user(client, "admin@a.com")
    resp = client.request(method, url_tmpl.format(**ids))
    assert resp.status_code == 200, (
        f"owner cannot read own {resource} ({method} {url_tmpl.format(**ids)}) "
        f"-> {resp.status_code}: {resp.text[:200]}"
    )


@pytest.mark.parametrize("resource,method,url_tmpl", READ_CASES, ids=[c[0] for c in READ_CASES])
def test_cross_tenant_read_is_denied(client, two_companies, resource, method, url_tmpl):
    ids, admin_b_email = two_companies
    login_user(client, admin_b_email)
    resp = client.request(method, url_tmpl.format(**ids))
    assert resp.status_code in NO_ACCESS, (
        f"LEAK: company B read company A's {resource} "
        f"({method} {url_tmpl.format(**ids)}) -> {resp.status_code}: {resp.text[:200]}"
    )


@pytest.mark.parametrize("resource,method,url_tmpl", DELETE_CASES, ids=[c[0] for c in DELETE_CASES])
def test_owner_can_delete_own_resource(client, two_companies, resource, method, url_tmpl):
    """Positive control for the delete/mark cases (incl. ledger + notification,
    which have no read control): the owner's call succeeds."""
    ids, _ = two_companies
    login_user(client, "admin@a.com")
    resp = client.request(method, url_tmpl.format(**ids))
    assert resp.status_code in (200, 204), (
        f"owner cannot delete/mark own {resource} ({method} {url_tmpl.format(**ids)}) "
        f"-> {resp.status_code}: {resp.text[:200]}"
    )


@pytest.mark.parametrize("resource,method,url_tmpl", DELETE_CASES, ids=[c[0] for c in DELETE_CASES])
def test_cross_tenant_delete_is_denied(client, two_companies, resource, method, url_tmpl):
    ids, admin_b_email = two_companies
    login_user(client, admin_b_email)
    resp = client.request(method, url_tmpl.format(**ids))
    assert resp.status_code in NO_ACCESS, (
        f"LEAK: company B deleted/mutated company A's {resource} "
        f"({method} {url_tmpl.format(**ids)}) -> {resp.status_code}: {resp.text[:200]}"
    )


@pytest.mark.parametrize("resource,method,url_tmpl,body", MUTATION_CASES, ids=[c[0] for c in MUTATION_CASES])
def test_owner_can_mutate_own_resource(client, two_companies, resource, method, url_tmpl, body):
    """Positive control for PATCH/PUT: owner's valid mutation succeeds, so the
    cross-tenant 404 below proves the scope check and not body rejection."""
    ids, _ = two_companies
    login_user(client, "admin@a.com")
    resp = client.request(method, url_tmpl.format(**ids), json=body)
    assert resp.status_code == 200, (
        f"owner cannot mutate own {resource} ({method} {url_tmpl.format(**ids)}) "
        f"-> {resp.status_code}: {resp.text[:200]}"
    )


@pytest.mark.parametrize("resource,method,url_tmpl,body", MUTATION_CASES, ids=[c[0] for c in MUTATION_CASES])
def test_cross_tenant_mutation_is_denied(client, two_companies, resource, method, url_tmpl, body):
    ids, admin_b_email = two_companies
    login_user(client, admin_b_email)
    resp = client.request(method, url_tmpl.format(**ids), json=body)
    assert resp.status_code in NO_ACCESS, (
        f"LEAK: company B mutated company A's {resource} "
        f"({method} {url_tmpl.format(**ids)}) -> {resp.status_code}: {resp.text[:200]}"
    )


def test_users_list_is_company_scoped(client, two_companies):
    """Users has no GET-by-id; the leak surface is the list. Company B's user
    list must not contain company A's users."""
    ids, admin_b_email = two_companies
    login_user(client, admin_b_email)
    resp = client.get("/api/users")
    assert resp.status_code == 200, resp.text
    emails = {u["email"] for u in resp.json()["items"]}
    assert "admin@a.com" not in emails, f"LEAK: company B sees company A's users: {emails}"
    assert emails <= {"admin@b.com"}, f"LEAK: unexpected cross-tenant users: {emails}"
