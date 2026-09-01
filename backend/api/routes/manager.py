import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from api.dependencies import get_db
from models.db_models import Patient, PatientRound, FacilityIssue
from models.schemas import PatientSchema, PatientResponse, PatientRoundSchema, PatientRoundResponse, FacilityIssueSchema, FacilityIssueResponse
from services.buzz_client import BuzzClient
from core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/patients", response_model=list[PatientResponse], summary="Get list of admitted patients")
def get_patients(db: Session = Depends(get_db)):
    patients = db.query(Patient).filter(Patient.status == "admitted").all()
    return patients

@router.post("/patients", response_model=PatientResponse, summary="Manually admit a new patient")
def add_patient(patient: PatientSchema, db: Session = Depends(get_db)):
    db_patient = Patient(**patient.model_dump())
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    return db_patient

@router.post("/facility-issues", response_model=FacilityIssueResponse, summary="Report an ad-hoc facility issue")
async def report_facility_issue(issue: FacilityIssueSchema, db: Session = Depends(get_db)):
    db_issue = FacilityIssue(**issue.model_dump())
    db.add(db_issue)
    db.commit()
    db.refresh(db_issue)
    
    supervisors_channel_id = settings.SUPERVISORS_CHANNEL_ID
    if supervisors_channel_id:
        message = (
            f"🚨 **Facility Issue Reported** 🚨\n\n"
            f"**Room:** {issue.room_no}\n"
            f"**Department:** {issue.department}\n"
            f"**Description:** {issue.description}\n\n"
            f"*Reported by: {issue.reported_by}*"
        )
        try:
            client = BuzzClient()
            await client.post_channel_message(supervisors_channel_id, message)
        except Exception as exc:
            logger.error(f"Failed to post facility issue to Buzz: {exc}")
            
    return db_issue

@router.post("/rounds", response_model=PatientRoundResponse, summary="Submit a patient round feedback")
async def submit_patient_round(round_data: PatientRoundSchema, db: Session = Depends(get_db)):
    # Verify patient exists
    patient = db.query(Patient).filter(Patient.id == round_data.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    db_round = PatientRound(**round_data.model_dump())
    db.add(db_round)
    db.commit()
    db.refresh(db_round)

    supervisors_channel_id = settings.SUPERVISORS_CHANNEL_ID
    
    if supervisors_channel_id:
        # Build summary message
        issues_text = f"\n**Issues:** {round_data.issues_faced}" if round_data.issues_faced else ""
        remarks_text = f"\n**Remarks:** {round_data.manager_remarks}" if round_data.manager_remarks else ""
        
        needs_attention = not (round_data.clear_on_diagnosis and round_data.doctors_attending and round_data.staff_polite and round_data.cleanliness_satisfied)
        is_urgent = round_data.urgency_flag == "High"
        needs_follow_up = round_data.requires_follow_up
        
        alert_emoji = "🚨 " if is_urgent else "⚠️ " if (needs_attention or needs_follow_up) else "✅ "
        
        def format_opt_bool(val):
            if val is None: return "N/A"
            return "Yes" if val else "No"
            
        message = (
            f"{alert_emoji} **Patient Round Completed** - {round_data.round_type}\n\n"
            f"**Patient:** {patient.name} (Room: {patient.room_no})\n"
            f"**Consultant:** {patient.consultant}\n"
            f"**Health Status:** {round_data.health_status}\n"
            f"**Urgency:** {round_data.urgency_flag}\n"
            f"**Follow-up Required:** {'Yes' if needs_follow_up else 'No'}\n\n"
            f"**Feedback:**\n"
            f"- Clear on diagnosis? {'Yes' if round_data.clear_on_diagnosis else 'No'}\n"
            f"- Doctors attending regularly? {'Yes' if round_data.doctors_attending else 'No'}\n"
            f"- Staff polite? {'Yes' if round_data.staff_polite else 'No'}\n"
            f"- Cleanliness satisfactory? {'Yes' if round_data.cleanliness_satisfied else 'No'}\n"
            f"- Dietary satisfaction? {format_opt_bool(round_data.dietary_satisfaction)}\n"
            f"- Nursing response? {format_opt_bool(round_data.nursing_response)}\n"
            f"- Pain managed? {format_opt_bool(round_data.pain_managed)}\n"
            f"- Discharge readiness? {format_opt_bool(round_data.discharge_readiness)}"
            f"{issues_text}"
            f"{remarks_text}\n\n"
            f"*Submitted by {round_data.nurse_name}*"
        )
        
        if round_data.photo_url:
            message += f"\n\n**Attached Photo:**\n![Patient Photo]({round_data.photo_url})"
            
        try:
            client = BuzzClient()
            await client.post_channel_message(supervisors_channel_id, message)
            logger.info("Posted patient round summary to supervisors channel")
        except Exception as exc:
            logger.error(f"Failed to post round summary to Buzz: {exc}")

    return db_round
