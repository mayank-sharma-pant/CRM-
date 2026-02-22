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


def upgrade() -> None:
    # invoices: subtotal, tax, discount, total
    op.alter_column(
        "invoices",
        "subtotal",
        existing_type=sa.Float(),
        type_=sa.Numeric(12, 2),
        existing_nullable=True,
        postgresql_using="subtotal::numeric(12,2)",
    )
    op.alter_column(
        "invoices",
        "tax",
        existing_type=sa.Float(),
        type_=sa.Numeric(12, 2),
        existing_nullable=True,
        postgresql_using="tax::numeric(12,2)",
    )
    op.alter_column(
        "invoices",
        "discount",
        existing_type=sa.Float(),
        type_=sa.Numeric(12, 2),
        existing_nullable=True,
        postgresql_using="discount::numeric(12,2)",
    )
    op.alter_column(
        "invoices",
        "total",
        existing_type=sa.Float(),
        type_=sa.Numeric(12, 2),
        existing_nullable=True,
        postgresql_using="total::numeric(12,2)",
    )
    # invoice_items: unit_price, total
    op.alter_column(
        "invoice_items",
        "unit_price",
        existing_type=sa.Float(),
        type_=sa.Numeric(12, 2),
        existing_nullable=True,
        postgresql_using="unit_price::numeric(12,2)",
    )
    op.alter_column(
        "invoice_items",
        "total",
        existing_type=sa.Float(),
        type_=sa.Numeric(12, 2),
        existing_nullable=True,
        postgresql_using="total::numeric(12,2)",
    )


def downgrade() -> None:
    op.alter_column(
        "invoice_items",
        "total",
        existing_type=sa.Numeric(12, 2),
        type_=sa.Float(),
        existing_nullable=True,
        postgresql_using="total::double precision",
    )
    op.alter_column(
        "invoice_items",
        "unit_price",
        existing_type=sa.Numeric(12, 2),
        type_=sa.Float(),
        existing_nullable=True,
        postgresql_using="unit_price::double precision",
    )
    op.alter_column(
        "invoices",
        "total",
        existing_type=sa.Numeric(12, 2),
        type_=sa.Float(),
        existing_nullable=True,
        postgresql_using="total::double precision",
    )
    op.alter_column(
        "invoices",
        "discount",
        existing_type=sa.Numeric(12, 2),
        type_=sa.Float(),
        existing_nullable=True,
        postgresql_using="discount::double precision",
    )
    op.alter_column(
        "invoices",
        "tax",
        existing_type=sa.Numeric(12, 2),
        type_=sa.Float(),
        existing_nullable=True,
        postgresql_using="tax::double precision",
    )
    op.alter_column(
        "invoices",
        "subtotal",
        existing_type=sa.Numeric(12, 2),
        type_=sa.Float(),
        existing_nullable=True,
        postgresql_using="subtotal::double precision",
    )
