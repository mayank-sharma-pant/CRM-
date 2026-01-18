from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def list_clients():
    """List all clients"""
    return {"message": "Clients endpoint - to be implemented"}

@router.post("/")
def create_client():
    """Create a new client"""
    return {"message": "Create client endpoint - to be implemented"}
