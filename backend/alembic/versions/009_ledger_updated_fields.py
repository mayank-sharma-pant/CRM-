"""Add updated_at and updated_by to ledger_entries

Revision ID: 009_ledger_updated_fields
Revises: 008_otp_codes_table
Create Date: 2026-02-23

"""
from alembic import op
import sqlalchemy as sa


revision = "009_ledger_updated_fields"
down_revision = "008_otp_codes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "ledger_entries",
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "ledger_entries",
        sa.Column("updated_by", sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("ledger_entries", "updated_by")
    op.drop_column("ledger_entries", "updated_at")

