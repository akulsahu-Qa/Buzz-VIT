from pydantic import BaseModel, Field
from typing import Optional

class PatientSchema(BaseModel):
    name: str
    room_no: str
    consultant: str
    procedure: str
    admitted_date: Optional[str] = None
    status: str = "admitted"

class PatientResponse(PatientSchema):
    id: str

    class Config:
        from_attributes = True

class PatientRoundSchema(BaseModel):
    patient_id: str
    nurse_name: str
    round_type: str
    health_status: str
    
    # Core Checklist
    clear_on_diagnosis: Optional[bool] = None
    doctors_attending: Optional[bool] = None
    staff_polite: Optional[bool] = None
    cleanliness_satisfied: Optional[bool] = None
    gown_and_linens_changed: Optional[bool] = None
    
    # Expanded Metrics
    dietary_satisfaction: Optional[bool] = None
    nursing_response: Optional[bool] = None
    pain_managed: Optional[bool] = None
    discharge_readiness: Optional[bool] = None
    
    # Action Items
    urgency_flag: str = "Low"
    requires_follow_up: bool = False
    issues_faced: Optional[str] = None
    manager_remarks: Optional[str] = None
    photo_url: Optional[str] = None

class PatientRoundResponse(PatientRoundSchema):
    id: str
    created_at: str

    class Config:
        from_attributes = True

class FacilityIssueSchema(BaseModel):
    room_no: str
    department: str
    description: str
    reported_by: str

class FacilityIssueResponse(FacilityIssueSchema):
    id: str
    created_at: str

    class Config:
        from_attributes = True
