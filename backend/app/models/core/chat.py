from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, UniqueConstraint, Index
from sqlalchemy.sql import func

from app.database import Base

# Created only by migration 040_team_chat; schema_sync.apply_schema never touches them.
CHAT_TABLES = ("chat_conversations", "chat_participants", "chat_messages")


class ChatConversation(Base):
    __tablename__ = "chat_conversations"

    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    kind = Column(String(16), nullable=False, default="direct")
    # "<lower user id>:<higher user id>" — one direct conversation per pair.
    direct_key = Column(String(64), nullable=False)
    # Per-conversation message counter, incremented under a row lock on send.
    last_seq = Column(Integer, nullable=False, default=0, server_default="0")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_message_at = Column(DateTime(timezone=True), nullable=True, index=True)

    __table_args__ = (
        UniqueConstraint("company_id", "direct_key", name="uq_chat_conversations_company_direct"),
    )


class ChatParticipant(Base):
    __tablename__ = "chat_participants"

    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    conversation_id = Column(
        Integer, ForeignKey("chat_conversations.id", ondelete="CASCADE"), nullable=False
    )
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    last_read_seq = Column(Integer, nullable=False, default=0, server_default="0")
    joined_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("conversation_id", "user_id", name="uq_chat_participants_conversation_user"),
        Index("ix_chat_participants_user_conversation", "user_id", "conversation_id"),
    )


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    conversation_id = Column(
        Integer, ForeignKey("chat_conversations.id", ondelete="CASCADE"), nullable=False
    )
    seq = Column(Integer, nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    body_enc = Column(Text, nullable=False)
    key_id = Column(String(16), nullable=False)
    client_msg_id = Column(String(36), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("conversation_id", "seq", name="uq_chat_messages_conversation_seq"),
        UniqueConstraint("sender_id", "client_msg_id", name="uq_chat_messages_sender_client_msg"),
    )
