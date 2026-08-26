"""Apply schema after deal next-activity nag columns.

Revision ID: 032_next_activity_nag
Revises: 031_price_books
Create Date: 2026-08-27
"""
from typing import Sequence, Union

from alembic import op

revision: str = "032_next_activity_nag"
down_revision: Union[str, None] = "031_price_books"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from app.schema_sync import apply_schema

    apply_schema(op.get_bind())


def downgrade() -> None:
    pass
