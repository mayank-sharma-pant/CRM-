import os
from app.config import settings

print(f"OS ENV FRONTEND_URL: {os.environ.get('FRONTEND_URL')}")
print(f"Pydantic Settings FRONTEND_URL: {settings.FRONTEND_URL}")
