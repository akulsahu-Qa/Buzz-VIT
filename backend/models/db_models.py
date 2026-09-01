from sqlalchemy import Column, String, Boolean, DateTime
from datetime import datetime, timezone
import uuid

from core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

def _now_iso():
    return datetime.now(timezone.utc).isoformat()

class Patient(Base):
    __tablename__ = "patients"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    name = Column(String, nullable=False)
    room_no = Column(String, nullable=False)
    consultant = Column(String, nullable=False)
    procedure = Column(String, nullable=False)
    admitted_date = Column(String, nullable=False)
    status = Column(String, default="admitted")


class PatientRound(Base):
    __tablename__ = "patient_rounds"

    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    patient_id = Column(String, index=True, nullable=False)
    nurse_name = Column(String, nullable=False)
    round_type = Column(String, nullable=False)
    health_status = Column(String, nullable=False)
    
    # Core Checklist
    clear_on_diagnosis = Column(Boolean, nullable=True)
    doctors_attending = Column(Boolean, nullable=True)
    staff_polite = Column(Boolean, nullable=True)
    cleanliness_satisfied = Column(Boolean, nullable=True)
    
    # Expanded Metrics (Optional)
    dietary_satisfaction = Column(Boolean, nullable=True)
    nursing_response = Column(Boolean, nullable=True)
    pain_managed = Column(Boolean, nullable=True)
    discharge_readiness = Column(Boolean, nullable=True)
    
    # Action Items
    urgency_flag = Column(String, default="Low")
    requires_follow_up = Column(Boolean, default=False)
    issues_faced = Column(String, nullable=True)
    manager_remarks = Column(String, nullable=True)
    photo_url = Column(String, nullable=True)
    
    created_at = Column(String, default=_now_iso)


class FacilityIssue(Base):
    __tablename__ = "facility_issues"
    
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    room_no = Column(String, nullable=False)
    department = Column(String, nullable=False)
    description = Column(String, nullable=False)
    reported_by = Column(String, nullable=False)
    created_at = Column(String, default=_now_iso)
