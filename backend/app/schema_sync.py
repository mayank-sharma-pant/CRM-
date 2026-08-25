"""Idempotent schema apply: create_all + missing columns + RLS.

Importing this module does not touch the database.
"""
from sqlalchemy import inspect, text

from app.database import Base

MISSING_COLUMNS = [
    ("companies", "trial_ends_at", "TIMESTAMP WITH TIME ZONE"),
    ("documents", "file_size", "INTEGER DEFAULT 0"),
    ("invoices", "payment_url", "VARCHAR(500)"),
    ("follow_ups", "channel", "VARCHAR(20)"),
    ("leads", "deleted_at", "TIMESTAMP"),
    ("tasks", "reminded_at", "TIMESTAMP"),
    ("follow_ups", "reminded_at", "TIMESTAMP"),
    ("users", "totp_secret", "VARCHAR(255)"),
    ("users", "totp_enabled", "BOOLEAN DEFAULT FALSE"),
    ("users", "totp_confirmed_at", "TIMESTAMP WITH TIME ZONE"),
    ("companies", "require_2fa", "BOOLEAN DEFAULT FALSE"),
    ("plans", "max_api_requests_per_day", "INTEGER"),
    ("clients", "gstin", "VARCHAR(15)"),
    ("invoices", "cgst", "NUMERIC(12,2) DEFAULT 0"),
    ("invoices", "sgst", "NUMERIC(12,2) DEFAULT 0"),
    ("invoices", "igst", "NUMERIC(12,2) DEFAULT 0"),
    ("invoices", "seller_gstin", "VARCHAR(15)"),
    ("invoices", "buyer_gstin", "VARCHAR(15)"),
    ("invoices", "place_of_supply", "VARCHAR(2)"),
    ("invoices", "tax_mode", "VARCHAR(10)"),
    ("invoice_items", "hsn", "VARCHAR(20)"),
    ("company_settings", "whatsapp_api_key", "VARCHAR(255)"),
    ("company_settings", "whatsapp_source", "VARCHAR(20)"),
    ("quotes", "cgst", "NUMERIC(12,2) DEFAULT 0"),
    ("quotes", "sgst", "NUMERIC(12,2) DEFAULT 0"),
    ("quotes", "igst", "NUMERIC(12,2) DEFAULT 0"),
    ("quotes", "seller_gstin", "VARCHAR(15)"),
    ("quotes", "buyer_gstin", "VARCHAR(15)"),
    ("quotes", "place_of_supply", "VARCHAR(2)"),
    ("quotes", "tax_mode", "VARCHAR(10)"),
    ("quote_items", "product_id", "INTEGER"),
    ("quote_items", "hsn", "VARCHAR(20)"),
    ("quote_items", "tax_rate", "NUMERIC(5,2)"),
    ("quote_items", "tax", "NUMERIC(12,2) DEFAULT 0"),
    ("invoice_items", "product_id", "INTEGER"),
    ("invoice_items", "tax_rate", "NUMERIC(5,2)"),
    ("invoice_items", "tax", "NUMERIC(12,2) DEFAULT 0"),
    ("pipelines", "blueprint_enabled", "BOOLEAN DEFAULT FALSE"),
    ("pipeline_stages", "required_fields", "TEXT"),
    ("invoices", "share_token_hash", "VARCHAR(64)"),
    ("invoices", "share_created_at", "TIMESTAMP"),
    ("quotes", "share_token_hash", "VARCHAR(64)"),
    ("quotes", "share_created_at", "TIMESTAMP"),
    ("companies", "is_sandbox", "BOOLEAN DEFAULT FALSE"),
    ("companies", "sandbox_parent_id", "INTEGER"),
    ("email_logs", "deal_id", "INTEGER"),
    ("email_logs", "direction", "VARCHAR(10) DEFAULT 'outbound'"),
    ("email_logs", "provider", "VARCHAR(20) DEFAULT 'smtp'"),
    ("email_logs", "provider_message_id", "VARCHAR(255)"),
    ("email_logs", "from_email", "VARCHAR(255)"),
    ("meetings", "calendar_event_id", "VARCHAR(255)"),
    ("meetings", "calendar_provider", "VARCHAR(32)"),
    ("company_settings", "exotel_sid", "VARCHAR(64)"),
    ("company_settings", "exotel_api_key", "VARCHAR(64)"),
    ("company_settings", "exotel_api_token_encrypted", "TEXT"),
    ("company_settings", "exotel_subdomain", "VARCHAR(255)"),
    ("company_settings", "exotel_caller_id", "VARCHAR(20)"),
    ("call_logs", "provider", "VARCHAR(20)"),
    ("call_logs", "provider_call_id", "VARCHAR(64)"),
    ("call_logs", "from_phone", "VARCHAR(20)"),
    ("call_logs", "to_phone", "VARCHAR(20)"),
    ("whatsapp_messages", "from_phone", "VARCHAR(20)"),
    ("whatsapp_messages", "direction", "VARCHAR(10) DEFAULT 'outbound'"),
    ("whatsapp_messages", "body", "TEXT"),
    ("whatsapp_messages", "provider_message_id", "VARCHAR(255)"),
    ("whatsapp_messages", "session_expires_at", "TIMESTAMP"),
    ("company_settings", "whatsapp_cadence_template_id", "INTEGER"),
    ("company_settings", "onboarding_dismissed", "INTEGER DEFAULT 0"),
    ("clients", "account_id", "INTEGER"),
    ("invoices", "irn", "VARCHAR(64)"),
    ("invoices", "ack_no", "VARCHAR(32)"),
    ("invoices", "ack_date", "TIMESTAMP"),
    ("invoices", "signed_qr", "VARCHAR(64)"),
    ("company_settings", "retention_days", "INTEGER"),
    ("leads", "website", "VARCHAR(500)"),
    ("leads", "industry", "VARCHAR(100)"),
    ("leads", "linkedin_url", "VARCHAR(500)"),
    ("leads", "enriched_at", "TIMESTAMP"),
    ("leads", "enrichment_source", "VARCHAR(32)"),
    ("accounts", "industry", "VARCHAR(100)"),
    ("accounts", "linkedin_url", "VARCHAR(500)"),
    ("accounts", "enriched_at", "TIMESTAMP"),
    ("accounts", "enrichment_source", "VARCHAR(32)"),
]


def _load_models() -> None:
    import app.models.billing  # noqa: F401
    import app.models.core  # noqa: F401
    import app.models.finance  # noqa: F401
    import app.models.hr  # noqa: F401
    import app.models.ops  # noqa: F401
    import app.models.sales  # noqa: F401


def add_missing_columns(bind):
    """Idempotently add columns from MISSING_COLUMNS if absent. SQLite and Postgres."""
    inspector = inspect(bind)
    existing_tables = set(inspector.get_table_names())
    engine = bind.engine if hasattr(bind, "engine") else bind

    def apply(conn):
        for table, column, ddl_type in MISSING_COLUMNS:
            if table not in existing_tables:
                continue
            existing_columns = {c["name"] for c in inspect(conn).get_columns(table)}
            if column in existing_columns:
                continue
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl_type}"))
            print(f"Added missing column: {table}.{column}")

    if bind is engine:
        with engine.begin() as conn:
            apply(conn)
    else:
        apply(bind)


def apply_schema(bind) -> int:
    """create_all, missing columns, RLS. Returns RLS table count (0 on SQLite)."""
    _load_models()
    Base.metadata.create_all(bind=bind)
    add_missing_columns(bind)
    from app.tenancy import enable_rls
    engine = bind.engine if hasattr(bind, "engine") else bind
    return enable_rls(engine)
