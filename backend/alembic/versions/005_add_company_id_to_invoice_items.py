"""Add company_id to invoice_items for multi-tenant isolation

Revision ID: 005_invoice_items_company
Revises: 004_notes_company
Create Date: 2026-02-22
"""
from alembic import op
import sqlalchemy as sa

revision = "005_invoice_items_company"
down_revision = "004_notes_company"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("invoice_items", sa.Column("company_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_invoice_items_company_id", "invoice_items", "companies", ["company_id"], ["id"]
    )
    op.create_index("ix_invoice_items_company_id", "invoice_items", ["company_id"])

    # Backfill: derive company_id from parent invoice
    op.execute("""
        UPDATE invoice_items SET company_id = invoices.company_id
        FROM invoices WHERE invoice_items.invoice_id = invoices.id AND invoice_items.company_id IS NULL
    """)
    # Fallback for orphans
    op.execute("UPDATE invoice_items SET company_id = 1 WHERE company_id IS NULL")

    op.alter_column("invoice_items", "company_id", nullable=False)


def downgrade() -> None:
    op.drop_index("ix_invoice_items_company_id", table_name="invoice_items")
    op.drop_constraint("fk_invoice_items_company_id", "invoice_items", type_="foreignkey")
    op.drop_column("invoice_items", "company_id")
