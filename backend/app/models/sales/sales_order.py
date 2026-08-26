from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Numeric, Enum, Text, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.core.enums import SalesOrderStatus


class SalesOrder(Base):
    __tablename__ = "sales_orders"
    __table_args__ = (
        UniqueConstraint("company_id", "order_number", name="uq_sales_orders_company_order_number"),
    )

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    order_number = Column(String(50), nullable=False)
    quote_id = Column(Integer, ForeignKey("quotes.id"), nullable=False, index=True)
    deal_id = Column(Integer, ForeignKey("deals.id"), nullable=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    status = Column(
        Enum(SalesOrderStatus, values_callable=lambda x: [e.value for e in x], native_enum=False),
        default=SalesOrderStatus.OPEN,
    )
    subtotal = Column(Numeric(12, 2), default=0)
    tax = Column(Numeric(12, 2), default=0)
    cgst = Column(Numeric(12, 2), default=0)
    sgst = Column(Numeric(12, 2), default=0)
    igst = Column(Numeric(12, 2), default=0)
    seller_gstin = Column(String(15), nullable=True)
    buyer_gstin = Column(String(15), nullable=True)
    place_of_supply = Column(String(2), nullable=True)
    tax_mode = Column(String(10), nullable=True)
    total = Column(Numeric(12, 2), default=0)
    notes = Column(Text, nullable=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    items = relationship("SalesOrderItem", back_populates="sales_order", cascade="all, delete-orphan")


class SalesOrderItem(Base):
    __tablename__ = "sales_order_items"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    sales_order_id = Column(Integer, ForeignKey("sales_orders.id"), nullable=False)
    description = Column(String(255), nullable=False)
    quantity = Column(Integer, default=1)
    unit_price = Column(Numeric(12, 2), default=0)
    total = Column(Numeric(12, 2), default=0)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    hsn = Column(String(20), nullable=True)
    tax_rate = Column(Numeric(5, 2), nullable=True)
    tax = Column(Numeric(12, 2), default=0)

    sales_order = relationship("SalesOrder", back_populates="items")
