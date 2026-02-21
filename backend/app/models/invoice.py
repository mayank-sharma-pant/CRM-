from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, Date
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class Invoice(Base):
    __tablename__ = "invoices"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    invoice_number = Column(String(50), unique=True, nullable=False)
    
    # Client
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    
    # Amounts
    subtotal = Column(Float, default=0.0)
    tax = Column(Float, default=0.0)
    discount = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    
    status = Column(String(50), default="Draft")  # Draft, Pending, Paid, Overdue, Cancelled
    
    # Dates
    issued_date = Column(Date, nullable=True)
    due_date = Column(Date, nullable=True)
    paid_date = Column(Date, nullable=True)
    
    # Payment info
    payment_method = Column(String(50), nullable=True)
    payment_reference = Column(String(100), nullable=True)
    
    notes = Column(Text, nullable=True)
    
    # Created by
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    company = relationship("Company", backref="invoices")
    client = relationship("Client", back_populates="invoices")
    created_by = relationship("User", foreign_keys=[created_by_id], back_populates="invoices_created")
    approved_by = relationship("User", foreign_keys=[approved_by_id], back_populates="invoices_approved")
    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")


class InvoiceItem(Base):
    __tablename__ = "invoice_items"
    
    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    
    description = Column(String(255), nullable=False)
    quantity = Column(Integer, default=1)
    unit_price = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    
    # Relationships
    invoice = relationship("Invoice", back_populates="items")
