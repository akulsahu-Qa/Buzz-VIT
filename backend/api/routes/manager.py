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

    # Prepare DB model data (only columns that exist on the table)
    db_fields = {c.name for c in PatientRound.__table__.columns}
    raw_data = round_data.model_dump()
    db_data = {k: v for k, v in raw_data.items() if k in db_fields}

    # Consolidate all attached photos into db_data['photo_url']
    all_photos = []
    if round_data.ipd_photos:
        all_photos.extend([p.strip() for p in round_data.ipd_photos if p.strip()])
    if round_data.discharge_photos:
        all_photos.extend([p.strip() for p in round_data.discharge_photos if p.strip()])
    if round_data.opd_photos:
        all_photos.extend([p.strip() for p in round_data.opd_photos if p.strip()])
    if round_data.photo_url:
        for p in round_data.photo_url.split(","):
            clean = p.strip()
            if clean and clean not in all_photos:
                all_photos.append(clean)
    if all_photos:
        db_data["photo_url"] = ",".join(all_photos)

    # Consolidate issues if multi-tab
    all_issues = []
    if round_data.ipd_issues and round_data.ipd_issues.strip():
        all_issues.append(f"[IPD]: {round_data.ipd_issues.strip()}")
    if round_data.discharge_issues and round_data.discharge_issues.strip():
        all_issues.append(f"[Post-Discharge]: {round_data.discharge_issues.strip()}")
    if round_data.opd_issues and round_data.opd_issues.strip():
        all_issues.append(f"[OPD]: {round_data.opd_issues.strip()}")
    if all_issues:
        db_data["issues_faced"] = "\n".join(all_issues)

    db_round = PatientRound(**db_data)
    db.add(db_round)
    db.commit()
    db.refresh(db_round)

    supervisors_channel_id = settings.SUPERVISORS_CHANNEL_ID
    
    if supervisors_channel_id:
        # Detect filled categories
        is_ipd = bool(round_data.ipd_filled)
        is_discharge = bool(round_data.discharge_filled)
        is_opd = bool(round_data.opd_filled)

        # Fallback to legacy fields/round_type if explicit flags weren't provided
        if not is_ipd and not is_discharge and not is_opd:
            r_type = (round_data.round_type or "").lower()
            if "discharge" in r_type or round_data.discharge_readiness is not None or round_data.discharge_smooth is not None:
                is_discharge = True
            elif "opd" in r_type:
                is_opd = True
            else:
                is_ipd = True

        # Display title
        titles = []
        if is_ipd: titles.append("IPD")
        if is_discharge: titles.append("Post-Discharge")
        if is_opd: titles.append("OPD")
        if len(titles) > 1:
            display_title = " & ".join(titles) + " Feedback"
        elif len(titles) == 1:
            display_title = titles[0] + " Feedback" if titles[0] != "Post-Discharge" else "Post-Discharge"
        else:
            display_title = round_data.round_type or "Patient Round"

        # Determine negative feedback / urgency
        has_negative_feedback = False
        if is_ipd:
            if round_data.clear_on_diagnosis is False: has_negative_feedback = True
            if round_data.doctors_attending is False: has_negative_feedback = True
            if round_data.staff_polite is False: has_negative_feedback = True
            if round_data.cleanliness_satisfied is False: has_negative_feedback = True
            if round_data.gown_and_linens_changed is False: has_negative_feedback = True
            if (round_data.ipd_health_status or round_data.health_status) == "Poor": has_negative_feedback = True

        if is_discharge:
            smooth = round_data.discharge_smooth if round_data.discharge_smooth is not None else round_data.discharge_readiness
            if smooth is False: has_negative_feedback = True

        if is_opd:
            exp = round_data.opd_experience or round_data.health_status
            if exp in ("Poor", "Fair"): has_negative_feedback = True

        is_urgent = (
            round_data.urgency_flag == "High"
            or (is_ipd and (round_data.ipd_health_status or round_data.health_status) == "Poor")
            or (is_opd and round_data.opd_experience == "Poor")
        )
        needs_follow_up = round_data.requires_follow_up or has_negative_feedback
        alert_emoji = "🚨 " if is_urgent else "⚠️ " if (has_negative_feedback or needs_follow_up) else "✅ "

        lines = [
            f"{alert_emoji} **Patient Round Completed — {display_title}**\n",
            f"**Patient:** {patient.name} (Room: {patient.room_no})",
            f"**Consultant:** {patient.consultant}",
        ]

        # 1. IPD Feedback Section (only if IPD was filled)
        if is_ipd:
            lines.append("\n**IPD Feedback:**")
            h_status = round_data.ipd_health_status or round_data.health_status
            if h_status and h_status != "Discharged":
                lines.append(f"- Health status today: {h_status}")
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
            
            ipd_iss = (round_data.ipd_issues or "").strip()
            if not ipd_iss and not is_discharge and not is_opd and round_data.issues_faced:
                ipd_iss = round_data.issues_faced.strip()
            if ipd_iss:
                lines.append(f"- Specific Issues: {ipd_iss}")

            if round_data.ipd_photos:
                lines.append("**Attached Photos (IPD):**")
                for img in round_data.ipd_photos:
                    if img.strip():
                        lines.append(f"![IPD Photo]({img.strip()})")

        # 2. Post-Discharge Section (only if Post-Discharge was filled)
        if is_discharge:
            lines.append("\n**Post-Discharge Feedback:**")
            smooth = round_data.discharge_smooth if round_data.discharge_smooth is not None else round_data.discharge_readiness
            if smooth is not None:
                lines.append(f"- Was the discharge process smooth? {'Yes' if smooth else 'No'}")
            
            dis_iss = (round_data.discharge_issues or "").strip()
            if not dis_iss and not is_ipd and not is_opd and round_data.issues_faced:
                dis_iss = round_data.issues_faced.strip()
            if dis_iss:
                lines.append(f"- Specific Issues / Complaints: {dis_iss}")

            if round_data.discharge_photos:
                lines.append("**Attached Photos (Post-Discharge):**")
                for img in round_data.discharge_photos:
                    if img.strip():
                        lines.append(f"![Post-Discharge Photo]({img.strip()})")

        # 3. OPD Section (only if OPD was filled)
        if is_opd:
            lines.append("\n**OPD Feedback:**")
            exp = round_data.opd_experience or (round_data.health_status if not is_ipd else None)
            if exp:
                lines.append(f"- Overall Experience: {exp}")
            
            opd_iss = (round_data.opd_issues or "").strip()
            if not opd_iss and not is_ipd and not is_discharge and round_data.issues_faced:
                opd_iss = round_data.issues_faced.strip()
            if opd_iss:
                lines.append(f"- Specific Issues: {opd_iss}")

            if round_data.opd_photos:
                lines.append("**Attached Photos (OPD):**")
                for img in round_data.opd_photos:
                    if img.strip():
                        lines.append(f"![OPD Photo]({img.strip()})")

        # Fallback if photos were attached globally without per-tab list
        if not round_data.ipd_photos and not round_data.discharge_photos and not round_data.opd_photos and round_data.photo_url:
            photo_links = round_data.photo_url.split(',')
            lines.append("\n**Attached Photos:**")
            for link in photo_links:
                if link.strip():
                    lines.append(f"![Patient Photo]({link.strip()})")

        if round_data.manager_remarks and round_data.manager_remarks.strip():
            lines.append(f"\n**Manager Remarks:**\n{round_data.manager_remarks.strip()}")

        lines.append(f"\n*Submitted by {round_data.nurse_name}*")
        message = "\n".join(lines)

        try:
            client = BuzzClient()
            await client.post_channel_message(supervisors_channel_id, message)
            logger.info("Posted patient round summary to supervisors channel")
        except Exception as exc:
            logger.error(f"Failed to post round summary to Buzz: {exc}")

    return db_round
