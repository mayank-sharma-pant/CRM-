from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def list_leads():
    """List all leads"""
    return {"message": "Leads endpoint - to be implemented"}

@router.post("/")
def create_lead():
    """Create a new lead"""
    return {"message": "Create lead endpoint - to be implemented"}
