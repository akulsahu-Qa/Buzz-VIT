from typing import Tuple, List
from models_v2 import GenericTask, TaskState

def validate_payload(phase_id: str, payload: dict) -> Tuple[bool, List[str]]:
    """
    Validates the submitted payload for a given phase.
    Returns (is_valid, list_of_errors).
    """
    errors = []
    
    if phase_id == "roster_creation":
        if not payload.get("assigned_staff"):
            errors.append("assigned_staff is required to publish a roster.")
            
    elif phase_id == "shift_checkin":
        if not payload.get("checkin_time"):
            errors.append("checkin_time is required.")
        if payload.get("geofence_status") == "out_of_bounds":
            reason = payload.get("reason", "No reason provided")
            errors.append(f"Geofence violation: Staff checked in from outside the hospital boundaries. (Reason: {reason})")
        if payload.get("is_late"):
            reason = payload.get("reason", "No reason provided")
            errors.append(f"Late Check-in: Staff checked in after the 30-minute window. (Reason: {reason})")
            
    elif phase_id == "readiness_checklist":
        if not payload.get("checks_completed"):
            errors.append("All safety checks must be marked as completed.")
            
    elif phase_id == "shift_handover":
        if not payload.get("handover_to"):
            errors.append("Incoming staff owner (handover_to) must be selected.")
            
    elif phase_id == "patient_round":
        ipd = payload.get("ipdData", {})
        opd = payload.get("opdData", {})
        discharge = payload.get("dischargeData", {})
        
        if ipd.get("enabled"):
            if ipd.get("health_status") == "Poor":
                errors.append("IPD Feedback: Patient reported poor health status.")
            if not ipd.get("diagnosis_clear"):
                errors.append("IPD Feedback: Patient is not clear about diagnosis/treatment.")
            if not ipd.get("staff_regular"):
                errors.append("IPD Feedback: Patient reported doctors/nurses are not attending regularly.")
            if not ipd.get("staff_polite"):
                errors.append("IPD Feedback: Patient reported staff behavior issues.")
            if not ipd.get("cleanliness"):
                errors.append("IPD Feedback: Patient is not satisfied with cleanliness.")
            if ipd.get("issue", "").strip():
                errors.append(f"IPD Feedback: {ipd.get('issue')}")
                
        if opd.get("enabled"):
            if opd.get("experience") == "Poor":
                errors.append("OPD Feedback: Patient reported a poor experience.")
            if opd.get("issue", "").strip():
                errors.append(f"OPD Feedback: {opd.get('issue')}")
                
        if discharge.get("enabled"):
            if not discharge.get("smooth_process"):
                errors.append("Post-Discharge Feedback: Process was not smooth.")
            if discharge.get("issue", "").strip():
                errors.append(f"Post-Discharge Feedback: {discharge.get('issue')}")
            
    return len(errors) == 0, errors


def handle_exception(failed_task: GenericTask, errors: List[str]) -> GenericTask:
    """
    Creates an escalation/exception task based on the failed task.
    Returns the new GenericTask.
    """
    new_phase_id = "general_exception"
    
    # Map failed phases to escalation tasks based on the masterplan vision
    if failed_task.phase_id == "shift_checkin" or failed_task.phase_id == "roster_creation":
        new_phase_id = "urgent_coverage"
    elif failed_task.phase_id == "readiness_checklist":
        new_phase_id = "operational_exception"
    elif failed_task.phase_id == "patient_round":
        new_phase_id = "patient_complaint"
    elif failed_task.phase_id == "shift_handover":
        new_phase_id = "handover_dispute"
        
    error_summary = " | ".join(errors)

    escalation_task = GenericTask(
        workflow_instance_id=failed_task.workflow_instance_id,
        parent_task_id=failed_task.id,
        phase_id=new_phase_id,
        assignee_role="MANAGER",
        state=TaskState.ASSIGNED,
        payload={
            "escalated_from": failed_task.phase_id,
            "original_assignee": failed_task.assignee_name,
            "reason": error_summary
        }
    )
    
    return escalation_task
