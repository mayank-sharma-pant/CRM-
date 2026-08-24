import json
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class CustomFieldDef(Base):
    __tablename__ = "custom_field_defs"
    __table_args__ = (
        UniqueConstraint("company_id", "entity_type", "field_key", name="uq_custom_field_defs_company_entity_key"),
    )

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    entity_type = Column(String(20), nullable=False)
    name = Column(String(100), nullable=False)
    field_key = Column(String(50), nullable=False)
    field_type = Column(String(20), nullable=False)
    options_json = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    values = relationship("CustomFieldValue", back_populates="field_def", cascade="all, delete-orphan")

    @property
    def options(self):
        if not self.options_json:
            return None
        try:
            data = json.loads(self.options_json)
        except json.JSONDecodeError:
            return None
        return data if isinstance(data, list) else None


class CustomFieldValue(Base):
    __tablename__ = "custom_field_values"
    __table_args__ = (
        UniqueConstraint("field_def_id", "entity_id", name="uq_custom_field_values_def_entity"),
    )

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    field_def_id = Column(Integer, ForeignKey("custom_field_defs.id"), nullable=False, index=True)
    entity_id = Column(Integer, nullable=False, index=True)
    value = Column(Text, nullable=True)

    field_def = relationship("CustomFieldDef", back_populates="values")
