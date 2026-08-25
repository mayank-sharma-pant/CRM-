"""Apply schema after custom_modules tables.

Revision ID: 022_custom_modules
Revises: 021_accounting
Create Date: 2026-08-26
"""
from typing import Sequence, Union

from alembic import op

revision: str = "022_custom_modules"
down_revision: Union[str, None] = "021_accounting"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from app.schema_sync import apply_schema

    apply_schema(op.get_bind())


def downgrade() -> None:
    pass
