from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class InviteStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class Invite(Base):
    __tablename__ = "invites"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    role = Column(String(50), nullable=False)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(String(20), default=InviteStatus.PENDING, index=True)
    token = Column(String(255), unique=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Relationships
    team = relationship("Team", foreign_keys=[team_id])
    manager = relationship("User", foreign_keys=[manager_id])
    created_by = relationship("User", foreign_keys=[created_by_id])
