"""Apply schema after enrichment columns.

Revision ID: 017_enrichment
Revises: 016_schema_catchup
Create Date: 2026-08-26
"""
from typing import Sequence, Union

from alembic import op

revision: str = "017_enrichment"
down_revision: Union[str, None] = "016_schema_catchup"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from app.schema_sync import apply_schema

    apply_schema(op.get_bind())


def downgrade() -> None:
    pass
