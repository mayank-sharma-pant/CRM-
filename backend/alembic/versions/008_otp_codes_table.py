"""Add otp_codes table for DB-backed OTP (multi-worker safe)

Revision ID: 008_otp_codes
Revises: 007_invoice_money_numeric
Create Date: 2026-02-22

"""
from alembic import op
import sqlalchemy as sa

revision = "008_otp_codes"
down_revision = "007_invoice_money_numeric"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "otp_codes",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("code", sa.String(10), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_otp_codes_email", "otp_codes", ["email"])


def downgrade() -> None:
    op.drop_index("ix_otp_codes_email", table_name="otp_codes")
    op.drop_table("otp_codes")
