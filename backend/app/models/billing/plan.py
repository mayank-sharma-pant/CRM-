from sqlalchemy import Column, Integer, String, Numeric, Boolean
from app.database import Base


class Plan(Base):
    __tablename__ = "plans"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    price_monthly = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), nullable=False, default="INR")
    max_users = Column(Integer, nullable=False)
    max_teams = Column(Integer, nullable=False)
    max_storage_gb = Column(Integer, nullable=True)  # NULL = unlimited
    razorpay_plan_id = Column(String(255), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
