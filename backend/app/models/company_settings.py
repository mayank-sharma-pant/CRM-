from sqlalchemy import Column, Integer, String, Text, Float
from sqlalchemy.sql import func
from app.database import Base


class CompanySettings(Base):
    __tablename__ = "company_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String(255), nullable=False, default="Company Name")
    address = Column(Text, nullable=True)
    gst_number = Column(String(50), nullable=True)
    logo_url = Column(String(500), nullable=True)
    
    # Invoice settings
    invoice_prefix = Column(String(20), default="INV")
    tax_rate = Column(Float, default=18.0)
    payment_terms = Column(String(50), default="Net 30 days")
    
    # Pipeline settings (stored as JSON strings)
    lead_stages = Column(Text, default='["New", "Contacted", "Qualified", "Proposal", "Won", "Lost"]')
    lost_reasons = Column(Text, default='["No budget", "Timing not right", "Competitor", "No response"]')
    
    # Notification settings
    task_reminders_enabled = Column(Integer, default=1)  # 1=true, 0=false
    followup_alerts_enabled = Column(Integer, default=1)
