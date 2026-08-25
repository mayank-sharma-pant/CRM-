"""Apply schema after support case tables.

Revision ID: 025_cases
Revises: 024_campaigns
Create Date: 2026-08-26
"""
from typing import Sequence, Union

from alembic import op

revision: str = "025_cases"
down_revision: Union[str, None] = "024_campaigns"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from app.schema_sync import apply_schema

    apply_schema(op.get_bind())


def downgrade() -> None:
    pass
