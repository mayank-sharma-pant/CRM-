from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import json

from app.database import Base


class CustomModule(Base):
    __tablename__ = "custom_modules"
    __table_args__ = (UniqueConstraint("company_id", "slug", name="uq_custom_modules_company_slug"),)

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    slug = Column(String(50), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)

    fields = relationship("CustomModuleField", back_populates="module", cascade="all, delete-orphan")
    records = relationship("CustomModuleRecord", back_populates="module", cascade="all, delete-orphan")


class CustomModuleField(Base):
    __tablename__ = "custom_module_fields"
    __table_args__ = (
        UniqueConstraint("module_id", "field_key", name="uq_custom_module_fields_module_key"),
    )

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    module_id = Column(Integer, ForeignKey("custom_modules.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    field_key = Column(String(50), nullable=False)
    field_type = Column(String(20), nullable=False)
    options_json = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

    module = relationship("CustomModule", back_populates="fields")

    @property
    def options(self):
        if not self.options_json:
            return None
        try:
            data = json.loads(self.options_json)
        except json.JSONDecodeError:
            return None
        return data if isinstance(data, list) else None


class CustomModuleRecord(Base):
    __tablename__ = "custom_module_records"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    module_id = Column(Integer, ForeignKey("custom_modules.id"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    values_json = Column(Text, nullable=False, default="{}")
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    module = relationship("CustomModule", back_populates="records")
