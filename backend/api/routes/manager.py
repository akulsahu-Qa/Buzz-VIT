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
        # Determine negative feedback / urgency
        is_urgent = round_data.urgency_flag == "High"
        needs_follow_up = round_data.requires_follow_up
        
        has_negative_feedback = False
        if round_data.clear_on_diagnosis is False: has_negative_feedback = True
        if round_data.doctors_attending is False: has_negative_feedback = True
        if round_data.staff_polite is False: has_negative_feedback = True
        if round_data.cleanliness_satisfied is False: has_negative_feedback = True
        if round_data.gown_and_linens_changed is False: has_negative_feedback = True
        if round_data.discharge_readiness is False: has_negative_feedback = True
        if round_data.health_status == "Poor": has_negative_feedback = True

        alert_emoji = "🚨 " if is_urgent else "⚠️ " if (has_negative_feedback or needs_follow_up) else "✅ "

        # Clean display title based on round_type
        r_type = (round_data.round_type or "").strip()
        if r_type.lower() in ("morning", "ipd", "ipd feedback"):
            display_title = "IPD Feedback"
        elif r_type.lower() in ("evening", "discharge", "post-discharge", "post-discharge feedback"):
            display_title = "Post-Discharge"
        elif r_type.lower() in ("opd", "opd feedback"):
            display_title = "OPD Feedback"
        else:
            display_title = r_type or "Patient Round"

        lines = [
            f"{alert_emoji} **Patient Round Completed — {display_title}**\n",
            f"**Patient:** {patient.name} (Room: {patient.room_no})",
            f"**Consultant:** {patient.consultant}",
        ]

        # 1. IPD Feedback Section (only if IPD fields were provided)
        has_ipd = any(
            x is not None for x in [
                round_data.clear_on_diagnosis,
                round_data.doctors_attending,
                round_data.staff_polite,
                round_data.cleanliness_satisfied,
                round_data.gown_and_linens_changed,
            ]
        ) or display_title == "IPD Feedback"

        if has_ipd and display_title not in ("Post-Discharge", "OPD Feedback"):
            lines.append("\n**IPD Feedback:**")
            if round_data.health_status and round_data.health_status != "Discharged":
                lines.append(f"- Health status today: {round_data.health_status}")
            if round_data.clear_on_diagnosis is not None:
                lines.append(f"- Clear about diagnosis & treatment? {'Yes' if round_data.clear_on_diagnosis else 'No'}")
            if round_data.doctors_attending is not None:
                lines.append(f"- Doctors/nurses attending regularly? {'Yes' if round_data.doctors_attending else 'No'}")
            if round_data.staff_polite is not None:
                lines.append(f"- Staff polite and respectful? {'Yes' if round_data.staff_polite else 'No'}")
            if round_data.cleanliness_satisfied is not None:
                lines.append(f"- Satisfied with cleanliness? {'Yes' if round_data.cleanliness_satisfied else 'No'}")
            if round_data.gown_and_linens_changed is not None:
                lines.append(f"- Gown and linen changed in the morning? {'Yes' if round_data.gown_and_linens_changed else 'No'}")

        # 2. Post-Discharge Section (only if Post-Discharge tab or discharge readiness provided)
        is_discharge = display_title == "Post-Discharge" or round_data.discharge_readiness is not None
        if is_discharge and display_title not in ("IPD Feedback", "OPD Feedback"):
            lines.append("\n**Post-Discharge Feedback:**")
            if round_data.discharge_readiness is not None:
                lines.append(f"- Was the discharge process smooth? {'Yes' if round_data.discharge_readiness else 'No'}")
            elif round_data.health_status == "Discharged":
                lines.append("- Patient status: Discharged")

        # 3. OPD Section (only if OPD tab)
        is_opd = display_title == "OPD Feedback"
        if is_opd:
            lines.append("\n**OPD Feedback:**")
            if round_data.health_status:
                lines.append(f"- Overall Experience: {round_data.health_status}")

        # 4. Optional Legacy Metrics (ONLY if provided, never print N/A)
        if round_data.dietary_satisfaction is not None:
            lines.append(f"- Dietary satisfaction? {'Yes' if round_data.dietary_satisfaction else 'No'}")
        if round_data.nursing_response is not None:
            lines.append(f"- Nursing response? {'Yes' if round_data.nursing_response else 'No'}")
        if round_data.pain_managed is not None:
            lines.append(f"- Pain managed? {'Yes' if round_data.pain_managed else 'No'}")

        # 5. Issues faced (if provided)
        if round_data.issues_faced and round_data.issues_faced.strip():
            lines.append(f"\n**Specific Issues / Remarks:**\n{round_data.issues_faced.strip()}")

        if round_data.manager_remarks and round_data.manager_remarks.strip():
            lines.append(f"\n**Manager Remarks:**\n{round_data.manager_remarks.strip()}")

        # 6. Attached Photos
        if round_data.photo_url:
            photo_links = round_data.photo_url.split(',')
            lines.append("\n**Attached Photos:**")
            for link in photo_links:
                if link.strip():
                    lines.append(f"![Patient Photo]({link.strip()})")

        lines.append(f"\n*Submitted by {round_data.nurse_name}*")
        message = "\n".join(lines)

        try:
            client = BuzzClient()
            await client.post_channel_message(supervisors_channel_id, message)
            logger.info("Posted patient round summary to supervisors channel")
        except Exception as exc:
            logger.error(f"Failed to post round summary to Buzz: {exc}")

    return db_round
