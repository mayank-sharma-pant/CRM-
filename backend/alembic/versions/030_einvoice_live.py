"""Apply schema after company_settings e-invoice live columns.

Revision ID: 030_einvoice_live
Revises: 029_tally_live
Create Date: 2026-08-26
"""
from typing import Sequence, Union

from alembic import op
from sqlalchemy import text

revision: str = "030_einvoice_live"
down_revision: Union[str, None] = "029_tally_live"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from app.schema_sync import apply_schema

    bind = op.get_bind()
    apply_schema(bind)
    # Widen signed_qr for live SignedQRCode (MISSING_COLUMNS only adds, never alters).
    if bind.dialect.name == "postgresql":
        bind.execute(text("ALTER TABLE invoices ALTER COLUMN signed_qr TYPE TEXT"))


def downgrade() -> None:
    pass
