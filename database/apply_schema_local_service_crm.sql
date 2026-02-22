-- Apply full schema to local_service_crm (001_initial + 002_company)
-- Run: sudo -u postgres psql -d local_service_crm -f /home/mayank/CRM-/database/apply_schema_local_service_crm.sql

BEGIN;

-- ========== 001: Initial schema ==========

CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT (CURRENT_TIMESTAMP),
    updated_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ix_teams_id ON teams(id);
CREATE UNIQUE INDEX IF NOT EXISTS ix_teams_name ON teams(name);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'sales',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    team_id INTEGER REFERENCES teams(id),
    manager_id INTEGER REFERENCES users(id),
    phone VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    last_active_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT (CURRENT_TIMESTAMP),
    updated_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ix_users_email ON users(email);
CREATE INDEX IF NOT EXISTS ix_users_id ON users(id);

CREATE TABLE IF NOT EXISTS company_settings (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL DEFAULT 'Company Name',
    address TEXT,
    gst_number VARCHAR(50),
    logo_url VARCHAR(500),
    invoice_prefix VARCHAR(20) DEFAULT 'INV',
    tax_rate FLOAT DEFAULT 18.0,
    payment_terms VARCHAR(50) DEFAULT 'Net 30 days',
    lead_stages TEXT DEFAULT '["New", "Contacted", "Qualified", "Proposal", "Won", "Lost"]',
    lost_reasons TEXT DEFAULT '["No budget", "Timing not right", "Competitor", "No response"]',
    task_reminders_enabled INTEGER DEFAULT 1,
    followup_alerts_enabled INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS ix_company_settings_id ON company_settings(id);

CREATE TABLE IF NOT EXISTS leads (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    company VARCHAR(255),
    status VARCHAR(50) DEFAULT 'New',
    source VARCHAR(100),
    service_type VARCHAR(100),
    notes TEXT,
    assigned_to_id INTEGER REFERENCES users(id),
    team_id INTEGER REFERENCES teams(id),
    last_contacted_at TIMESTAMP,
    last_response_at TIMESTAMP,
    next_follow_up TIMESTAMP,
    converted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP),
    updated_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP)
);
CREATE INDEX IF NOT EXISTS ix_leads_id ON leads(id);

CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    company VARCHAR(255),
    address TEXT,
    assigned_to_id INTEGER REFERENCES users(id),
    team_id INTEGER REFERENCES teams(id),
    converted_from_lead_id INTEGER REFERENCES leads(id),
    created_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP),
    updated_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP)
);
CREATE INDEX IF NOT EXISTS ix_clients_id ON clients(id);

CREATE TABLE IF NOT EXISTS follow_ups (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER NOT NULL REFERENCES leads(id),
    scheduled_date DATE NOT NULL,
    scheduled_time TIME,
    status VARCHAR(50) DEFAULT 'Pending',
    outcome TEXT,
    notes TEXT,
    completed_at TIMESTAMP,
    created_by_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP),
    updated_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP)
);
CREATE INDEX IF NOT EXISTS ix_follow_ups_id ON follow_ups(id);

CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'Pending',
    priority VARCHAR(20) DEFAULT 'medium',
    due_date TIMESTAMP,
    completed_at TIMESTAMP,
    lead_id INTEGER REFERENCES leads(id),
    client_id INTEGER REFERENCES clients(id),
    assigned_to_id INTEGER REFERENCES users(id),
    assigned_by_id INTEGER REFERENCES users(id),
    is_manager_assigned BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP),
    updated_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP)
);
CREATE INDEX IF NOT EXISTS ix_tasks_id ON tasks(id);

CREATE TABLE IF NOT EXISTS notes (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    lead_id INTEGER REFERENCES leads(id),
    client_id INTEGER REFERENCES clients(id),
    created_by_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP),
    updated_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP)
);
CREATE INDEX IF NOT EXISTS ix_notes_id ON notes(id);

CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    client_id INTEGER NOT NULL REFERENCES clients(id),
    subtotal FLOAT DEFAULT 0.0,
    tax FLOAT DEFAULT 0.0,
    discount FLOAT DEFAULT 0.0,
    total FLOAT DEFAULT 0.0,
    status VARCHAR(50) DEFAULT 'Draft',
    issued_date DATE,
    due_date DATE,
    paid_date DATE,
    payment_method VARCHAR(50),
    payment_reference VARCHAR(100),
    notes TEXT,
    created_by_id INTEGER REFERENCES users(id),
    approved_by_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP),
    updated_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP)
);
CREATE INDEX IF NOT EXISTS ix_invoices_id ON invoices(id);
CREATE UNIQUE INDEX IF NOT EXISTS ix_invoices_invoice_number ON invoices(invoice_number);

CREATE TABLE IF NOT EXISTS invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id),
    description VARCHAR(255) NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price FLOAT DEFAULT 0.0,
    total FLOAT DEFAULT 0.0
);
CREATE INDEX IF NOT EXISTS ix_invoice_items_id ON invoice_items(id);

CREATE TABLE IF NOT EXISTS ledger_entries (
    id SERIAL PRIMARY KEY,
    ledger_slug VARCHAR NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP),
    created_by INTEGER REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS ix_ledger_entries_id ON ledger_entries(id);
CREATE INDEX IF NOT EXISTS ix_ledger_entries_ledger_slug ON ledger_entries(ledger_slug);

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT (CURRENT_TIMESTAMP),
    admin_id INTEGER REFERENCES users(id),
    admin_name VARCHAR(255) NOT NULL DEFAULT 'System',
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(50),
    entity_name VARCHAR(255),
    before_value TEXT,
    after_value TEXT
);
CREATE INDEX IF NOT EXISTS ix_audit_logs_id ON audit_logs(id);
CREATE INDEX IF NOT EXISTS ix_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS ix_audit_logs_timestamp ON audit_logs(timestamp);

