from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Optional, List, Dict, Any
import uuid

def _now() -> datetime:
    return datetime.now(timezone.utc)

class TaskState(str, Enum):
    PENDING = "PENDING"
    ASSIGNED = "ASSIGNED"
    SUBMITTED = "SUBMITTED"
    VALIDATED = "VALIDATED"
    EXCEPTION = "EXCEPTION"
    COMPLETED = "COMPLETED"
    RESOLVED = "RESOLVED"
    ESCALATED = "ESCALATED"

@dataclass
class WorkflowInstance:
    """A running instance of a generic workflow (e.g. Manager Workflow for Week 42)"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    workflow_type: str = "" # e.g. "manager_operations_workflow"
    status: str = "IN_PROGRESS" # IN_PROGRESS, COMPLETED, FAILED
    created_at: datetime = field(default_factory=_now)
    updated_at: datetime = field(default_factory=_now)
    context_data: Dict[str, Any] = field(default_factory=dict) # E.g. {"week": 42}

@dataclass
class GenericTask:
    """A specific task within a workflow phase (e.g. Check-in)"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    workflow_instance_id: str = ""
    phase_id: str = "" # e.g., "shift_checkin"
    parent_task_id: Optional[str] = None
    
    # Assignment
    assignee_role: Optional[str] = None # e.g., "STAFF", "MANAGER"
    assignee_id: Optional[str] = None
    assignee_name: Optional[str] = None
    
    # State
    state: TaskState = TaskState.PENDING
    
    # Data
    payload: Dict[str, Any] = field(default_factory=dict) # Submitted data
    validation_errors: List[str] = field(default_factory=list)
    
    # Timestamps
    created_at: datetime = field(default_factory=_now)
    updated_at: datetime = field(default_factory=_now)
    completed_at: Optional[datetime] = None

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "workflow_instance_id": self.workflow_instance_id,
            "parent_task_id": self.parent_task_id,
            "phase_id": self.phase_id,
            "assignee_role": self.assignee_role,
            "assignee_id": self.assignee_id,
            "assignee_name": self.assignee_name,
            "state": self.state.value,
            "payload": self.payload,
            "validation_errors": self.validation_errors,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }
