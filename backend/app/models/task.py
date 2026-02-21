from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Date
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    status = Column(String(50), default="Pending")  # Pending, In Progress, Completed
    priority = Column(String(20), default="medium")  # low, medium, high
    
    # Due date
    due_date = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    # Related entity (Lead or Client)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    
    # Assignment
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    assigned_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Manager-assigned flag
    is_manager_assigned = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    company = relationship("Company", backref="tasks")
    lead = relationship("Lead", back_populates="tasks")
    client = relationship("Client", back_populates="tasks")
    assigned_to = relationship("User", foreign_keys=[assigned_to_id], back_populates="tasks_assigned")
    assigned_by = relationship("User", foreign_keys=[assigned_by_id], back_populates="tasks_created")
