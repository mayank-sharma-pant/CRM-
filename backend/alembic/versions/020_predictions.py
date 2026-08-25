"""Apply schema after prediction_models table.

Revision ID: 020_predictions
Revises: 019_scoring
Create Date: 2026-08-26
"""
from typing import Sequence, Union

from alembic import op

revision: str = "020_predictions"
down_revision: Union[str, None] = "019_scoring"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from app.schema_sync import apply_schema

    apply_schema(op.get_bind())


def downgrade() -> None:
    pass
