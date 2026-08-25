from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class EmailLog(Base):
    __tablename__ = "email_logs"
    __table_args__ = (
        UniqueConstraint(
            "company_id", "provider", "provider_message_id",
            name="uq_email_logs_company_provider_message",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True, index=True)
    deal_id = Column(Integer, ForeignKey("deals.id"), nullable=True, index=True)
    to_email = Column(String(255), nullable=False)
    from_email = Column(String(255), nullable=True)
    subject = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    status = Column(String(20), nullable=False, default="failed")
    direction = Column(String(10), nullable=False, default="outbound")
    provider = Column(String(20), nullable=False, default="smtp")
    provider_message_id = Column(String(255), nullable=True)
    sent_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    open_count = Column(Integer, nullable=False, default=0, server_default="0")
    click_count = Column(Integer, nullable=False, default=0, server_default="0")
    open_token_hash = Column(String(64), nullable=True, index=True)
    click_token_hash = Column(String(64), nullable=True, index=True)

    company = relationship("Company")
    sent_by = relationship("User")

    company = relationship("Company")
    sent_by = relationship("User")
