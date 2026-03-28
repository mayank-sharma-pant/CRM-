import sys
with open("testclient_error.txt", "w") as f:
    sys.stderr = f
    sys.stdout = f
    
    from fastapi.testclient import TestClient
    from app.main import app
    from app.database import get_db, SessionLocal
    from app.models.core.user import User
    from app.utils.security import create_access_token
    import traceback

    try:
        client = TestClient(app)

        db = SessionLocal()
        admin = db.query(User).filter(User.email == 'mayanksharmarrk07@gmail.com').first()
        db.close()

        if not admin:
            print("No admin user found")
            exit(1)

        token = create_access_token(data={"sub": admin.email})

        print(f"Testing /api/admin/teams with user {admin.email} (Company ID: {admin.company_id}, Role: {admin.role})...")
        headers = {"Authorization": f"Bearer {token}"}

        response = client.get("/api/admin/teams", headers=headers)
        print(f"Status: {response.status_code}")
        try:
            print(response.json())
        except Exception as e:
            print(response.text)
    except Exception as e:
        traceback.print_exc()
