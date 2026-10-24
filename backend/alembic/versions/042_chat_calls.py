"""Team chat voice calls: one row per 1-to-1 call (the call log behind chat-history entries).

Like 040/041, this migration is the only path that creates chat_calls and its
tenant policy; app.schema_sync.apply_schema skips it. No existing table is
altered. An existing chat_calls table is verified instead of accepted.

Downgrade drops the table (call history is lost; the chat messages that showed
the calls stay as empty entries). Roll back a live deployment with
CHAT_CALLS_ENABLED=false instead.

Revision ID: 042_chat_calls
Revises: 041_chat_attachments
Create Date: 2026-10-24
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "042_chat_calls"
down_revision: Union[str, None] = "041_chat_attachments"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

CHAT_TABLES = ("chat_calls",)

EXPECTED_COLUMNS = {
    "chat_calls": {
        "id", "company_id", "conversation_id", "caller_id", "callee_id", "status", "connection",
        "started_at", "answered_at", "ended_at", "duration_s", "message_id",
    },
}


def _verify_existing(bind, table: str) -> None:
    actual = {c["name"] for c in sa.inspect(bind).get_columns(table)}
    if actual != EXPECTED_COLUMNS[table]:
        raise RuntimeError(
            f"{table} already exists with columns {sorted(actual)}; expected {sorted(EXPECTED_COLUMNS[table])}"
        )


def upgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"
    if is_postgres:
        # Fail fast instead of queueing behind live traffic on the referenced tables.
        op.execute("SET LOCAL lock_timeout = '5s'")

    if "chat_calls" in set(sa.inspect(bind).get_table_names()):
        _verify_existing(bind, "chat_calls")
    else:
        op.create_table(
            "chat_calls",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id"), nullable=False),
            sa.Column(
                "conversation_id",
                sa.Integer(),
                sa.ForeignKey("chat_conversations.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("caller_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("callee_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("status", sa.String(12), nullable=False),
            sa.Column("connection", sa.String(8), nullable=False, server_default="unknown"),
            sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("answered_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("duration_s", sa.Integer(), nullable=True),
            sa.Column(
                "message_id",
                sa.Integer(),
                sa.ForeignKey("chat_messages.id", ondelete="CASCADE"),
                nullable=True,
            ),
            sa.UniqueConstraint("message_id", name="uq_chat_calls_message"),
        )
        op.create_index("ix_chat_calls_company_id", "chat_calls", ["company_id"])
        op.create_index("ix_chat_calls_status", "chat_calls", ["status"])

    if is_postgres:
        from app.tenancy import policy_statements

        for statement in policy_statements("chat_calls"):
            op.execute(statement)


def downgrade() -> None:
    op.drop_table("chat_calls")
