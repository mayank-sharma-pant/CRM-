"""Apply schema after sales_orders tables.

Revision ID: 033_sales_orders
Revises: 032_next_activity_nag
Create Date: 2026-08-27
"""
from typing import Sequence, Union

from alembic import op

revision: str = "033_sales_orders"
down_revision: Union[str, None] = "032_next_activity_nag"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from app.schema_sync import apply_schema

    apply_schema(op.get_bind())


def downgrade() -> None:
    pass
