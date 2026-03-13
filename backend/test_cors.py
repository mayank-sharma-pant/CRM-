import requests

url = 'https://api.perioxia.com/api/auth/signup'
headers = {
    'Origin': 'https://crm.perioxia.com',
    'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'Content-Type, Authorization, Accept'
}

print(f"Testing CORS OPTIONS for {url}...")
try:
    r = requests.options(url, headers=headers, timeout=10)
    print(f"Status: {r.status_code}")
    print(f"Body: {r.text}")
    print("Response Headers:")
    for k, v in r.headers.items():
        print(f"  {k}: {v}")
except Exception as e:
    print(f"Error: {e}")
