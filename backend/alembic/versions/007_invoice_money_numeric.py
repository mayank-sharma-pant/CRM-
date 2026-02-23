"""Use Numeric for money columns (invoices, invoice_items) to avoid float rounding

Revision ID: 007_invoice_money_numeric
Revises: 006_invoice_number_per_company
Create Date: 2026-02-22

"""
from alembic import op
import sqlalchemy as sa

revision = "007_invoice_money_numeric"
down_revision = "006_invoice_number_per_company"
branch_labels = None
depends_on = None

NUMERIC = sa.Numeric(12, 2)

_INVOICE_COLS = ["subtotal", "tax", "discount", "total"]
_ITEM_COLS = ["unit_price", "total"]


def _is_sqlite() -> bool:
    return op.get_bind().dialect.name == "sqlite"


def upgrade() -> None:
    if _is_sqlite():
        with op.batch_alter_table("invoices") as batch:
            for col in _INVOICE_COLS:
                batch.alter_column(col, existing_type=sa.Float(), type_=NUMERIC, existing_nullable=True)
        with op.batch_alter_table("invoice_items") as batch:
            for col in _ITEM_COLS:
                batch.alter_column(col, existing_type=sa.Float(), type_=NUMERIC, existing_nullable=True)
    else:
        for col in _INVOICE_COLS:
            op.alter_column(
                "invoices", col,
                existing_type=sa.Float(), type_=NUMERIC, existing_nullable=True,
                postgresql_using=f"{col}::numeric(12,2)",
            )
        for col in _ITEM_COLS:
            op.alter_column(
                "invoice_items", col,
                existing_type=sa.Float(), type_=NUMERIC, existing_nullable=True,
                postgresql_using=f"{col}::numeric(12,2)",
            )


def downgrade() -> None:
    if _is_sqlite():
        with op.batch_alter_table("invoice_items") as batch:
            for col in reversed(_ITEM_COLS):
                batch.alter_column(col, existing_type=NUMERIC, type_=sa.Float(), existing_nullable=True)
        with op.batch_alter_table("invoices") as batch:
            for col in reversed(_INVOICE_COLS):
                batch.alter_column(col, existing_type=NUMERIC, type_=sa.Float(), existing_nullable=True)
    else:
        for col in reversed(_ITEM_COLS):
            op.alter_column(
                "invoice_items", col,
                existing_type=NUMERIC, type_=sa.Float(), existing_nullable=True,
                postgresql_using=f"{col}::double precision",
            )
        for col in reversed(_INVOICE_COLS):
            op.alter_column(
                "invoices", col,
                existing_type=NUMERIC, type_=sa.Float(), existing_nullable=True,
                postgresql_using=f"{col}::double precision",
            )
