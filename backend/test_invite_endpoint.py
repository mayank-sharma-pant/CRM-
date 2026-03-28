from app.database import SessionLocal
from app.models.core.invite import Invite
import requests

db = SessionLocal()
invite = db.query(Invite).filter(Invite.email == "mayanksharmarrk30@gmail.com").first()
if not invite:
    print("No invite found.")
    exit(1)

token = invite.token
db.close()

import httpx
print(f"Testing accept for token: {token}")
resp = httpx.post(
    f"http://localhost:8000/api/auth/accept-invite/{token}",
    json={"password": ""}
)

print(f"Status: {resp.status_code}")
print(f"Response: {resp.text}")
