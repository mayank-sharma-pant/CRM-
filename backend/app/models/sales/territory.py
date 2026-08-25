from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Territory(Base):
    __tablename__ = "territories"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    priority = Column(Integer, nullable=False, default=100)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    rules = relationship(
        "TerritoryRule",
        back_populates="territory",
        cascade="all, delete-orphan",
    )


class TerritoryRule(Base):
    __tablename__ = "territory_rules"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    territory_id = Column(
        Integer,
        ForeignKey("territories.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    match_field = Column(String(32), nullable=False)
    match_value = Column(String(255), nullable=False)

    territory = relationship("Territory", back_populates="rules")
