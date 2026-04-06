"""add ai_reasoning to ai_conversations

Revision ID: 015_ai_reasoning
Revises: 014_add_lead_created_by
Create Date: 2026-04-05 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "015_ai_reasoning"
down_revision: Union[str, None] = "014_add_lead_created_by"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("ai_conversations", sa.Column("ai_reasoning", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("ai_conversations", "ai_reasoning")
