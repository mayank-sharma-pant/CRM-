import requests

url = "http://localhost:8000/api/auth/accept-invite/S0363TpuDaZWbHT-nUMLfzdfpdpvjdgwOB1qJhm1ZW0"
payload = {
    "password": "kxjmz%Ws7Cm$"
}

try:
    response = requests.post(url, json=payload)
    print("Status Code:", response.status_code)
    print("Response Body:", response.json())
except Exception as e:
    print("Error:", e)
