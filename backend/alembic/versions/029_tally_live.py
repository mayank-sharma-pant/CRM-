"""Apply schema after accounting_connections Tally-live columns.

Revision ID: 029_tally_live
Revises: 028_booking_calendar
Create Date: 2026-08-26
"""
from typing import Sequence, Union

from alembic import op

revision: str = "029_tally_live"
down_revision: Union[str, None] = "028_booking_calendar"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from app.schema_sync import apply_schema

    apply_schema(op.get_bind())


def downgrade() -> None:
    pass
