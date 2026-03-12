import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import SessionLocal
from app.models.invite import Invite
import httpx
import json

def test_accept_invite():
    db = SessionLocal()
    try:
        # Get the latest pending invite
        invite = db.query(Invite).order_by(Invite.id.desc()).first()
        if not invite:
            print("No invites found in DB.")
            return

        print(f"Testing accept for invite: {invite.email}, token: {invite.token}")

        payload = {"password": "TestPassword123!"}
        
        response = httpx.post(f"http://localhost:8000/api/auth/accept-invite/{invite.token}", json=payload)
        
        print(f"Status Code: {response.status_code}")
        try:
            print("JSON:", json.dumps(response.json(), indent=2))
        except:
            print("Response:", response.text)

    except Exception as e:
        print(f"Exception: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    test_accept_invite()
