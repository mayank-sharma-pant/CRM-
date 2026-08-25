"""Apply schema after accounting_connections / accounting_sync_items.

Revision ID: 021_accounting
Revises: 020_predictions
Create Date: 2026-08-26
"""
from typing import Sequence, Union

from alembic import op

revision: str = "021_accounting"
down_revision: Union[str, None] = "020_predictions"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from app.schema_sync import apply_schema

    apply_schema(op.get_bind())


def downgrade() -> None:
    pass
