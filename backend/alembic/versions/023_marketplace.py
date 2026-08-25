"""Apply schema after marketplace_installs table.

Revision ID: 023_marketplace
Revises: 022_custom_modules
Create Date: 2026-08-26
"""
from typing import Sequence, Union

from alembic import op

revision: str = "023_marketplace"
down_revision: Union[str, None] = "022_custom_modules"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from app.schema_sync import apply_schema

    apply_schema(op.get_bind())


def downgrade() -> None:
    pass
