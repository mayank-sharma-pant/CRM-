"""Make invoice_number unique per company (composite unique constraint)

Revision ID: 006_invoice_number_per_company
Revises: 005_invoice_items_company
Create Date: 2026-02-22
"""
from alembic import op
import sqlalchemy as sa

revision = "006_invoice_number_per_company"
down_revision = "005_invoice_items_company"
branch_labels = None
depends_on = None


def upgrade() -> None:
    is_sqlite = op.get_bind().dialect.name == "sqlite"
    op.drop_index("ix_invoices_invoice_number", table_name="invoices")
    if not is_sqlite:
        op.create_unique_constraint(
            "uq_invoices_company_invoice_number",
            "invoices",
            ["company_id", "invoice_number"],
        )
    else:
        # SQLite can't ALTER constraints; keep non-unique composite constraint in local dev.
        op.create_index(
            "ix_invoices_company_invoice_number",
            "invoices",
            ["company_id", "invoice_number"],
            unique=False,
        )


def downgrade() -> None:
    is_sqlite = op.get_bind().dialect.name == "sqlite"
    if not is_sqlite:
        op.drop_constraint("uq_invoices_company_invoice_number", "invoices", type_="unique")
    else:
        op.drop_index("ix_invoices_company_invoice_number", table_name="invoices")
    op.create_index("ix_invoices_invoice_number", "invoices", ["invoice_number"], unique=True)
