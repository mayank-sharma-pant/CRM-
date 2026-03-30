import os
import sys
import json
from fastapi.testclient import TestClient
from datetime import datetime, timedelta, timezone

# Add the project root to the python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.main import app
from app.database import SessionLocal
from app.models.core import User, Team, TeamMembership, UserRole, LeadStatus
from app.models.sales import Lead, Task
from app.utils.security import create_access_token

client = TestClient(app)

def run_flow_tests():
    results = {
        "status": "started",
        "steps": [],
        "errors": []
    }
    db = SessionLocal()
    try:
        # 1. Setup Phase
        # Find a manager and a sales executive in the same team
        manager = db.query(User).filter(User.role == UserRole.MANAGER).first()
        if not manager or not manager.team_id:
            results["errors"].append("No manager with a team found.")
            return results

        sales_exec = db.query(User).filter(
            User.role == UserRole.SALES, 
            User.team_id == manager.team_id
        ).first()
        
        if not sales_exec:
            results["errors"].append(f"No sales executive found in team {manager.team_id}.")
            return results

        results["steps"].append(f"Setup: Manager {manager.email}, Sales Exec {sales_exec.email}, Team {manager.team_id}")
        
        manager_token = create_access_token(data={"sub": manager.email, "role": manager.role.value})
        sales_token = create_access_token(data={"sub": sales_exec.email, "role": sales_exec.role.value})
        
        manager_headers = {"Authorization": f"Bearer {manager_token}", "X-Team-Id": str(manager.team_id)}
        sales_headers = {"Authorization": f"Bearer {sales_token}", "X-Team-Id": str(manager.team_id)}

        # 2. Test 1: Manager creates and assigns a lead
        lead_data = {
            "name": "Flow Test Lead",
            "email": "flow_test@example.com",
            "phone": "555-0199",
            "company": "Flow Test Corp",
            "assigned_to_id": sales_exec.id,
            "team_id": manager.team_id
        }
        
        # Cleanup
        db.query(Lead).filter(Lead.email == "flow_test@example.com").delete()
        db.commit()

        resp = client.post("/api/leads", json=lead_data, headers=manager_headers)
        if resp.status_code == 201:
            lead_id = resp.json()["id"]
            results["steps"].append(f"Manager successfully assigned lead #{lead_id} to sales exec.")
        else:
            results["errors"].append(f"Manager lead assignment failed: {resp.text}")
            return results

        # 3. Test 2: Sales exec sees the lead
        resp = client.get("/api/leads", headers=sales_headers)
        leads = resp.json().get("items", [])
        if any(l["id"] == lead_id for l in leads):
            results["steps"].append("Sales executive successfully sees the assigned lead.")
        else:
            results["errors"].append("Sales executive cannot see the assigned lead.")

        # 4. Test 3: Manager creates and assigns a task
        task_data = {
            "title": "Follow up with Flow Test Corp",
            "description": "Initial call",
            "priority": "High",
            "due_date": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
            "assigned_to_id": sales_exec.id,
            "lead_id": lead_id
        }
        
        resp = client.post("/api/tasks", json=task_data, headers=manager_headers)
        if resp.status_code == 201:
            task_id = resp.json()["id"]
            results["steps"].append(f"Manager successfully assigned task #{task_id} to sales exec.")
        else:
            results["errors"].append(f"Manager task assignment failed: {resp.text}")

        # 5. Test 4: Sales exec sees the task
        resp = client.get("/api/tasks/list", headers=sales_headers)
        tasks = resp.json().get("items", [])
        if any(t["id"] == task_id for t in tasks):
            results["steps"].append("Sales executive successfully sees the assigned task.")
        else:
            results["errors"].append("Sales executive cannot see the assigned task.")

        # 6. Test 5: Sales exec completes the task
        resp = client.post(f"/api/tasks/{task_id}/complete", headers=sales_headers)
        if resp.status_code == 200:
            results["steps"].append("Sales executive successfully completed the task.")
        else:
            results["errors"].append(f"Sales executive task completion failed: {resp.text}")

        # 7. Test 6: Manager sees task completion in dashboard/monitoring
        resp = client.get("/api/manager/monitoring", headers=manager_headers)
        if resp.status_code == 200:
            monitoring = resp.json()
            member_data = next((m for m in monitoring["team_members"] if m["id"] == sales_exec.id), None)
            if member_data:
                 results["steps"].append("Manager can monitor team member activity.")
            else:
                 results["errors"].append("Sales exec not found in manager's monitoring data.")
        else:
            results["errors"].append(f"Manager monitoring access failed: {resp.text}")

        # Cleanup
        db.query(Task).filter(Task.id == task_id).delete()
        db.query(Lead).filter(Lead.id == lead_id).delete()
        db.commit()
        
        results["status"] = "completed"

    except Exception as e:
        results["errors"].append(f"Exception: {str(e)}")
    finally:
        db.close()
    return results

if __name__ == "__main__":
    flow_results = run_flow_tests()
    with open("flow_test_results.json", "w") as f:
        json.dump(flow_results, f, indent=4)
    print(json.dumps(flow_results, indent=2))
