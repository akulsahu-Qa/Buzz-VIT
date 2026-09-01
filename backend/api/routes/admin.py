from fastapi import APIRouter, Depends, HTTPException
import logging

from api.dependencies import get_admin_api_key
from services.buzz_client import BuzzClient
from core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(dependencies=[Depends(get_admin_api_key)])

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
