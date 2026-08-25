from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.sql import func

from app.database import Base


class MassEmailBlast(Base):
    __tablename__ = "mass_email_blasts"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    subject = Column(String(200), nullable=False)
    audience = Column(String(16), nullable=False)
    sent_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    sent_count = Column(Integer, nullable=False, default=0)
    failed_count = Column(Integer, nullable=False, default=0)
    skipped_count = Column(Integer, nullable=False, default=0)
    sent_at = Column(DateTime, server_default=func.now())
