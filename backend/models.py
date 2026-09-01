"""
Workflow data models (V1 — SQLite via aiosqlite for simplicity)
Upgrade to Postgres in V2 by swapping the DB_URL in .env
"""
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional
import uuid


def _now() -> datetime:
    return datetime.now(timezone.utc)


@dataclass
class WorkflowTask:
    id: str
    label: str
    description: Optional[str] = None
    sop_hint: Optional[str] = None


@dataclass
class WorkflowExecution:
    """Single run of a workflow — authoritative state record."""

    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    workflow_type: str = ""
    triggered_at: datetime = field(default_factory=_now)

    # Buzz channel context
    nurses_channel_id: str = ""
    supervisors_channel_id: str = ""
    buzz_message_id: Optional[str] = None  # ID of the message posted to #nurses

    # Nurse identity
    nurse_id: Optional[str] = None
    nurse_name: Optional[str] = None

    # Completion
    status: str = "pending"   # "pending" | "completed"
    completed_at: Optional[datetime] = None
    tasks_completed: list[bool] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "workflow_id": self.id,
            "workflow_type": self.workflow_type,
            "triggered_at": self.triggered_at.isoformat(),
            "status": self.status,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "nurse_name": self.nurse_name,
            "tasks_completed": self.tasks_completed,
        }
