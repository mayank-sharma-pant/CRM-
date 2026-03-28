import requests
import json
from app.utils.security import create_access_token
from app.database import SessionLocal
from app.models.core.user import User

db = SessionLocal()
user = db.query(User).filter(User.email == 'mayanksharmarrk30@gmail.com').first()
if not user:
    print("User not found")
    exit(1)

token = create_access_token(data={"sub": user.email, "role": str(user.role)})
headers = {
    "Authorization": f"Bearer {token}",
    "X-Team-Id": str(user.team_id)
}

# Try to call the dashboard API directly on the backend
url = "http://127.0.0.1:8000/api/manager/dashboard"
try:
    response = requests.get(url, headers=headers)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        print("Success! Dashboard data retrieved.")
        print(json.dumps(response.json(), indent=2))
    else:
        print(f"Error: {response.text}")
except Exception as e:
    print(f"Connection failed: {e}")

db.close()
