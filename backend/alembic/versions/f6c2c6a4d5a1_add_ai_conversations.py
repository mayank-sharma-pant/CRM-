"""add ai conversations

Revision ID: f6c2c6a4d5a1
Revises: 293e8e055922
Create Date: 2026-03-26 22:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f6c2c6a4d5a1"
down_revision: Union[str, None] = "293e8e055922"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ai_conversations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("idempotency_key", sa.String(length=128), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("user_message", sa.Text(), nullable=False),
        sa.Column("context_json", sa.Text(), nullable=True),
        sa.Column("ai_message", sa.Text(), nullable=True),
        sa.Column("planned_actions_json", sa.Text(), nullable=True),
        sa.Column("executed_actions_json", sa.Text(), nullable=True),
        sa.Column("error_detail", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.UniqueConstraint("company_id", "user_id", "idempotency_key", name="ux_ai_conversations_company_user_idempotency"),
    )
    op.create_index(op.f("ix_ai_conversations_company_id"), "ai_conversations", ["company_id"], unique=False)
    op.create_index(op.f("ix_ai_conversations_user_id"), "ai_conversations", ["user_id"], unique=False)
    op.create_index(op.f("ix_ai_conversations_created_at"), "ai_conversations", ["created_at"], unique=False)
    op.create_index(op.f("ix_ai_conversations_status"), "ai_conversations", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_ai_conversations_status"), table_name="ai_conversations")
    op.drop_index(op.f("ix_ai_conversations_created_at"), table_name="ai_conversations")
    op.drop_index(op.f("ix_ai_conversations_user_id"), table_name="ai_conversations")
    op.drop_index(op.f("ix_ai_conversations_company_id"), table_name="ai_conversations")
    op.drop_table("ai_conversations")
