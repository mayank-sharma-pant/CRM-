from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.core.enums import DashboardWidgetViz


class Dashboard(Base):
    __tablename__ = "dashboards"
    __table_args__ = (
        UniqueConstraint("company_id", name="uq_dashboards_company_id"),
    )

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False, default="Company dashboard")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    company = relationship("Company")
    widgets = relationship("DashboardWidget", back_populates="dashboard")


class DashboardWidget(Base):
    __tablename__ = "dashboard_widgets"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    dashboard_id = Column(Integer, ForeignKey("dashboards.id"), nullable=False, index=True)
    saved_report_id = Column(Integer, ForeignKey("saved_reports.id"), nullable=False, index=True)
    visualization = Column(
        Enum(DashboardWidgetViz, values_callable=lambda x: [e.value for e in x], native_enum=False),
        nullable=False,
    )
    title = Column(String(255), nullable=True)
    position = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, server_default=func.now())

    company = relationship("Company")
    dashboard = relationship("Dashboard", back_populates="widgets")
    saved_report = relationship("SavedReport")
