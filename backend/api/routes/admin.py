import urllib.parse
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import logging
import time
from typing import Optional

from api.dependencies import get_admin_api_key
from services.buzz_client import BuzzClient
from core.config import settings
from core.staff_registry import get_staff_list, get_staff_by_id

logger = logging.getLogger(__name__)

router = APIRouter(dependencies=[Depends(get_admin_api_key)])

class DispatchTaskRequest(BaseModel):
    staff_id: str
    task_type: str  # "patient_round", "shift_checkin", "preshift", "readiness_checklist"
    custom_note: Optional[str] = None
    custom_pubkey: Optional[str] = None

@router.get("/staff", summary="Get list of available staff members for task dispatch")
async def list_staff():
    return get_staff_list()

@router.post("/tasks/dispatch", summary="Dispatch a task directly to a user DM (or channel fallback)")
async def dispatch_task_to_user(req: DispatchTaskRequest):
    staff = get_staff_by_id(req.staff_id)
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")

    client = BuzzClient()
    checklist_base_url = settings.CHECKLIST_BASE_URL
    task_url = None
    encoded_name = urllib.parse.quote(staff["name"])
    staff_query = f"staff_id={staff['id']}&staff_name={encoded_name}"

    # Construct the specific task message and action link
    if req.task_type == "patient_round":
        task_url = f"{checklist_base_url}/rounds?{staff_query}"
        message = (
            f"📋 **Patient Rounds Assignment**\n\n"
            f"Hello {staff['name']},\n"
            f"Your daily patient rounds are due. Please conduct rounds and submit the feedback form:\n\n"
            f"👉 [Start Patient Rounds]({task_url})"
        )
    elif req.task_type == "shift_checkin":
        task_id = f"checkin-{int(time.time())}"
        task_url = f"{checklist_base_url}/task?task_id={task_id}&phase_id=shift_checkin&{staff_query}"
        message = (
            f"📍 **Shift Check-in Required**\n\n"
            f"Hello {staff['name']},\n"
            f"Your shift starts now. Please verify your location and check in:\n\n"
            f"👉 [Complete Shift Check-in]({task_url})"
        )
    elif req.task_type == "readiness_checklist":
        task_id = f"readiness-{int(time.time())}"
        task_url = f"{checklist_base_url}/checklist?workflow_id={task_id}&type=ecg-machine-check&{staff_query}"
        message = (
            f"🩺 **Daily Equipment Check Due**\n\n"
            f"Hello {staff['name']},\n"
            f"Please complete the morning equipment readiness inspection:\n\n"
            f"👉 [Open Equipment Checklist]({task_url})"
        )
    elif req.task_type == "preshift":
        message = (
            f"⏰ **Pre-Shift Reminder**\n\n"
            f"Hello {staff['name']},\n"
            f"Your shift starts in **30 minutes**. Please ensure you are on-site and ready to check in."
        )
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported task type: {req.task_type}")

    if req.custom_note:
        message += f"\n\n*Note: {req.custom_note}*"

    # Attempt Direct Message delivery if user has a configured pubkey (or custom pubkey provided)
    pubkey = req.custom_pubkey.strip() if req.custom_pubkey else staff.get("pubkey", "").strip()
    if pubkey:
        try:
            res = await client.send_direct_message(pubkey, message)
            logger.info("Dispatched task '%s' to %s via DM (channel: %s)", req.task_type, staff['name'], res['channel_id'])
            return {
                "status": "success",
                "delivery": "dm",
                "channel_id": res["channel_id"],
                "event_id": res["event_id"],
                "staff_name": staff["name"],
                "task_url": task_url,
                "message": f"Task sent directly to {staff['name']}'s Buzz DM"
            }
        except Exception as exc:
            logger.warning("Failed to dispatch DM to %s: %s. Falling back to nurses channel.", staff['name'], exc)

    # Fallback to Nurses Channel
    nurses_channel = settings.NURSES_CHANNEL_ID
    if not nurses_channel:
        raise HTTPException(status_code=500, detail="No pubkey for user and NURSES_CHANNEL_ID is not configured")

    channel_message = f"📢 **Task Assigned to @{staff['name']}**\n\n{message}"
    event_id = await client.post_channel_message(nurses_channel, channel_message)
    logger.info("Dispatched task '%s' for %s to nurses channel %s (fallback)", req.task_type, staff['name'], nurses_channel)

    return {
        "status": "success",
        "delivery": "channel_fallback",
        "channel_id": nurses_channel,
        "event_id": event_id,
        "staff_name": staff["name"],
        "task_url": task_url,
        "message": f"Delivered to team channel for @{staff['name']} (fallback)"
    }

@router.post("/trigger-preshift", summary="Simulate 7:30 AM pre-shift notification")
async def trigger_preshift():
    client = BuzzClient()
    nurses_channel = settings.NURSES_CHANNEL_ID
    
    message = (
        "⏰ **Pre-Shift Reminder** ⏰\n\n"
        "Your shift starts in **30 minutes** (at 8:00 AM).\n"
        "Please ensure you are on-site and ready to check in.\n\n"
        "*A check-in link will be sent to you at exactly 8:00 AM.*"
    )
    
    try:
        if nurses_channel:
            await client.post_channel_message(nurses_channel, message)
            logger.info("Sent pre-shift reminder to nurses channel")
        return {"status": "success", "message": "Pre-shift notification sent"}
    except Exception as e:
        logger.error(f"Failed to send pre-shift reminder: {e}")
        raise HTTPException(status_code=500, detail="Failed to send notification")

@router.post("/rounds/trigger", summary="Trigger daily patient rounds reminder")
async def trigger_daily_rounds():
    nurses_channel_id = settings.NURSES_CHANNEL_ID
    checklist_base_url = settings.CHECKLIST_BASE_URL
    rounds_url = f"{checklist_base_url}/rounds"
    
    if nurses_channel_id:
        message = (
            f"📋 **Daily Patient Rounds are due!**\n\n"
            f"Please complete your rounds and log the feedback.\n"
            f"[Start Rounds]({rounds_url})"
        )
        try:
            client = BuzzClient()
            await client.post_channel_message(nurses_channel_id, message)
            logger.info("Posted daily rounds reminder to nurses channel")
        except Exception as exc:
            logger.error(f"Failed to post daily rounds reminder to Buzz: {exc}")
    return {"status": "triggered"}

