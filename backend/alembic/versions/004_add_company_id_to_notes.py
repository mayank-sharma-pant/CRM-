"""Add company_id to notes table for multi-tenant isolation

Revision ID: 004_notes_company
Revises: 003_leaves
Create Date: 2026-02-22
"""
from alembic import op
import sqlalchemy as sa

revision = "004_notes_company"
down_revision = "003_leaves"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("notes", sa.Column("company_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_notes_company_id", "notes", "companies", ["company_id"], ["id"]
    )
    op.create_index("ix_notes_company_id", "notes", ["company_id"])
    op.create_index("ix_notes_lead_id", "notes", ["lead_id"])
    op.create_index("ix_notes_client_id", "notes", ["client_id"])

    # Backfill: derive company_id from the parent lead or client
    op.execute("""
        UPDATE notes SET company_id = leads.company_id
        FROM leads WHERE notes.lead_id = leads.id AND notes.company_id IS NULL
    """)
    op.execute("""
        UPDATE notes SET company_id = clients.company_id
        FROM clients WHERE notes.client_id = clients.id AND notes.company_id IS NULL
    """)
    # Fallback: assign remaining orphan notes to company 1
    op.execute("UPDATE notes SET company_id = 1 WHERE company_id IS NULL")

    op.alter_column("notes", "company_id", nullable=False)


def downgrade() -> None:
    op.drop_index("ix_notes_client_id", table_name="notes")
    op.drop_index("ix_notes_lead_id", table_name="notes")
    op.drop_index("ix_notes_company_id", table_name="notes")
    op.drop_constraint("fk_notes_company_id", "notes", type_="foreignkey")
    op.drop_column("notes", "company_id")
