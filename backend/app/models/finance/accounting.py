from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.sql import func

from app.database import Base


class AccountingConnection(Base):
    __tablename__ = "accounting_connections"
    __table_args__ = (UniqueConstraint("company_id", name="uq_accounting_connections_company"),)

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    provider = Column(String(32), nullable=True)
    status = Column(String(16), nullable=False, default="disconnected")
    connected_at = Column(DateTime, nullable=True)
    last_sync_at = Column(DateTime, nullable=True)
    last_error = Column(Text, nullable=True)


class AccountingSyncItem(Base):
    __tablename__ = "accounting_sync_items"
    __table_args__ = (
        UniqueConstraint("company_id", "entity_type", "entity_id", name="uq_accounting_sync_entity"),
    )

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    entity_type = Column(String(16), nullable=False, default="invoice")
    entity_id = Column(Integer, nullable=False, index=True)
    provider = Column(String(32), nullable=False)
    external_id = Column(String(64), nullable=True)
    status = Column(String(16), nullable=False)
    payload_hash = Column(String(64), nullable=True)
    last_synced_at = Column(DateTime, server_default=func.now())
