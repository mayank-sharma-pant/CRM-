from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class EmailCampaign(Base):
    __tablename__ = "email_campaigns"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    subject = Column(String(200), nullable=False)
    body = Column(Text, nullable=False)
    audience = Column(String(16), nullable=False)
    status = Column(String(16), nullable=False, default="draft")
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    sent_at = Column(DateTime, nullable=True)

    recipients = relationship(
        "EmailCampaignRecipient", back_populates="campaign", cascade="all, delete-orphan",
    )


class EmailCampaignRecipient(Base):
    __tablename__ = "email_campaign_recipients"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    campaign_id = Column(Integer, ForeignKey("email_campaigns.id"), nullable=False, index=True)
    to_email = Column(String(255), nullable=False)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    email_log_id = Column(Integer, ForeignKey("email_logs.id"), nullable=True)
    status = Column(String(16), nullable=False)

    campaign = relationship("EmailCampaign", back_populates="recipients")
