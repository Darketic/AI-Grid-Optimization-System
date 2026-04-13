from fastapi.testclient import TestClient
from main import app

client = TestClient(app)
response = client.post("/api/v1/token", data={"username": "admin", "password": "admin"})
print(response.status_code)
print(response.json())
