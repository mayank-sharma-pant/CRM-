"""Google Sheet lead source columns on company_settings.

Revision ID: 039_lead_sheet
Revises: 038_quote_plans
Create Date: 2026-09-25
"""
from typing import Sequence, Union

from alembic import op

revision: str = "039_lead_sheet"
down_revision: Union[str, None] = "038_quote_plans"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from app.schema_sync import apply_schema

    apply_schema(op.get_bind())


def downgrade() -> None:
    pass
