"""Team chat attachments: one file per message, stored on local disk.

Like 040, this migration is the only path that creates chat_attachments and its
tenant policy; app.schema_sync.apply_schema skips it. No existing table is
altered. An existing chat_attachments table is verified instead of accepted.

Downgrade drops the table (attachment metadata is lost; files on disk stay).
Roll back a live deployment with CHAT_FILES_ENABLED=false instead.

Revision ID: 041_chat_attachments
Revises: 040_team_chat
Create Date: 2026-10-21
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "041_chat_attachments"
down_revision: Union[str, None] = "040_team_chat"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

CHAT_TABLES = ("chat_attachments",)

EXPECTED_COLUMNS = {
    "chat_attachments": {
        "id", "company_id", "conversation_id", "message_id", "uploader_id", "stored_name",
        "filename_enc", "key_id", "content_type", "category", "size_bytes", "created_at",
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

    if "chat_attachments" in set(sa.inspect(bind).get_table_names()):
        _verify_existing(bind, "chat_attachments")
    else:
        op.create_table(
            "chat_attachments",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id"), nullable=False),
            sa.Column(
                "conversation_id",
                sa.Integer(),
                sa.ForeignKey("chat_conversations.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column(
                "message_id",
                sa.Integer(),
                sa.ForeignKey("chat_messages.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("uploader_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("stored_name", sa.String(64), nullable=False),
            sa.Column("filename_enc", sa.Text(), nullable=False),
            sa.Column("key_id", sa.String(16), nullable=False),
            sa.Column("content_type", sa.String(100), nullable=False),
            sa.Column("category", sa.String(8), nullable=False),
            sa.Column("size_bytes", sa.BigInteger(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.UniqueConstraint("message_id", name="uq_chat_attachments_message"),
            sa.UniqueConstraint("stored_name", name="uq_chat_attachments_stored_name"),
        )
        op.create_index("ix_chat_attachments_company_id", "chat_attachments", ["company_id"])

    if is_postgres:
        from app.tenancy import policy_statements

        for statement in policy_statements("chat_attachments"):
            op.execute(statement)


def downgrade() -> None:
    op.drop_table("chat_attachments")
