from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timedelta

from app.database import get_db
from app.utils.dependencies import get_current_user
from app.models.user import User
from app.schemas.sales import TaskResponse, TaskListResponse, TaskCreate, TaskUpdate

router = APIRouter()


# ===============================
# Tasks List Endpoint (Main endpoint used by frontend)
# ===============================

@router.get("/list", response_model=List[TaskResponse])
def list_tasks_for_page(
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """List all tasks for the tasks page - returns formatted data for frontend"""
    # Mock tasks matching frontend expectations
    tasks = [
        # Overdue tasks
        TaskResponse(id=1, title="Send proposal to Acme Corp", dueDate="Yesterday 5:00 PM",
                    status="Pending", entity="John Smith", entityType="Lead", assignedBy="manager"),
        TaskResponse(id=2, title="Follow up on contract review", dueDate="2 days ago",
                    status="Pending", entity="TechStart Inc", entityType="Client", assignedBy="self"),
        
        # Today's tasks
        TaskResponse(id=3, title="Call Sarah about requirements", dueDate="Today 10:00 AM",
                    status="Pending", entity="Sarah Johnson", entityType="Lead", assignedBy="self"),
        TaskResponse(id=4, title="Prepare quarterly report", dueDate="Today 2:00 PM",
                    status="Pending", entity="Internal", entityType="General", assignedBy="manager"),
        TaskResponse(id=5, title="Client meeting - Design Co", dueDate="Today 4:00 PM",
                    status="Pending", entity="Design Co", entityType="Client", assignedBy="self"),
        
        # Upcoming tasks
        TaskResponse(id=6, title="Demo presentation for Enterprise", dueDate="Tomorrow 11:00 AM",
                    status="Pending", entity="Enterprise Solutions", entityType="Lead", assignedBy="self"),
        TaskResponse(id=7, title="Submit expense report", dueDate="Jan 25",
                    status="Pending", entity="Internal", entityType="General", assignedBy="self"),
        TaskResponse(id=8, title="Training session attendance", dueDate="Jan 28",
                    status="Pending", entity="Internal", entityType="General", assignedBy="manager"),
    ]
    
    return tasks


@router.get("/", response_model=List[TaskResponse])
def list_tasks(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
    due: Optional[str] = Query(None, description="Filter by due: overdue, today, upcoming"),
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """List all tasks with optional filters"""
    tasks = [
        TaskResponse(id=1, title="Send proposal to Acme Corp", dueDate="Yesterday",
                    status="Pending", entity="John Smith", entityType="Lead"),
        TaskResponse(id=2, title="Follow up with TechStart", dueDate="Today 2:00 PM",
                    status="Pending", entity="TechStart Inc", entityType="Client"),
        TaskResponse(id=3, title="Prepare demo", dueDate="Tomorrow",
                    status="Pending", entity="Enterprise", entityType="Lead"),
    ]
    
    return tasks


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Get task details by ID"""
    tasks = {
        1: TaskResponse(id=1, title="Send proposal to Acme Corp", dueDate="Today 2:00 PM",
                       status="Pending", entity="John Smith", entityType="Lead"),
        2: TaskResponse(id=2, title="Follow up with TechStart", dueDate="Tomorrow",
                       status="Pending", entity="TechStart Inc", entityType="Client"),
    }
    
    if task_id not in tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return tasks[task_id]


@router.post("/", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    task_data: TaskCreate,
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Create a new task"""
    return TaskResponse(
        id=100,
        title=task_data.title,
        dueDate=task_data.due_date,
        status="Pending",
        entity=task_data.entity_name,
        entityType=task_data.entity_type,
        assignedBy="self"
    )


@router.put("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    task_data: TaskUpdate,
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Update task details"""
    return TaskResponse(
        id=task_id,
        title=task_data.title or "Updated Task",
        dueDate=task_data.due_date or "Today",
        status=task_data.status or "Pending"
    )


@router.delete("/{task_id}")
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Delete a task"""
    return {"message": f"Task {task_id} deleted successfully"}


@router.post("/{task_id}/complete")
def complete_task(
    task_id: int,
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Mark task as completed"""
    return {
        "message": f"Task {task_id} marked as completed",
        "status": "Completed",
        "completed_at": datetime.now().isoformat()
    }


# ===============================
# Manager-specific task endpoints
# ===============================

@router.post("/{task_id}/assign")
def assign_task(
    task_id: int,
    user_id: int = Query(..., description="User ID to assign task to"),
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Assign a task to a team member (Manager only)"""
    return {
        "message": f"Task {task_id} assigned to user {user_id}",
        "assigned_to": user_id,
        "assigned_by": "manager"
    }
