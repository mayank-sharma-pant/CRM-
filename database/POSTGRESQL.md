# Using PostgreSQL with this CRM (step-by-step)

This guide assumes you’ve never used PostgreSQL. Follow the steps in order.

---

## What is PostgreSQL?

PostgreSQL is a **database server**: it stores your app’s data (users, leads, clients, etc.) and keeps it safe. Your FastAPI backend connects to it using a connection string (`DATABASE_URL`). You don’t “open” PostgreSQL like a file; the app talks to it over the network (or locally).

---

## Step 1: Install PostgreSQL

### On Arch Linux
```bash
sudo pacman -S postgresql
```

### On Ubuntu / Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

### On macOS (Homebrew)
```bash
brew install postgresql@16
brew services start postgresql@16
```

### On Windows
- Download the installer from: https://www.postgresql.org/download/windows/
- Run it and use the default port **5432**. Remember the password you set for the `postgres` user.

---

## Step 2: Start the PostgreSQL service

PostgreSQL runs as a background service. It must be running before the app can connect.

### Arch Linux
```bash
sudo systemctl start postgresql
# Optional: start automatically on boot
sudo systemctl enable postgresql
```

### Ubuntu / Debian
```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### macOS (if not already started)
```bash
brew services start postgresql@16
```

### Windows
- PostgreSQL usually runs as a Windows service after install. Check “Services” for “postgresql”.

**Check that it’s running:**  
Open a terminal and run:
```bash
# Linux/macOS: try connecting with the default superuser
sudo -u postgres psql -c "SELECT 1"
# If you see a number 1, PostgreSQL is running.
```

---

## Step 3: Create a database and (optional) a user

You need at least one **database** for the CRM. You can use the default superuser `postgres`, or create a dedicated user and database (recommended for clarity).

### Option A: Use the default `postgres` user (simplest)

1. Switch to the system user that runs PostgreSQL and open its SQL prompt:
   ```bash
   sudo -u postgres psql
   ```
   You should see a prompt like: `postgres=#`

2. Create a database for the CRM:
   ```sql
   CREATE DATABASE local_service_crm;
   ```
   You should see: `CREATE DATABASE`

3. (Optional) Set a password for the `postgres` user so you can use it in `.env`:
   ```sql
   ALTER USER postgres PASSWORD 'your_password_here';
   ```
   Replace `your_password_here` with a real password.

4. Exit:
   ```sql
   \q
   ```

Your connection details will be:
- **User:** `postgres`
- **Password:** the one you set (or empty if you didn’t set one)
- **Database:** `local_service_crm`
- **Host:** `localhost`
- **Port:** `5432`

### Option B: Create a dedicated user and database (recommended)

1. Open the PostgreSQL prompt as the superuser:
   ```bash
   sudo -u postgres psql
   ```

2. Create a user and a database owned by that user:
   ```sql
   CREATE USER crm_user WITH PASSWORD 'choose_a_strong_password';
   CREATE DATABASE local_service_crm OWNER crm_user;
   ```
   Replace `choose_a_strong_password` with a real password.

3. Allow the user to connect (usually already allowed on localhost):
   ```sql
   GRANT ALL PRIVILEGES ON DATABASE local_service_crm TO crm_user;
   \q
   ```

Your connection details will be:
- **User:** `crm_user`
- **Password:** the one you chose
- **Database:** `local_service_crm`
- **Host:** `localhost`
- **Port:** `5432`

---

## Step 4: Set the connection string in the project

The backend connects to PostgreSQL using a single URL: **DATABASE_URL**.

1. Go to the backend folder and copy the example env file:
   ```bash
   cd backend
   cp .env.example .env
   ```

2. Open `.env` in an editor and set `DATABASE_URL` using this pattern:
   ```text
   postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE_NAME
   ```

   **If you used Option A (postgres user):**
   ```env
   DATABASE_URL=postgresql://postgres:your_password_here@localhost:5432/local_service_crm
   ```

   **If you used Option B (crm_user):**
   ```env
   DATABASE_URL=postgresql://crm_user:choose_a_strong_password@localhost:5432/local_service_crm
   ```

   Notes:
   - If the password has special characters (e.g. `#`, `@`, `%`), URL-encode them (e.g. `%40` for `@`).
   - No spaces around `=`.
   - Database name must be exactly what you created (e.g. `local_service_crm`).

3. Save the file.

---

## Step 5: Install Python deps and create tables (migrations)

The app’s tables (users, leads, clients, etc.) are created by **Alembic migrations**, not by hand in PostgreSQL.

1. From the **backend** folder (where `requirements.txt` and `alembic.ini` are):
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. Run all migrations so the database gets all tables:
   ```bash
   alembic upgrade head
   ```
   You should see something like: `INFO  [alembic.runtime.migration] Running upgrade  -> 001_initial, Initial schema from SQLAlchemy models`

3. Start the backend (development only; for production use Gunicorn — see backend README):
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   If it starts without errors, the app is now using PostgreSQL.

---

## Step 6: Verify data in PostgreSQL (optional)

You can open the database and run SQL to confirm tables and data.

1. Connect with the same user that the app uses.

   **If using `postgres` user:**
   ```bash
   sudo -u postgres psql -d local_service_crm
   ```
   Or, if you set a password and have `psql` in PATH:
   ```bash
   psql -U postgres -d local_service_crm -h localhost
   ```
   (It will ask for the password.)

   **If using `crm_user`:**
   ```bash
   psql -U crm_user -d local_service_crm -h localhost
   ```
   Enter the password when asked.

2. Useful commands inside `psql`:

   - List all tables:
     ```sql
     \dt
     ```
     You should see: `users`, `teams`, `leads`, `clients`, `invoices`, `ledger_entries`, etc.

   - Count rows in a table (e.g. users):
     ```sql
     SELECT COUNT(*) FROM users;
     ```

   - Exit:
     ```sql
     \q
     ```

---

## Quick reference

| What you want to do        | Command / action |
|---------------------------|------------------|
| Start PostgreSQL (Arch)   | `sudo systemctl start postgresql` |
| Create DB (as postgres)    | `sudo -u postgres psql` then `CREATE DATABASE local_service_crm;` |
| Set DATABASE_URL           | In `backend/.env`: `DATABASE_URL=postgresql://user:pass@localhost:5432/local_service_crm` |
| Create tables              | `cd backend && alembic upgrade head` |
| Open DB in terminal        | `psql -U postgres -d local_service_crm -h localhost` (or with your user) |
| List tables in psql        | `\dt` |
| Quit psql                  | `\q` |

---

## Troubleshooting

- **“connection refused” or “could not connect”**  
  PostgreSQL is not running. Start it (Step 2) and try again.

- **“password authentication failed”**  
  Check the user and password in `DATABASE_URL`. For local `postgres` user, you may need to set a password (Step 3 Option A) or adjust `pg_hba.conf` (advanced).

- **“database does not exist”**  
  Create the database (Step 3) and use that exact name in `DATABASE_URL`.

- **“relation … does not exist”**  
  Migrations weren’t run. From `backend` run: `alembic upgrade head`.

- **Special characters in password**  
  URL-encode them in `DATABASE_URL` (e.g. `@` → `%40`, `#` → `%23`).

---

For a short recap without PostgreSQL basics, see [README.md](README.md) in this folder.
