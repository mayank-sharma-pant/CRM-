"""Apply schema after deal/discount approval columns.

Revision ID: 034_deal_discount_approvals
Revises: 033_sales_orders
Create Date: 2026-08-27
"""
from typing import Sequence, Union

from alembic import op

revision: str = "034_deal_discount_approvals"
down_revision: Union[str, None] = "033_sales_orders"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from app.schema_sync import apply_schema

    apply_schema(op.get_bind())


def downgrade() -> None:
    pass
