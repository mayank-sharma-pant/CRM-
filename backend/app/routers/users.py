from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def list_users():
    """List all users (admin only)"""
    return {"message": "Users endpoint - to be implemented"}

@router.get("/me")
def get_current_user():
    """Get current user profile"""
    return {"message": "User profile endpoint - to be implemented"}
