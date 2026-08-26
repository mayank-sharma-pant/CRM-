"""Apply schema after import_batches tables.

Revision ID: 035_import_batches
Revises: 034_deal_discount_approvals
Create Date: 2026-08-27
"""
from typing import Sequence, Union

from alembic import op

revision: str = "035_import_batches"
down_revision: Union[str, None] = "034_deal_discount_approvals"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from app.schema_sync import apply_schema

    apply_schema(op.get_bind())


def downgrade() -> None:
    pass
