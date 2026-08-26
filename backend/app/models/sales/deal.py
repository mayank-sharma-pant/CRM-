from sqlalchemy import Column, Integer, String, DateTime, Date, ForeignKey, Numeric
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class Deal(Base):
    __tablename__ = "deals"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    amount = Column(Numeric(12, 2), default=0)
    currency = Column(String(3), default="INR")

    pipeline_id = Column(Integer, ForeignKey("pipelines.id"), nullable=False)
    stage_id = Column(Integer, ForeignKey("pipeline_stages.id"), nullable=False)
    probability = Column(Integer, nullable=True)  # None -> falls back to stage.default_probability
    expected_close = Column(Date, nullable=True)
    closed_at = Column(DateTime, nullable=True)

    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)

    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    source = Column(String(100), nullable=True)
    score = Column(Integer, nullable=True)
    score_updated_at = Column(DateTime, nullable=True)
    due_reminded_at = Column(DateTime, nullable=True)

    approval_status = Column(String(20), nullable=True, index=True)
    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    pipeline = relationship("Pipeline")
    stage = relationship("PipelineStage")
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])
