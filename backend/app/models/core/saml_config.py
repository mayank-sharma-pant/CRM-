from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class SamlConfig(Base):
    __tablename__ = "saml_configs"
    __table_args__ = (UniqueConstraint("company_id", name="uq_saml_configs_company_id"),)

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    idp_entity_id = Column(String(500), nullable=False)
    idp_sso_url = Column(String(500), nullable=False)
    idp_certificate_pem = Column(Text, nullable=False)
    enabled = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    company = relationship("Company")
