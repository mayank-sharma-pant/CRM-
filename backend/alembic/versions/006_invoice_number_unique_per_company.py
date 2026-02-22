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
    op.drop_index("ix_invoices_invoice_number", table_name="invoices")
    op.create_unique_constraint(
        "uq_invoices_company_invoice_number",
        "invoices",
        ["company_id", "invoice_number"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_invoices_company_invoice_number", "invoices", type_="unique")
    op.create_index("ix_invoices_invoice_number", "invoices", ["invoice_number"], unique=True)
