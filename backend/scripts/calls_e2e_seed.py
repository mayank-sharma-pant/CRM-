"""Seed users for the two-browser voice-call check (frontend/e2e/manual/calls-two-browsers.cjs).

Only runs against a LOCAL database whose name ends in _test (migrated to head). Creates company
"Calls E2E Co" (code CLX) with caller/callee/third@calls-e2e.test and two direct chats.

  cd backend && E2E_PW=... DATABASE_URL=postgresql://localhost:5432/crm_chat_test \
      venv/bin/python scripts/calls_e2e_seed.py
"""
import os
import sys

from sqlalchemy.engine import make_url

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.config import settings  # noqa: E402

url = make_url(settings.get_database_url())
if url.host not in ("localhost", "127.0.0.1") or not (url.database or "").endswith("_test"):
    sys.exit("refusing: DATABASE_URL must be a local *_test database")
from app.database import SessionLocal  # noqa: E402
from app.models.core.company import Company  # noqa: E402
from app.models.core.user import User  # noqa: E402
from app.services.chat import service  # noqa: E402
from app.utils.security import get_password_hash  # noqa: E402
from app.tenancy import bind_tenant  # noqa: E402

pw = os.environ["E2E_PW"]
db = SessionLocal()
bind_tenant(bypass=True, db=db)
company = db.query(Company).filter(Company.company_code == "CLX").first()
if company is None:
    company = Company(name="Calls E2E Co", company_code="CLX", status="active")
    db.add(company); db.flush()
users = {}
for key, role in (("caller", "sales"), ("callee", "md"), ("third", "manager")):
    email = f"{key}@calls-e2e.test"
    u = db.query(User).filter(User.email == email).first()
    if u is None:
        u = User(email=email, full_name=f"E2E {key.title()}", role=role, company_id=company.id, status="active", is_active=True, hashed_password=get_password_hash(pw))
        db.add(u)
    else:
        u.hashed_password = get_password_hash(pw); u.is_active = True; u.token_version = 0
    db.flush(); users[key] = u
db.commit()
for a, b in (("caller", "callee"), ("third", "callee")):
    service.get_or_create_direct(db, users[a], users[b].id)
print("seeded company", company.id, "users", {k: v.id for k, v in users.items()})
