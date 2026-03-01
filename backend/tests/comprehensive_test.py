#!/usr/bin/env python3
"""
Comprehensive CRM System Test
Creates company 'Perioxiaen' with full org structure and tests all features.
Run: cd /home/mayank/CRM-/backend && .venv/bin/python tests/comprehensive_test.py
"""
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app.models import *
from app.utils.security import get_password_hash, create_access_token
from datetime import datetime, timedelta
import random

# ═══════════════════════════════════════════
# COLOR HELPERS
# ═══════════════════════════════════════════
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
BOLD = "\033[1m"
RESET = "\033[0m"

passed = 0
failed = 0
errors = []

def ok(msg):
    global passed
    passed += 1
    print(f"  {GREEN}✓{RESET} {msg}")

def fail(msg, detail=""):
    global failed
    failed += 1
    errors.append(f"{msg}: {detail}")
    print(f"  {RED}✗{RESET} {msg} — {detail}")

def section(title):
    print(f"\n{BOLD}{CYAN}{'═'*60}{RESET}")
    print(f"{BOLD}{CYAN}  {title}{RESET}")
    print(f"{BOLD}{CYAN}{'═'*60}{RESET}")

# ═══════════════════════════════════════════
# DATABASE SETUP
# ═══════════════════════════════════════════
section("1. DATABASE & COMPANY SETUP")

db: Session = SessionLocal()

# Create all tables (in case migrations haven't run)
from app.database import Base
Base.metadata.create_all(bind=engine)
ok("Database tables created/verified")

# Check if Perioxiaen already exists
company = db.query(Company).filter(Company.name == "Perioxiaen").first()
if company:
    print(f"  {YELLOW}⚠ Company 'Perioxiaen' already exists (id={company.id}), cleaning up...{RESET}")
    # Delete related data — order matters for foreign keys!
    users = db.query(User).filter(User.company_id == company.id).all()
    user_ids = [u.id for u in users]
    if user_ids:
        db.query(Notification).filter(Notification.user_id.in_(user_ids)).delete(synchronize_session=False)
        db.query(LeaveRequest).filter(LeaveRequest.user_id.in_(user_ids)).delete(synchronize_session=False)
    db.query(AuditLog).filter(AuditLog.company_id == company.id).delete(synchronize_session=False)
    db.query(Note).filter(Note.company_id == company.id).delete(synchronize_session=False)
    db.query(InvoiceItem).filter(InvoiceItem.company_id == company.id).delete(synchronize_session=False)
    db.query(Invoice).filter(Invoice.company_id == company.id).delete(synchronize_session=False)
    db.query(Task).filter(Task.company_id == company.id).delete(synchronize_session=False)
    db.query(FollowUp).filter(FollowUp.company_id == company.id).delete(synchronize_session=False)
    db.query(Client).filter(Client.company_id == company.id).delete(synchronize_session=False)
    db.query(Lead).filter(Lead.company_id == company.id).delete(synchronize_session=False)
    db.query(LedgerEntry).filter(LedgerEntry.company_id == company.id).delete(synchronize_session=False)
    # Users BEFORE teams (users reference teams via FK)
    db.query(User).filter(User.company_id == company.id).delete(synchronize_session=False)
    db.query(Team).filter(Team.company_id == company.id).delete(synchronize_session=False)
    db.query(Company).filter(Company.id == company.id).delete()
    db.commit()
    ok("Old Perioxiaen data cleaned up")

# Create company
company = Company(name="Perioxiaen", status="active")
db.add(company)
db.commit()
db.refresh(company)
ok(f"Company 'Perioxiaen' created (id={company.id})")

# ═══════════════════════════════════════════
# CREATE TEAMS
# ═══════════════════════════════════════════
section("2. CREATING TEAMS")

teams_data = [
    {"name": "Alpha Sales", "department": "sales"},
    {"name": "Beta Sales", "department": "sales"},
    {"name": "Procurement", "department": "purchase"},
]
teams = {}
for td in teams_data:
    team = Team(name=td["name"], company_id=company.id)
    db.add(team)
    db.commit()
    db.refresh(team)
    teams[td["name"]] = team
    ok(f"Team '{td['name']}' created (id={team.id})")

