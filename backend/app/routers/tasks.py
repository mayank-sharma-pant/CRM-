from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta

from app.database import get_db
from app.utils.dependencies import get_current_user, apply_company_scope, ensure_company_access
from app.models.user import User
from app.models.task import Task
from app.models.lead import Lead
from app.models.client import Client

router = APIRouter()


class TaskCreateBody(BaseModel):
    title: str
    description: Optional[str] = None
    priority: str = "medium"
    due_date: Optional[str] = None
    lead_id: Optional[int] = None
    client_id: Optional[int] = None


class TaskUpdateBody(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None


# ===============================
# Tasks List (for Tasks page)
# ===============================

@router.get("/list")
def get_tasks_list(
    status: Optional[str] = Query(None, description="Filter by status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get full task list with grouping (paginated)."""
    query = apply_company_scope(db.query(Task), Task, current_user)
    if status:
        query = query.filter(Task.status == status)
    total = query.count()
    tasks = query.order_by(Task.due_date.asc()).offset(skip).limit(limit).all()
    
    def get_due_label(task):
        if not task.due_date:
            return "No date"
        now = datetime.now()
        diff = task.due_date - now
        if diff.days < 0:
            return f"{abs(diff.days)} days ago"
        elif diff.days == 0:
            return task.due_date.strftime("%I:%M %p") if task.due_date.date() == now.date() else "Today"
        elif diff.days == 1:
            return "Tomorrow"
        else:
            return task.due_date.strftime("%a, %b %d")
    
    def get_entity_info(task):
        if task.lead_id:
            lead = apply_company_scope(db.query(Lead), Lead, current_user).filter(Lead.id == task.lead_id).first()
            return (lead.name if lead else "Unknown Lead", "Lead")
        elif task.client_id:
            client = apply_company_scope(db.query(Client), Client, current_user).filter(Client.id == task.client_id).first()
            return (client.name if client else "Unknown Client", "Client")
        return ("Internal", "System")
    
    result = []
    for task in tasks:
        entity_name, entity_type = get_entity_info(task)
        result.append({
            "id": task.id,
            "title": task.title,
            "description": task.description,
            "entity": entity_name,
            "entityType": entity_type,
            "assignedBy": "manager" if task.is_manager_assigned else "self",
            "dueDate": get_due_label(task),
            "status": task.status,
            "priority": task.priority
        })
    return {"items": result, "total": total, "skip": skip, "limit": limit}


@router.get("")
def get_priority_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get priority tasks for dashboard (overdue and due today)"""
    now = datetime.now()
    today_start = datetime(now.year, now.month, now.day)
    today_end = today_start + timedelta(days=1)
    
    task_query = apply_company_scope(db.query(Task), Task, current_user)
    # Overdue tasks
    overdue = task_query.filter(
        Task.due_date < today_start,
        Task.status != "Completed"
    ).all()
    
    # Due today
    due_today = task_query.filter(
        Task.due_date >= today_start,
        Task.due_date < today_end,
        Task.status != "Completed"
    ).all()
    
    result = []
    for task in overdue:
        result.append({
            "id": task.id,
            "title": task.title,
            "dueDate": task.due_date.isoformat() if task.due_date else None,
            "status": task.status
        })
    for task in due_today:
        result.append({
            "id": task.id,
            "title": task.title,
            "dueDate": task.due_date.isoformat() if task.due_date else None,
            "status": task.status
        })
    
    return result


@router.get("/{task_id}")
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get task details by ID"""
    task = db.query(Task).filter(Task.id == task_id).first()
    ensure_company_access(task, current_user)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return {
        "id": task.id,
        "title": task.title,
        "description": task.description,
        "status": task.status,
        "priority": task.priority,
        "due_date": task.due_date.isoformat() if task.due_date else None,
        "lead_id": task.lead_id,
        "client_id": task.client_id,
        "is_manager_assigned": task.is_manager_assigned,
        "created_at": task.created_at.isoformat() if task.created_at else None
    }


@router.post("", status_code=status.HTTP_201_CREATED)
def create_task(
    body: TaskCreateBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new task"""
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="User must be assigned to a company")
    new_task = Task(
        company_id=current_user.company_id,
        title=body.title,
        description=body.description,
        priority=body.priority,
        due_date=datetime.fromisoformat(body.due_date) if body.due_date else None,
        lead_id=body.lead_id,
        client_id=body.client_id,
        status="Pending"
    )
    
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    
    return {
        "id": new_task.id,
        "title": new_task.title,
        "status": new_task.status,
        "message": "Task created successfully"
    }


@router.put("/{task_id}")
def update_task(
    task_id: int,
    body: TaskUpdateBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a task"""
    task = db.query(Task).filter(Task.id == task_id).first()
    ensure_company_access(task, current_user)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if body.title is not None:
        task.title = body.title
    if body.status is not None:
        task.status = body.status
        if body.status == "Completed":
            task.completed_at = datetime.now()
    if body.priority is not None:
        task.priority = body.priority
    
    db.commit()
    db.refresh(task)
    
    return {"message": "Task updated successfully", "id": task.id}


@router.post("/{task_id}/complete")
def complete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark task as completed"""
    task = db.query(Task).filter(Task.id == task_id).first()
    ensure_company_access(task, current_user)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task.status = "Completed"
    task.completed_at = datetime.now()
    
    db.commit()
    
    return {"message": f"Task {task_id} completed successfully"}


@router.delete("/{task_id}")
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a task"""
    task = db.query(Task).filter(Task.id == task_id).first()
    ensure_company_access(task, current_user)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    db.delete(task)
    db.commit()
    
    return {"message": f"Task {task_id} deleted successfully"}
