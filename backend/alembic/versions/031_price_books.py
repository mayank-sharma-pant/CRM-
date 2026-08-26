"""Apply schema after price_books tables.

Revision ID: 031_price_books
Revises: 030_einvoice_live
Create Date: 2026-08-27
"""
from typing import Sequence, Union

from alembic import op

revision: str = "031_price_books"
down_revision: Union[str, None] = "030_einvoice_live"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from app.schema_sync import apply_schema

    apply_schema(op.get_bind())


def downgrade() -> None:
    pass
