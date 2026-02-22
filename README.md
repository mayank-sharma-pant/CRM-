# Multi-Tenant SaaS CRM Platform

A production-grade, multi-tenant CRM system built for service businesses, agencies, and teams. Features company-level isolation, role-based access, financial ledgers, and a platform admin layer for managing tenants.

## Tech Stack

### Frontend
- **Next.js 16** (React 19, App Router)
- **Tailwind CSS** (utility-first styling)
- **Axios** (API client)
- **Recharts** (data visualization)
- **Lucide React** (icons)
- **date-fns** (date formatting)

### Backend
- **Python / FastAPI** (async REST API)
- **SQLAlchemy 2.x** (ORM)
- **Alembic** (database migrations)
- **PostgreSQL** (primary database)
- **JWT** (authentication via python-jose)
- **Pydantic** (request/response validation)

## Project Structure

```
CRM-/
├── backend/                # FastAPI application
│   ├── app/
│   │   ├── main.py         # App entry point, router registration
│   │   ├── config.py       # Settings (env-driven)
│   │   ├── database.py     # SQLAlchemy engine & session
│   │   ├── models/         # ORM models (16 tables)
│   │   ├── routers/        # API route handlers (13 routers, 118+ endpoints)
│   │   ├── schemas/        # Pydantic validation models
│   │   └── utils/          # Auth dependencies, security helpers
│   ├── alembic/            # Migration scripts
│   └── requirements.txt
├── frontend/               # Next.js application
│   ├── app/                # App Router pages (62 pages across 6 roles)
│   ├── contexts/           # React context (AuthContext)
│   └── services/           # API client (axios)
├── database/               # SQL schema & docs
└── docker-compose.yml
```

## Roles & Modules

| Role | Dashboard | Leads | Tasks | Clients | Follow-ups | Invoices | Ledgers | Monitoring | Admin |
|------|:---------:|:-----:|:-----:|:-------:|:----------:|:--------:|:-------:|:----------:|:-----:|
| Sales | ✓ | ✓ | ✓ | ✓ | ✓ | — | Partial | — | — |
| Manager | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| MD | ✓ | ✓ | — | ✓ | — | ✓ | View | ✓ | — |
| Purchase | ✓ | — | — | — | — | ✓ | Partial | ✓ | — |
| Company Admin | — | — | — | — | — | — | — | — | ✓ |
| Platform Admin | ✓ | — | — | — | — | — | — | — | ✓ |

## Getting Started

### Prerequisites
- Python 3.11+
- PostgreSQL 14+
- Node.js 18+ / npm

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Linux/Mac
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env: set DATABASE_URL, generate SECRET_KEY (python -c "import secrets; print(secrets.token_urlsafe(48))")

# Create database and run migrations
createdb local_service_crm
alembic upgrade head

# Start server (development only — do not use in production)
uvicorn app.main:app --reload --port 8000
```

**Production (e.g. AWS EC2):** Do not use `uvicorn --reload`. Use Gunicorn with Uvicorn workers; see [backend/README.md](backend/README.md#production-aws-ec2) for the production command and optional systemd example.

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
# Open http://localhost:3000
```

### Environment Variables (backend/.env)

```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/local_service_crm
SECRET_KEY=<generate with: python -c "import secrets; print(secrets.token_urlsafe(48))">
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

## Multi-Tenancy

Every business entity (leads, clients, tasks, invoices, etc.) is scoped by `company_id`. Key behaviors:

- **Signup** creates a new company with `status=pending`
- **Platform Admin** must approve the company before users can log in
- **Company Admin** manages users, teams, roles, and invites within their company
- **Platform Admin** (`role=admin`, `company_id=NULL`) can view all companies but cannot perform CRM operations
- Cross-company data access returns 404 (not 403) to prevent enumeration

## API Documentation

Start the backend and visit: **http://localhost:8000/docs** (Swagger UI)

## Database Migrations

```bash
cd backend

# Apply all migrations
alembic upgrade head

# Create a new migration after model changes
alembic revision --autogenerate -m "description"
```

Migration chain: `001_initial` → `002_company` → `003_leaves` → `004_notes_company` → `005_invoice_items_company`

## License

MIT
