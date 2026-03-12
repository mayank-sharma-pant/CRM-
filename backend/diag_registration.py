import os
import sys

# Add the project directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import SessionLocal
from app.routers.auth import signup
from app.schemas.user import UserCreate
import pydantic

def test_registration():
    print("Testing registration logic...")
    db = SessionLocal()
    try:
        # Create a mock UserCreate object
        user_data = UserCreate(
            email="test_reg_diag@example.com",
            password="test_password123",
            full_name="Diag Test",
            company_name="Diag Corp",
            phone="1234567890"
        )
        
        print(f"Calling signup for {user_data.email}...")
        result = signup(user_data, db)
        print("Registration result (code):", result)
        
        # If we get here, it succeeded in code. 
        # Let's check the DB.
        from app.models.user import User
        from app.models.company import Company
        user = db.query(User).filter(User.email == user_data.email).first()
        if user:
            print(f"User created: ID={user.id}, Status={user.status}, CompanyID={user.company_id}")
            company = db.query(Company).filter(Company.id == user.company_id).first()
            if company:
                print(f"Company created: ID={company.id}, Name={company.name}, Status={company.status}")
            else:
                print("ERROR: Company not found in DB!")
        else:
            print("ERROR: User not found in DB after signup()!")

        # Clean up
        print("Cleaning up test data...")
        if user:
            db.delete(user)
        if company:
            db.delete(company)
        db.commit()
        print("Test data cleaned up.")

    except Exception as e:
        print(f"DIAGNOSTIC FAILURE: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_registration()