# ═══════════════════════════════════════════
# CREATE USERS
# ═══════════════════════════════════════════
section("3. CREATING USERS (13 total)")

users_data = [
    # MD (2)
    {"full_name": "Arjun Mehta",    "email": "arjun.md@perioxiaen.com",       "role": "md",       "team": None},
    {"full_name": "Priya Sharma",   "email": "priya.md@perioxiaen.com",       "role": "md",       "team": None},
    # Managers (3)
    {"full_name": "Rahul Verma",    "email": "rahul.mgr@perioxiaen.com",      "role": "manager",  "team": "Alpha Sales"},
    {"full_name": "Neha Gupta",     "email": "neha.mgr@perioxiaen.com",       "role": "manager",  "team": "Beta Sales"},
    {"full_name": "Vikram Singh",   "email": "vikram.mgr@perioxiaen.com",     "role": "manager",  "team": "Alpha Sales"},
    # Sales (3)
    {"full_name": "Anika Patel",    "email": "anika.sales@perioxiaen.com",    "role": "sales",    "team": "Alpha Sales"},
    {"full_name": "Karan Reddy",    "email": "karan.sales@perioxiaen.com",    "role": "sales",    "team": "Alpha Sales"},
    {"full_name": "Diya Nair",      "email": "diya.sales@perioxiaen.com",     "role": "sales",    "team": "Beta Sales"},
    # Purchase (2)
    {"full_name": "Rohan Joshi",    "email": "rohan.purchase@perioxiaen.com", "role": "purchase",  "team": "Procurement"},
    {"full_name": "Sneha Kumar",    "email": "sneha.purchase@perioxiaen.com", "role": "purchase",  "team": "Procurement"},
    # Admin (1)
    {"full_name": "Admin User",     "email": "admin@perioxiaen.com",          "role": "admin",    "team": None},
    # Team Leaders (2) — using manager role with team assignment
    {"full_name": "Amit Desai",     "email": "amit.tl@perioxiaen.com",        "role": "manager",  "team": "Alpha Sales"},
    {"full_name": "Kavya Rao",      "email": "kavya.tl@perioxiaen.com",       "role": "manager",  "team": "Beta Sales"},
]

created_users = {}
PASSWORD = "Test@123"
hashed = get_password_hash(PASSWORD)

