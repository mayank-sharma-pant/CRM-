"""
Centralized status enums for the CRM application.

Using (str, enum.Enum) so enum values are plain strings,
compatible with existing VARCHAR columns without migration.
"""
import enum


class InvoiceStatus(str, enum.Enum):
    DRAFT = "Draft"
    PENDING = "Pending"
    PAID = "Paid"
    OVERDUE = "Overdue"
    CANCELLED = "Cancelled"


class TaskStatus(str, enum.Enum):
    PENDING = "Pending"
    IN_PROGRESS = "In Progress"
    COMPLETED = "Completed"


class UserRole(str, enum.Enum):
    SALES = "sales"
    MANAGER = "manager"
    ADMIN = "admin"
    MD = "md"


class CompanyStatus(str, enum.Enum):
    ACTIVE = "active"
    PENDING = "pending"
    SUSPENDED = "suspended"


class TransferRequestStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class LeaveStatus(str, enum.Enum):
    PENDING = "Pending"
    APPROVED = "Approved"
    REJECTED = "Rejected"
