import httpx
import json
import time
import subprocess

def test_http_signup():
    print("Starting local backend for testing...")
    # Start the backend in the background
    cmd = ["uvicorn", "app.main:app", "--port", "8008"]
    proc = subprocess.Popen(cmd, cwd="d:/SunEdge/CRM/CRM-/backend")
    
    # Wait for it to start
    time.sleep(5)
    
    try:
        # payload matching AuthContext.jsx exactly
        payload = {
            "email": "http_diag_test@example.com",
            "password": "test_password123",
            "full_name": "HTTP Diag",
            "phone": "9998887777",
            "company_name": "HTTP Diag Corp",
            "role": "sales"
        }
        
        print(f"Sending POST to http://localhost:8008/api/auth/signup with payload: {json.dumps(payload)}")
        response = httpx.post("http://localhost:8008/api/auth/signup", json=payload)
        
        print(f"Response Status: {response.status_code}")
        try:
            print(f"Response JSON: {json.dumps(response.json(), indent=2)}")
        except:
            print(f"Response Text: {response.text}")
            
    except Exception as e:
        print(f"HTTP DIAGNOSTIC FAILED: {str(e)}")
    finally:
        print("Stopping backend...")
        proc.terminate()

if __name__ == "__main__":
    test_http_signup()
