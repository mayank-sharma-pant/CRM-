"""add user notification preferences json column

Revision ID: 13a3c2d1e5b7
Revises: 35f50af5bf55, f6c2c6a4d5a1
Create Date: 2026-03-27 00:00:01.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "13a3c2d1e5b7"
down_revision: Union[str, tuple[str, str], None] = ("35f50af5bf55", "f6c2c6a4d5a1")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("notification_prefs_json", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "notification_prefs_json")
