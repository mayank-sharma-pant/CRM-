"""Quote plans catalog and quotation seller/proposal fields.

Revision ID: 038_quote_plans
Revises: 037_email_templates
Create Date: 2026-09-22
"""
from typing import Sequence, Union

from alembic import op

revision: str = "038_quote_plans"
down_revision: Union[str, None] = "037_email_templates"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from app.schema_sync import apply_schema

    apply_schema(op.get_bind())


def downgrade() -> None:
    pass
