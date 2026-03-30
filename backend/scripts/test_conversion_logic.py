import os
import sys
import json
from fastapi.testclient import TestClient
from datetime import datetime, timezone

# Add the project root to the python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.main import app
from app.database import SessionLocal
from app.models.core import User, Company, LeadStatus, UserRole
from app.models.sales import Lead, Client, Task
from app.utils.security import create_access_token

client = TestClient(app)

def run_tests():
    results = {
        "status": "started",
        "steps": [],
        "errors": []
    }
    db = SessionLocal()
    try:
        # 1. Setup Phase
        manager = db.query(User).filter(User.role == UserRole.MANAGER).first()
        if not manager:
            manager = db.query(User).first()
            if not manager:
                results["errors"].append("No users found in DB.")
                return results

        results["steps"].append(f"Setup: Using user {manager.email}")
        
        access_token = create_access_token(data={"sub": manager.email, "role": manager.role.value})
        headers = {
            "Authorization": f"Bearer {access_token}",
            "X-Team-Id": str(manager.team_id) if manager.team_id else "1"
        }

        # 2. Test 1: Create a lead
        db.query(Lead).filter(Lead.email == "test_logic@example.com").delete()
        db.query(Client).filter(Client.email == "test_logic@example.com").delete()
        db.commit()

        lead_data = {
            "name": "Logic Test Lead 1",
            "email": "test_logic@example.com",
            "phone": "1234567890",
            "company": "Test Logic Co",
            "status": "Active" 
        }
        
        response = client.post("/api/leads", json=lead_data, headers=headers)
        if response.status_code == 201:
            results["steps"].append("Lead creation successful.")
            lead_id = response.json()["id"]
        else:
            results["errors"].append(f"Lead creation failed: {response.text}")
            return results
            
        # 3. Test 2: Try converting without assignment
        response = client.patch(f"/api/leads/{lead_id}/status", json={"status": "Converted"}, headers=headers)
        if response.status_code == 400 and "assigned to a specific user" in response.text:
            results["steps"].append("Mandatory assignment check passed (blocked unassigned conversion).")
        else:
            results["errors"].append(f"Mandatory assignment check failed: {response.status_code} - {response.text}")

        # 4. Test 3: Assign and Convert
        client.patch(f"/api/leads/{lead_id}", json={"assigned_to_id": manager.id}, headers=headers)
        response = client.patch(f"/api/leads/{lead_id}/status", json={"status": "Converted"}, headers=headers)
        if response.status_code == 200:
            results["steps"].append("Conversion after assignment successful.")
        else:
            results["errors"].append(f"Conversion after assignment failed: {response.text}")
            
        # 5. Test 4: Duplicate Prevention
        lead_data_2 = {
            "name": "Logic Test Lead 2",
            "email": "test_logic@example.com", # Identical email
            "phone": "0987654321",
            "company": "Test Logic Co 2",
            "status": "Active"
        }
        res = client.post("/api/leads", json=lead_data_2, headers=headers)
        lead_id_2 = res.json()["id"]
        client.patch(f"/api/leads/{lead_id_2}", json={"assigned_to_id": manager.id}, headers=headers)
        
        response = client.patch(f"/api/leads/{lead_id_2}/status", json={"status": "Converted"}, headers=headers)
        if response.status_code == 200:
            results["steps"].append("Second lead converted successfully.")
        else:
             results["errors"].append(f"Second lead conversion failed: {response.text}")

        clients = db.query(Client).filter(Client.email == "test_logic@example.com").all()
        if len(clients) == 1:
            results["steps"].append("Duplicate prevention check passed (merged into 1 client).")
        else:
            results["errors"].append(f"Duplicate prevention check failed: Found {len(clients)} clients.")

        # Cleanup
        db.query(Lead).filter(Lead.email == "test_logic@example.com").delete()
        db.query(Client).filter(Client.email == "test_logic@example.com").delete()
        db.commit()
        results["status"] = "completed"

    except Exception as e:
        results["errors"].append(f"Exception: {str(e)}")
    finally:
        db.close()
    return results

if __name__ == "__main__":
    test_results = run_tests()
    with open("test_results.json", "w") as f:
        json.dump(test_results, f, indent=4)
