from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.core.enums import DealStageType


class Pipeline(Base):
    __tablename__ = "pipelines"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    is_default = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    stages = relationship("PipelineStage", back_populates="pipeline",
                          cascade="all, delete-orphan", order_by="PipelineStage.position")


class PipelineStage(Base):
    __tablename__ = "pipeline_stages"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    pipeline_id = Column(Integer, ForeignKey("pipelines.id"), nullable=False)
    name = Column(String(255), nullable=False)
    position = Column(Integer, nullable=False)
    stage_type = Column(
        Enum(DealStageType, values_callable=lambda x: [e.value for e in x], native_enum=False),
        default=DealStageType.OPEN,
    )
    default_probability = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    pipeline = relationship("Pipeline", back_populates="stages")
