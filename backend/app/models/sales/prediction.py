from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func

from app.database import Base


class PredictionModel(Base):
    __tablename__ = "prediction_models"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    kind = Column(String(32), nullable=False, index=True)  # 'deal_convert'
    trained_at = Column(DateTime, server_default=func.now())
    sample_count = Column(Integer, nullable=False, default=0)
    base_rate = Column(Float, nullable=False, default=0.5)
    params = Column(Text, nullable=False, default="{}")
    version = Column(Integer, nullable=False, default=1)
