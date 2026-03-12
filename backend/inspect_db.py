import os
import sys

# Add the project directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import engine
from sqlalchemy import inspect

def inspect_tables():
    inspector = inspect(engine)
    for table_name in ["users", "companies", "company_settings"]:
        print(f"\nTable: {table_name}")
        columns = inspector.get_columns(table_name)
        for col in columns:
            print(f"  - {col['name']}: {col['type']} (Nullable: {col['nullable']}, Default: {col['default']})")

if __name__ == "__main__":
    inspect_tables()
