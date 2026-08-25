"""Idempotent schema catch-up after the 015 head (ORM + missing columns + RLS).

Revision ID: 016_schema_catchup
Revises: 015_ai_reasoning
Create Date: 2026-08-26 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op

revision: str = "016_schema_catchup"
down_revision: Union[str, None] = "015_ai_reasoning"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from app.schema_sync import apply_schema

    apply_schema(op.get_bind())


def downgrade() -> None:
    pass