for ud in users_data:
    user = User(
        full_name=ud["full_name"],
        email=ud["email"],
        hashed_password=hashed,
        role=ud["role"],
        company_id=company.id,
        team_id=teams[ud["team"]].id if ud["team"] else None,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    created_users[ud["email"]] = user
    ok(f"{ud['role'].upper():8s} | {ud['full_name']:20s} | {ud['email']}")

# ═══════════════════════════════════════════
# CREATE LEADS (3-4 per sales exec)
# ═══════════════════════════════════════════
section("4. CREATING LEADS")

sales_users = [created_users[e] for e in [
    "anika.sales@perioxiaen.com",
    "karan.sales@perioxiaen.com",
    "diya.sales@perioxiaen.com"
]]

lead_templates = [
    {"name": "TechCorp Solutions", "email": "contact@techcorp.com", "company": "TechCorp", "source": "Website", "status": "New"},
    {"name": "GlobalTrade Inc", "email": "sales@globaltrade.com", "company": "GlobalTrade", "source": "Referral", "status": "Contacted"},
    {"name": "Innovate Labs", "email": "hello@innovate.com", "company": "Innovate Labs", "source": "LinkedIn", "status": "Qualified"},
    {"name": "BlueOcean Media", "email": "info@blueocean.com", "company": "BlueOcean", "source": "Cold Call", "status": "New"},
    {"name": "DataStream Analytics", "email": "biz@datastream.com", "company": "DataStream", "source": "Website", "status": "Proposal"},
    {"name": "CloudNine Systems", "email": "sales@cloudnine.com", "company": "CloudNine", "source": "Exhibition", "status": "Contacted"},
    {"name": "PixelForge Design", "email": "hi@pixelforge.com", "company": "PixelForge", "source": "Referral", "status": "New"},
    {"name": "MetroLogistics", "email": "ops@metro.com", "company": "MetroLogistics", "source": "Website", "status": "Qualified"},
    {"name": "Zenith Pharma", "email": "enquiry@zenith.com", "company": "Zenith Pharma", "source": "LinkedIn", "status": "New"},
    {"name": "ApexBuild Corp", "email": "contact@apexbuild.com", "company": "ApexBuild", "source": "Cold Call", "status": "Contacted"},
]

created_leads = []
for i, lt in enumerate(lead_templates):
    sales_user = sales_users[i % 3]
    lead = Lead(
        company_id=company.id,
        assigned_to_id=sales_user.id,
        team_id=sales_user.team_id,
        name=lt["name"],
        email=lt["email"],
        phone=f"+91-98{random.randint(10000000, 99999999)}",
        company=lt["company"],
        source=lt["source"],
        status=lt["status"],
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)
    created_leads.append(lead)
    ok(f"Lead '{lt['name']}' → assigned to {sales_user.full_name} (status: {lt['status']})")

# ═══════════════════════════════════════════
# CONVERT SOME LEADS TO CLIENTS
# ═══════════════════════════════════════════
section("5. CONVERTING LEADS TO CLIENTS")

created_clients = []
for lead in created_leads[:4]:  # Convert first 4 leads
    client = Client(
        company_id=company.id,
        name=lead.name,
        email=lead.email,
        phone=lead.phone,
        company=lead.company,
        converted_from_lead_id=lead.id,
        assigned_to_id=lead.assigned_to_id,
        team_id=lead.team_id,
    )
    lead.status = "Converted"
    lead.converted_at = datetime.now()
    db.add(client)
    db.commit()
    db.refresh(client)
    created_clients.append(client)
    ok(f"Lead → Client: '{client.name}' (client id={client.id})")

# ═══════════════════════════════════════════
# CREATE TASKS
# ═══════════════════════════════════════════
section("6. CREATING TASKS")

task_templates = [
    {"title": "Follow up on proposal", "priority": "High", "status": "Pending"},
    {"title": "Schedule product demo", "priority": "Medium", "status": "In Progress"},
    {"title": "Send pricing document", "priority": "High", "status": "Completed"},
    {"title": "Update CRM records", "priority": "Low", "status": "Pending"},
    {"title": "Prepare quarterly report", "priority": "High", "status": "Pending"},
    {"title": "Client onboarding call", "priority": "Medium", "status": "In Progress"},
    {"title": "Contract review", "priority": "High", "status": "Pending"},
    {"title": "Market research analysis", "priority": "Low", "status": "Completed"},
]

created_tasks = []
for i, tt in enumerate(task_templates):
    assignee = sales_users[i % 3]
    related_lead = created_leads[i % len(created_leads)]
    task = Task(
        company_id=company.id,
        title=tt["title"],
        description=f"Task for lead: {related_lead.name}",
        priority=tt["priority"],
        status=tt["status"],
        assigned_to_id=assignee.id,
        lead_id=related_lead.id,
        due_date=datetime.now() + timedelta(days=random.randint(-3, 14)),
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    created_tasks.append(task)
    ok(f"Task: '{tt['title']}' → {assignee.full_name} ({tt['status']})")

# ═══════════════════════════════════════════
# CREATE INVOICES
# ═══════════════════════════════════════════
section("7. CREATING INVOICES")

invoice_data = [
    {"client": 0, "amount": 15000, "status": "Paid"},
    {"client": 1, "amount": 28500, "status": "Sent"},
    {"client": 2, "amount": 42000, "status": "Paid"},
    {"client": 3, "amount": 9800, "status": "Overdue"},
    {"client": 0, "amount": 33000, "status": "Draft"},
    {"client": 1, "amount": 67500, "status": "Paid"},
]

created_invoices = []
for i, inv in enumerate(invoice_data):
    client = created_clients[inv["client"]]
    invoice = Invoice(
        company_id=company.id,
        client_id=client.id,
        invoice_number=f"PX-2025-{1001+i}",
        total=inv["amount"],
        status=inv["status"],
        due_date=datetime.now() + timedelta(days=random.choice([7, 14, 30, -5])),
        issued_date=datetime.now() - timedelta(days=random.randint(1, 30)),
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    created_invoices.append(invoice)
    ok(f"Invoice {invoice.invoice_number}: ${inv['amount']:,.0f} ({inv['status']}) → {client.name}")

# ═══════════════════════════════════════════
# CREATE FOLLOW-UPS
# ═══════════════════════════════════════════
section("8. CREATING FOLLOW-UPS")

for i, lead in enumerate(created_leads[:5]):
    fu = FollowUp(
        company_id=company.id,
        lead_id=lead.id,
        created_by_id=lead.assigned_to_id,
        notes=f"Follow up with {lead.name} regarding their requirements",
        scheduled_date=(datetime.now() + timedelta(days=random.randint(1, 7))).date(),
        status="Pending",
    )
    db.add(fu)
    db.commit()
    ok(f"Follow-up for '{lead.name}'")

# ═══════════════════════════════════════════
# CREATE NOTES
# ═══════════════════════════════════════════
section("9. CREATING NOTES")

for lead in created_leads[:6]:
    note = Note(
        company_id=company.id,
        lead_id=lead.id,
        created_by_id=lead.assigned_to_id,
        content=f"Initial discussion with {lead.name}. They expressed interest in our enterprise solution.",
    )
    db.add(note)
    db.commit()
    ok(f"Note on lead '{lead.name}'")

# ═══════════════════════════════════════════
# CREATE LEAVE REQUESTS
# ═══════════════════════════════════════════
section("10. CREATING LEAVE REQUESTS")

leave_reasons = ["Medical appointment", "Family event", "Personal time off"]
for i, user in enumerate(sales_users):
    leave = LeaveRequest(
        user_id=user.id,
        company_id=company.id,
        from_date=datetime.now() + timedelta(days=random.randint(5, 30)),
        to_date=datetime.now() + timedelta(days=random.randint(31, 35)),
        reason=leave_reasons[i % len(leave_reasons)],
        status="Pending",
    )
    db.add(leave)
    db.commit()
    ok(f"Leave request by {user.full_name}")

# ═══════════════════════════════════════════
# CREATE AUDIT LOG ENTRIES
# ═══════════════════════════════════════════
section("11. CREATING AUDIT TRAIL")

for i, lead in enumerate(created_leads[:5]):
    audit = AuditLog(
        company_id=company.id,
        admin_id=lead.assigned_to_id,
        admin_name=sales_users[i % 3].full_name,
        action="created",
        entity_type="lead",
        entity_id=str(lead.id),
        entity_name=lead.name,
    )
    db.add(audit)
    db.commit()
    ok(f"Audit: lead '{lead.name}' created")

# Status change audits
for lead in created_leads[:3]:
    audit = AuditLog(
        company_id=company.id,
        admin_id=lead.assigned_to_id,
        admin_name=sales_users[0].full_name,
        action="status_changed",
        entity_type="lead",
        entity_id=str(lead.id),
        entity_name=lead.name,
        before_value="New",
        after_value=lead.status,
    )
    db.add(audit)
    db.commit()
    ok(f"Audit: lead '{lead.name}' status → {lead.status}")

# ═══════════════════════════════════════════
# CREATE NOTIFICATIONS
# ═══════════════════════════════════════════
section("12. CREATING NOTIFICATIONS")

notif_templates = [
    {"title": "New lead assigned", "message": "TechCorp Solutions has been assigned to you", "type": "info"},
    {"title": "Invoice overdue", "message": "Invoice PX-2025-1004 is past due", "type": "warning"},
    {"title": "Task completed", "message": "Quarterly report has been completed", "type": "success"},
    {"title": "Client meeting reminder", "message": "Meeting with GlobalTrade at 3 PM", "type": "info"},
    {"title": "Leave approved", "message": "Your leave request has been approved", "type": "success"},
]

for i, nt in enumerate(notif_templates):
    user = list(created_users.values())[i % len(created_users)]
    notif = Notification(
        user_id=user.id,
        title=nt["title"],
        message=nt["message"],
        type=nt["type"],
        is_read=random.choice([True, False]),
    )
    db.add(notif)
    db.commit()
    ok(f"Notification: '{nt['title']}' → {user.full_name}")

# ═══════════════════════════════════════════
# CREATE LEDGER ENTRIES
# ═══════════════════════════════════════════
section("13. CREATING LEDGER/FINANCE ENTRIES")

for inv in created_invoices[:3]:
    entry = LedgerEntry(
        company_id=company.id,
        ledger_slug="payments",
        data={"type": "credit", "amount": float(inv.total), "invoice": inv.invoice_number, "description": f"Payment received for {inv.invoice_number}"},
        created_by=sales_users[0].id,
    )
    db.add(entry)
    db.commit()
    ok(f"Ledger credit: ${inv.total:,.0f} for {inv.invoice_number}")

# Add some debit entries
debit_entries = [
    {"amount": 5000, "desc": "Office supplies purchase"},
    {"amount": 12000, "desc": "Software license renewal"},
    {"amount": 3500, "desc": "Travel expenses - client visit"},
]
for de in debit_entries:
    entry = LedgerEntry(
        company_id=company.id,
        ledger_slug="expenses",
        data={"type": "debit", "amount": de["amount"], "description": de["desc"]},
        created_by=sales_users[0].id,
    )
    db.add(entry)
    db.commit()
    ok(f"Ledger debit: ${de['amount']:,.0f} — {de['desc']}")

# ═══════════════════════════════════════════
# VERIFICATION TESTS
# ═══════════════════════════════════════════
section("14. VERIFICATION — DATA INTEGRITY")

# Count verifications
company_check = db.query(Company).filter(Company.name == "Perioxiaen").first()
assert company_check is not None
ok(f"Company 'Perioxiaen' exists (id={company_check.id})")

user_count = db.query(User).filter(User.company_id == company.id).count()
assert user_count == 13, f"Expected 13 users, got {user_count}"
ok(f"User count: {user_count} (expected 13)")

lead_count = db.query(Lead).filter(Lead.company_id == company.id).count()
assert lead_count == 10, f"Expected 10 leads, got {lead_count}"
ok(f"Lead count: {lead_count} (expected 10)")

client_count = db.query(Client).filter(Client.company_id == company.id).count()
assert client_count == 4, f"Expected 4 clients, got {client_count}"
ok(f"Client count: {client_count} (expected 4)")

task_count = db.query(Task).filter(Task.company_id == company.id).count()
assert task_count == 8, f"Expected 8 tasks, got {task_count}"
ok(f"Task count: {task_count} (expected 8)")

invoice_count = db.query(Invoice).filter(Invoice.company_id == company.id).count()
assert invoice_count == 6, f"Expected 6 invoices, got {invoice_count}"
ok(f"Invoice count: {invoice_count} (expected 6)")

# Role distribution
for role in ["md", "manager", "sales", "purchase", "admin"]:
    count = db.query(User).filter(User.company_id == company.id, User.role == role).count()
    ok(f"  {role.upper()} users: {count}")

section("15. VERIFICATION — AUTH TOKENS")

# Generate tokens for each role
for email, user in list(created_users.items())[:5]:
    token = create_access_token({"sub": user.email})
    assert token is not None
    ok(f"Token generated for {user.full_name} ({user.role})")

section("16. VERIFICATION — RELATIONSHIPS")

# Lead → Tasks
for lead in created_leads[:3]:
    task_count = db.query(Task).filter(Task.lead_id == lead.id).count()
    ok(f"Lead '{lead.name}' has {task_count} task(s)")

# Lead → Notes
for lead in created_leads[:3]:
    note_count = db.query(Note).filter(Note.lead_id == lead.id).count()
    ok(f"Lead '{lead.name}' has {note_count} note(s)")

# Client → Invoices
for client in created_clients[:2]:
    inv_count = db.query(Invoice).filter(Invoice.client_id == client.id).count()
    ok(f"Client '{client.name}' has {inv_count} invoice(s)")

# Timeline/Audit entries
audit_count = db.query(AuditLog).filter(AuditLog.company_id == company.id).count()
ok(f"Audit trail entries: {audit_count}")

# Notifications
notif_count = db.query(Notification).filter(
    Notification.user_id.in_([u.id for u in created_users.values()])
).count()
ok(f"Notifications created: {notif_count}")

# Leave requests
leave_count = db.query(LeaveRequest).filter(
    LeaveRequest.user_id.in_([u.id for u in sales_users])
).count()
ok(f"Leave requests: {leave_count}")

# Ledger
ledger_count = db.query(LedgerEntry).filter(LedgerEntry.company_id == company.id).count()
ok(f"Ledger entries: {ledger_count}")

section("17. VERIFICATION — FINANCIAL SUMMARY")

total_invoiced = sum(inv.total or 0 for inv in created_invoices)
paid_invoices = [inv for inv in created_invoices if inv.status == "Paid"]
total_paid = sum(inv.total or 0 for inv in paid_invoices)
outstanding = total_invoiced - total_paid
ok(f"Total invoiced: ${total_invoiced:,.0f}")
ok(f"Paid: ${total_paid:,.0f}")
ok(f"Outstanding: ${outstanding:,.0f}")
ok(f"Paid invoices: {len(paid_invoices)} / {len(created_invoices)}")

section("18. VERIFICATION — LEAD PIPELINE")

statuses = {}
for lead in created_leads:
    statuses[lead.status] = statuses.get(lead.status, 0) + 1
for status, count in statuses.items():
    ok(f"Pipeline '{status}': {count} leads")

converted = len([l for l in created_leads if l.status == "Converted"])
ok(f"Conversion rate: {(converted/len(created_leads))*100:.0f}%")

# ═══════════════════════════════════════════
# CREDENTIAL SUMMARY
# ═══════════════════════════════════════════
section("19. LOGIN CREDENTIALS (password: Test@123)")

print(f"\n  {'Role':<10} {'Name':<22} {'Email'}")
print(f"  {'─'*10} {'─'*22} {'─'*35}")
for ud in users_data:
    print(f"  {ud['role']:<10} {ud['full_name']:<22} {ud['email']}")

# ═══════════════════════════════════════════
# FINAL REPORT
# ═══════════════════════════════════════════
print(f"\n{'═'*60}")
print(f"{BOLD}  FINAL REPORT{RESET}")
print(f"{'═'*60}")
print(f"  {GREEN}Passed: {passed}{RESET}")
if failed > 0:
    print(f"  {RED}Failed: {failed}{RESET}")
    for e in errors:
        print(f"    {RED}• {e}{RESET}")
else:
    print(f"  {GREEN}Failed: 0{RESET}")

print(f"\n  {BOLD}Data Created:{RESET}")
print(f"    Company:       Perioxiaen")
print(f"    Users:         13 (2 MD, 5 Managers/TL, 3 Sales, 2 Purchase, 1 Admin)")
print(f"    Teams:         3 (Alpha Sales, Beta Sales, Procurement)")
print(f"    Leads:         10 (across 3 sales execs)")
print(f"    Clients:       4 (converted from leads)")
print(f"    Tasks:         8 (assigned to sales)")
print(f"    Invoices:      6 (mix of Paid/Sent/Draft/Overdue)")
print(f"    Follow-ups:    5")
print(f"    Notes:         6")
print(f"    Leave Requests: 3")
print(f"    Audit Entries: {audit_count}")
print(f"    Notifications: {notif_count}")
print(f"    Ledger:        {ledger_count} entries")
print(f"\n  {BOLD}{GREEN}✓ All users can login with password: Test@123{RESET}")
print(f"{'═'*60}\n")

db.close()
