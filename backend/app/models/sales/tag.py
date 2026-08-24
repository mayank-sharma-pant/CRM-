from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class Tag(Base):
    __tablename__ = "tags"
    __table_args__ = (
        UniqueConstraint("company_id", "name", name="uq_tags_company_name"),
    )

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    name = Column(String(40), nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    leads = relationship("LeadTag", back_populates="tag", cascade="all, delete-orphan")


class LeadTag(Base):
    __tablename__ = "lead_tags"
    __table_args__ = (
        UniqueConstraint("lead_id", "tag_id", name="uq_lead_tags_lead_tag"),
    )

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False, index=True)
    tag_id = Column(Integer, ForeignKey("tags.id"), nullable=False, index=True)

    tag = relationship("Tag", back_populates="leads")
