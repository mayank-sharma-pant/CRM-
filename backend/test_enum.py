import sys
import enum
sys.path.append(r'd:\SunEdge\CRM\CRM-\backend')
from app.database import SessionLocal
from sqlalchemy import select, Column, Integer, String, Enum
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class UserRole(str, enum.Enum):
    SALES = "sales"
    MANAGER = "manager"
    ADMIN = "admin"
    MD = "md"
    PURCHASE = "purchase"

class TestUser(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String)
    role = Column(Enum(UserRole, values_callable=lambda x: [e.value for e in x], native_enum=False))

db = SessionLocal()
try:
    user = db.query(TestUser).first()
    print(f"Success! Found user {user.email} with role {user.role}")
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
