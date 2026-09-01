from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import uuid

class Patient(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    room_no: str
    consultant: str
    procedure: str
    admitted_date: str
    status: str = "admitted"

class PatientRound(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    patient_id: str
    nurse_name: str
    round_type: str  # e.g., "Morning", "Evening"
    health_status: str
    clear_on_diagnosis: bool
    doctors_attending: bool
    staff_polite: bool
    cleanliness_satisfied: bool
    dietary_satisfaction: Optional[bool] = None
    nursing_response: Optional[bool] = None
    pain_managed: Optional[bool] = None
    discharge_readiness: Optional[bool] = None
    urgency_flag: str = "Low"
    requires_follow_up: bool = False
    issues_faced: Optional[str] = None
    manager_remarks: Optional[str] = None
    photo_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Mock Data
MOCK_PATIENTS = [
    Patient(
        id="pt-001",
        name="Kiran Devi",
        room_no="OOO1",
        consultant="Dr Deepak",
        procedure="Debridement",
        admitted_date="2025-04-29"
    ),
    Patient(
        id="pt-002",
        name="Jhanvi",
        room_no="OOO2",
        consultant="Dr Surbhi",
        procedure="LSCS",
        admitted_date="2025-05-02"
    ),
    Patient(
        id="pt-003",
        name="Kabita",
        room_no="OOO3",
        consultant="Dr Surbhi",
        procedure="P/O LSCS",
        admitted_date="2025-05-16"
    ),
]
