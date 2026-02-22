# Database

The **live database schema** for this CRM is **not** in this folder. It is defined by:

- **SQLAlchemy models**: `backend/app/models/*.py`
- **Migrations**: `backend/alembic/versions/`

**Never used PostgreSQL?** → See **[POSTGRESQL.md](POSTGRESQL.md)** for step-by-step install, create database, set password, and connect this app.

## Do not use `schema.sql` for the application

The file `schema.sql` in this folder is **legacy**. It describes an old design (UUIDs, `businesses` table, different columns) and does **not** match the current FastAPI backend. Running it would create the wrong schema and break the app.

**To set up or update the database, use Alembic from the backend.** See the root README or **Database setup** below.

## Database setup (correct way)

1. **Create the database** (if using PostgreSQL):
   ```bash
   createdb local_service_crm
   # or via psql: CREATE DATABASE local_service_crm;
   ```

2. **Configure backend**:
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env and set DATABASE_URL, e.g.:
   # DATABASE_URL=postgresql://user:password@localhost:5432/local_service_crm
   # Or for SQLite (default): DATABASE_URL=sqlite:///./crm.db
   ```

3. **Install backend deps and run migrations**:
   ```bash
   cd backend
   pip install -r requirements.txt
   alembic upgrade head
   ```

4. **Start the backend** (development only; uses the same `DATABASE_URL`. For production use Gunicorn — see backend README):
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

Alembic reads `DATABASE_URL` from your `.env` (via `app.config`), so the app and migrations always use the same database.