CREATE TABLE IF NOT EXISTS invites (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role VARCHAR(50) NOT NULL,
    team_id INTEGER REFERENCES teams(id),
    manager_id INTEGER REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'pending',
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT (CURRENT_TIMESTAMP),
    created_by_id INTEGER REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS ix_invites_id ON invites(id);
CREATE INDEX IF NOT EXISTS ix_invites_email ON invites(email);
CREATE INDEX IF NOT EXISTS ix_invites_status ON invites(status);
CREATE UNIQUE INDEX IF NOT EXISTS ix_invites_token ON invites(token);

-- ========== 002: Multi-tenant (company) ==========

CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    plan VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT (CURRENT_TIMESTAMP),
    updated_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ix_companies_id ON companies(id);
CREATE INDEX IF NOT EXISTS ix_companies_status ON companies(status);

INSERT INTO companies (id, name, status, plan) VALUES (1, 'Default Company', 'active', 'pro')
ON CONFLICT DO NOTHING;

-- Add company_id columns (ignore if already exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='company_id') THEN
        ALTER TABLE users ADD COLUMN company_id INTEGER REFERENCES companies(id);
        CREATE INDEX ix_users_company_id ON users(company_id);
        UPDATE users SET company_id = 1 WHERE company_id IS NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='teams' AND column_name='company_id') THEN
        ALTER TABLE teams ADD COLUMN company_id INTEGER REFERENCES companies(id);
        UPDATE teams SET company_id = 1 WHERE company_id IS NULL;
        ALTER TABLE teams ALTER COLUMN company_id SET NOT NULL;
        CREATE INDEX ix_teams_company_id ON teams(company_id);
        DROP INDEX IF EXISTS ix_teams_name;
        CREATE UNIQUE INDEX ix_teams_company_name ON teams(company_id, name);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='company_id') THEN
        ALTER TABLE leads ADD COLUMN company_id INTEGER REFERENCES companies(id);
        UPDATE leads SET company_id = 1 WHERE company_id IS NULL;
        ALTER TABLE leads ALTER COLUMN company_id SET NOT NULL;
        CREATE INDEX ix_leads_company_id ON leads(company_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='company_id') THEN
        ALTER TABLE clients ADD COLUMN company_id INTEGER REFERENCES companies(id);
        UPDATE clients SET company_id = 1 WHERE company_id IS NULL;
        ALTER TABLE clients ALTER COLUMN company_id SET NOT NULL;
        CREATE INDEX ix_clients_company_id ON clients(company_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='follow_ups' AND column_name='company_id') THEN
        ALTER TABLE follow_ups ADD COLUMN company_id INTEGER REFERENCES companies(id);
        UPDATE follow_ups SET company_id = 1 WHERE company_id IS NULL;
        ALTER TABLE follow_ups ALTER COLUMN company_id SET NOT NULL;
        CREATE INDEX ix_follow_ups_company_id ON follow_ups(company_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='company_id') THEN
        ALTER TABLE tasks ADD COLUMN company_id INTEGER REFERENCES companies(id);
        UPDATE tasks SET company_id = 1 WHERE company_id IS NULL;
        ALTER TABLE tasks ALTER COLUMN company_id SET NOT NULL;
        CREATE INDEX ix_tasks_company_id ON tasks(company_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ledger_entries' AND column_name='company_id') THEN
        ALTER TABLE ledger_entries ADD COLUMN company_id INTEGER REFERENCES companies(id);
        UPDATE ledger_entries SET company_id = 1 WHERE company_id IS NULL;
        ALTER TABLE ledger_entries ALTER COLUMN company_id SET NOT NULL;
        CREATE INDEX ix_ledger_entries_company_id ON ledger_entries(company_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='company_id') THEN
        ALTER TABLE invoices ADD COLUMN company_id INTEGER REFERENCES companies(id);
        UPDATE invoices SET company_id = 1 WHERE company_id IS NULL;
        ALTER TABLE invoices ALTER COLUMN company_id SET NOT NULL;
        CREATE INDEX ix_invoices_company_id ON invoices(company_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invites' AND column_name='company_id') THEN
        ALTER TABLE invites ADD COLUMN company_id INTEGER REFERENCES companies(id);
        UPDATE invites SET company_id = 1 WHERE company_id IS NULL;
        ALTER TABLE invites ALTER COLUMN company_id SET NOT NULL;
        CREATE INDEX ix_invites_company_id ON invites(company_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_settings' AND column_name='company_id') THEN
        ALTER TABLE company_settings ADD COLUMN company_id INTEGER REFERENCES companies(id);
        UPDATE company_settings SET company_id = 1 WHERE company_id IS NULL;
        ALTER TABLE company_settings ALTER COLUMN company_id SET NOT NULL;
        CREATE INDEX ix_company_settings_company_id ON company_settings(company_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='company_id') THEN
        ALTER TABLE audit_logs ADD COLUMN company_id INTEGER REFERENCES companies(id);
        UPDATE audit_logs SET company_id = 1 WHERE company_id IS NULL;
        CREATE INDEX ix_audit_logs_company_id ON audit_logs(company_id);
    END IF;
END $$;

-- ========== 003: leave requests ==========
CREATE TABLE IF NOT EXISTS leave_requests (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    from_date TIMESTAMPTZ NOT NULL,
    to_date TIMESTAMPTZ NOT NULL,
    reason VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'Pending',
    approved_by_id INTEGER REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT (CURRENT_TIMESTAMP),
    updated_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ix_leave_requests_id ON leave_requests(id);
CREATE INDEX IF NOT EXISTS ix_leave_requests_company_id ON leave_requests(company_id);
CREATE INDEX IF NOT EXISTS ix_leave_requests_user_id ON leave_requests(user_id);
CREATE INDEX IF NOT EXISTS ix_leave_requests_status ON leave_requests(status);

-- Alembic version table (so "alembic upgrade head" is a no-op if you run Python later)
CREATE TABLE IF NOT EXISTS alembic_version (
    version_num VARCHAR(32) NOT NULL PRIMARY KEY
);
DELETE FROM alembic_version;
INSERT INTO alembic_version (version_num) VALUES ('003_leaves');

COMMIT;
