"""Apply schema after report schedule columns.

Revision ID: 036_report_schedule
Revises: 035_import_batches
Create Date: 2026-08-27
"""
from typing import Sequence, Union

from alembic import op

revision: str = "036_report_schedule"
down_revision: Union[str, None] = "035_import_batches"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from app.schema_sync import apply_schema

    apply_schema(op.get_bind())


def downgrade() -> None:
    pass
