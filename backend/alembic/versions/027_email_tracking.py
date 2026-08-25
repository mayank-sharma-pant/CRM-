"""Apply schema after email_logs open/click tracking columns.

Revision ID: 027_email_tracking
Revises: 026_mass_email
Create Date: 2026-08-26
"""
from typing import Sequence, Union

from alembic import op

revision: str = "027_email_tracking"
down_revision: Union[str, None] = "026_mass_email"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from app.schema_sync import apply_schema

    apply_schema(op.get_bind())


def downgrade() -> None:
    pass
