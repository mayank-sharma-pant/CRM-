"""Bump users.token_version for logout-kills-access JWT.

Revision ID: 018_token_version
Revises: 017_enrichment
Create Date: 2026-08-26
"""
from typing import Sequence, Union

from alembic import op

revision: str = "018_token_version"
down_revision: Union[str, None] = "017_enrichment"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from app.schema_sync import apply_schema

    apply_schema(op.get_bind())


def downgrade() -> None:
    pass
