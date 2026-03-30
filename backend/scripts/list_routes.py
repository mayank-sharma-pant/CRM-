import os
import sys

# Add the project root to the python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.main import app

print("Listing all registered routes:")
for route in app.routes:
    methods = getattr(route, "methods", None)
    print(f"{route.path} [{methods}]")
