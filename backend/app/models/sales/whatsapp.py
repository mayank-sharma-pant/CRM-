from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class WhatsAppTemplate(Base):
    __tablename__ = "whatsapp_templates"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    language = Column(String(10), nullable=False, default="en")
    provider_template_id = Column(String(120), nullable=False)
    body = Column(Text, nullable=True)
    variable_keys = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    company = relationship("Company")


class WhatsAppMessage(Base):
    __tablename__ = "whatsapp_messages"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    template_id = Column(Integer, ForeignKey("whatsapp_templates.id"), nullable=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True, index=True)
    to_phone = Column(String(20), nullable=False)
    status = Column(String(20), nullable=False, default="failed")
    error = Column(Text, nullable=True)
    sent_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    company = relationship("Company")
