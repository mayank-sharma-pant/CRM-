"""add created_by_id to leads

Revision ID: 014_add_lead_created_by
Revises: 13a3c2d1e5b7
Create Date: 2026-04-04 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "014_add_lead_created_by"
down_revision: Union[str, None] = "13a3c2d1e5b7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("leads", sa.Column("created_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True))


def downgrade() -> None:
    op.drop_column("leads", "created_by_id")
