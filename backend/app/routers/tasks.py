from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def list_tasks():
    """List all tasks"""
    return {"message": "Tasks endpoint - to be implemented"}

@router.post("/")
def create_task():
    """Create a new task"""
    return {"message": "Create task endpoint - to be implemented"}
