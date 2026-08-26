from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class ImportBatch(Base):
    __tablename__ = "import_batches"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    entity_type = Column(String(20), nullable=False, index=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    undone_at = Column(DateTime, nullable=True)

    items = relationship("ImportBatchItem", back_populates="batch", cascade="all, delete-orphan")


class ImportBatchItem(Base):
    __tablename__ = "import_batch_items"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("import_batches.id", ondelete="CASCADE"), nullable=False, index=True)
    entity_id = Column(Integer, nullable=False)

    batch = relationship("ImportBatch", back_populates="items")
