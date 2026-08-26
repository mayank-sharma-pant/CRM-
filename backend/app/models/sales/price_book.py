from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class PriceBook(Base):
    __tablename__ = "price_books"
    __table_args__ = (
        UniqueConstraint("company_id", "name", name="uq_price_books_company_name"),
    )

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    is_default = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    company = relationship("Company", backref="price_books")
    entries = relationship(
        "PriceBookEntry",
        back_populates="price_book",
        cascade="all, delete-orphan",
    )


class PriceBookEntry(Base):
    __tablename__ = "price_book_entries"
    __table_args__ = (
        UniqueConstraint("price_book_id", "product_id", name="uq_price_book_entries_book_product"),
    )

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    price_book_id = Column(Integer, ForeignKey("price_books.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    unit_price = Column(Numeric(12, 2), nullable=False, default=0)

    company = relationship("Company")
    price_book = relationship("PriceBook", back_populates="entries")
    product = relationship("Product")
