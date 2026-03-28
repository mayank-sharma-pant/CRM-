from app.database import SessionLocal
from app.models.core.invite import Invite
from app.models.core.company import Company
from app.models.core.user import User
import uuid
import datetime

db = SessionLocal()

# Find the admin's company
admin = db.query(User).filter(User.email == 'mayanksharmarrk07@gmail.com').first()
if not admin:
    print("Admin not found")
    exit(1)

# Create a mock pending invite
token = str(uuid.uuid4())
invite = Invite(
    email="test_invite_bug@example.com",
    full_name="Test Invite User",
    role="sales",
    company_id=admin.company_id,
    token=token,
    status="pending",
    expires_at=datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=1),
    hashed_password="some_random_hash"
)
db.add(invite)
db.commit()

print(f"Created pending invite. Token: {token}")

# Now call the internal accept_invite endpoint via test client
from fastapi.testclient import TestClient
from app.main import app
import traceback

client = TestClient(app)

print("Calling POST /api/auth/accept-invite...")
try:
    response = client.post(f"/api/auth/accept-invite/{token}", json={"password": ""})
    print(f"Status Code: {response.status_code}")
    print("Response JSON:")
    try:
         print(response.json())
    except:
         print(response.text)
except Exception as e:
    print("Exception running the test client request:")
    traceback.print_exc()

# Cleanup
db.delete(invite)
db.query(User).filter(User.email == "test_invite_bug@example.com").delete()
db.commit()
db.close()
