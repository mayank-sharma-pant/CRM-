"""Apply schema after mass_email_blasts table.

Revision ID: 026_mass_email
Revises: 025_cases
Create Date: 2026-08-26
"""
from typing import Sequence, Union

from alembic import op

revision: str = "026_mass_email"
down_revision: Union[str, None] = "025_cases"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from app.schema_sync import apply_schema

    apply_schema(op.get_bind())


def downgrade() -> None:
    pass
