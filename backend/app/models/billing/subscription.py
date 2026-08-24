from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database import Base


class Subscription(Base):
    __tablename__ = "subscriptions"
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), unique=True, nullable=False)
    plan_id = Column(Integer, ForeignKey("plans.id"), nullable=False)
    provider = Column(String(30), nullable=False, default="razorpay")
    provider_subscription_id = Column(String(255), nullable=True)
    status = Column(String(20), nullable=False, default="trialing")  # trialing|active|past_due|cancelled
    current_period_end = Column(DateTime(timezone=True), nullable=True)
    trial_ends_at = Column(DateTime(timezone=True), nullable=True)
    seats = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
