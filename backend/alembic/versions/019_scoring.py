"""Apply schema after scoring table + columns.

Revision ID: 019_scoring
Revises: 018_token_version
Create Date: 2026-08-26
"""
from typing import Sequence, Union

from alembic import op

revision: str = "019_scoring"
down_revision: Union[str, None] = "018_token_version"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from app.schema_sync import apply_schema

    apply_schema(op.get_bind())


def downgrade() -> None:
    pass
