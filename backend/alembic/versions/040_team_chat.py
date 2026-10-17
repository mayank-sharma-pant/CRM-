"""Team chat: conversations, participants, messages.

This migration is the only path that creates the three chat tables and their
tenant policies; app.schema_sync.apply_schema (migrations 016-039 and
create_missing_tables.py) skips them. No existing table is altered. If a chat
table already exists (e.g. created by an earlier build of this branch), its
columns are verified instead of silently accepted.

Downgrade drops the tables and DELETES ALL CHAT MESSAGES. Roll back a live
deployment with CHAT_ENABLED=false instead.

Revision ID: 040_team_chat
Revises: 039_lead_sheet
Create Date: 2026-10-14
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "040_team_chat"
down_revision: Union[str, None] = "039_lead_sheet"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

CHAT_TABLES = ("chat_conversations", "chat_participants", "chat_messages")

EXPECTED_COLUMNS = {
    "chat_conversations": {"id", "company_id", "kind", "direct_key", "last_seq", "created_at", "last_message_at"},
    "chat_participants": {"id", "company_id", "conversation_id", "user_id", "last_read_seq", "joined_at"},
    "chat_messages": {
        "id", "company_id", "conversation_id", "seq", "sender_id", "body_enc", "key_id", "client_msg_id", "created_at",
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
        # Fail fast instead of queueing behind (and blocking) live traffic on users/companies.
        op.execute("SET LOCAL lock_timeout = '5s'")

    existing = set(sa.inspect(bind).get_table_names())
    for table in CHAT_TABLES:
        if table in existing:
            _verify_existing(bind, table)

    if "chat_conversations" not in existing:
        op.create_table(
            "chat_conversations",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id"), nullable=False),
            sa.Column("kind", sa.String(16), nullable=False),
            sa.Column("direct_key", sa.String(64), nullable=False),
            sa.Column("last_seq", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("last_message_at", sa.DateTime(timezone=True), nullable=True),
            sa.UniqueConstraint("company_id", "direct_key", name="uq_chat_conversations_company_direct"),
        )
        op.create_index("ix_chat_conversations_company_id", "chat_conversations", ["company_id"])
        op.create_index("ix_chat_conversations_last_message_at", "chat_conversations", ["last_message_at"])

    if "chat_participants" not in existing:
        op.create_table(
            "chat_participants",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id"), nullable=False),
            sa.Column(
                "conversation_id",
                sa.Integer(),
                sa.ForeignKey("chat_conversations.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("last_read_seq", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("joined_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.UniqueConstraint("conversation_id", "user_id", name="uq_chat_participants_conversation_user"),
        )
        op.create_index("ix_chat_participants_company_id", "chat_participants", ["company_id"])
        op.create_index("ix_chat_participants_user_conversation", "chat_participants", ["user_id", "conversation_id"])

    if "chat_messages" not in existing:
        op.create_table(
            "chat_messages",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id"), nullable=False),
            sa.Column(
                "conversation_id",
                sa.Integer(),
                sa.ForeignKey("chat_conversations.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("seq", sa.Integer(), nullable=False),
            sa.Column("sender_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("body_enc", sa.Text(), nullable=False),
            sa.Column("key_id", sa.String(16), nullable=False),
            sa.Column("client_msg_id", sa.String(36), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.UniqueConstraint("conversation_id", "seq", name="uq_chat_messages_conversation_seq"),
            sa.UniqueConstraint("sender_id", "client_msg_id", name="uq_chat_messages_sender_client_msg"),
        )
        op.create_index("ix_chat_messages_company_id", "chat_messages", ["company_id"])

    if is_postgres:
        from app.tenancy import policy_statements

        for table in CHAT_TABLES:
            for statement in policy_statements(table):
                op.execute(statement)


def downgrade() -> None:
    for table in reversed(CHAT_TABLES):
        op.drop_table(table)
