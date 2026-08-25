from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.sql import func

from app.database import Base


class MarketplaceInstall(Base):
    __tablename__ = "marketplace_installs"
    __table_args__ = (
        UniqueConstraint("company_id", "app_slug", name="uq_marketplace_installs_company_slug"),
    )

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    app_slug = Column(String(50), nullable=False)
    status = Column(String(16), nullable=False, default="installed")
    installed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    installed_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
