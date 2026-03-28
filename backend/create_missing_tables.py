from app.database import engine, Base
from app.models.core import *
from app.models.sales import *
from app.models.hr import *

Base.metadata.create_all(bind=engine)
print("All missing tables created successfully.")
