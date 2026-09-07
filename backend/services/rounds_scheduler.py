import asyncio
import logging
import urllib.parse
from datetime import datetime, timezone, timedelta
from typing import Optional

from core.config import settings
from core.staff_registry import get_demo_staff
from services.buzz_client import BuzzClient

logger = logging.getLogger(__name__)

# Indian Standard Time (UTC+05:30)
IST = timezone(timedelta(hours=5, minutes=30))

_scheduler_running: bool = False
_scheduler_task: Optional[asyncio.Task] = None
_last_dispatched_date: Optional[str] = None
_last_dispatch_result: Optional[dict] = None

async def dispatch_daily_patient_rounds(custom_note: Optional[str] = None) -> dict:
    """
    Dispatches the daily patient rounds task to ALOK (test_manager) via Buzz DM
    (with channel fallback if DM cannot be reached).
    """
    global _last_dispatch_result, _last_dispatched_date

    staff_members = get_demo_staff()
    alok = next((s for s in staff_members if s["id"] == "test_manager"), None)
    if not alok:
        raise RuntimeError("ALOK (test_manager) record not found in staff registry")

    checklist_base_url = settings.CHECKLIST_BASE_URL.rstrip("/")
    encoded_name = urllib.parse.quote(alok["name"])
    task_url = f"{checklist_base_url}/rounds?staff_id={alok['id']}&staff_name={encoded_name}"

    message = (
        f"📋 **Daily Patient Rounds Reminder (12:00 PM)**\n\n"
        f"Hello {alok['name']},\n"
        f"Your 12:00 PM daily patient rounds are due. Please conduct rounds across the wards and log patient feedback:\n\n"
        f"👉 [Start Patient Rounds]({task_url})"
    )
    if custom_note:
        message += f"\n\n*Note: {custom_note}*"

    client = BuzzClient()
    pubkey = alok.get("pubkey", "").strip()

    result = {
        "status": "success",
        "staff_name": alok["name"],
        "pubkey": pubkey,
        "task_url": task_url,
        "dispatched_at_ist": datetime.now(IST).strftime("%Y-%m-%d %H:%M:%S IST"),
    }

    if pubkey:
        try:
            dm_res = await client.send_direct_message(pubkey, message)
            logger.info("Successfully dispatched 12 PM patient rounds DM to %s (channel: %s)", alok["name"], dm_res["channel_id"])
            result["delivery"] = "dm"
            result["channel_id"] = dm_res["channel_id"]
            result["event_id"] = dm_res["event_id"]
            result["message"] = f"Rounds task sent directly to {alok['name']}'s Buzz DM"
            _last_dispatch_result = result
            _last_dispatched_date = datetime.now(IST).strftime("%Y-%m-%d")
            return result
        except Exception as exc:
            logger.warning("Failed to dispatch 12 PM rounds DM to %s: %s. Falling back to nurses channel.", alok["name"], exc)

    # Fallback to nurses channel
    nurses_channel = settings.NURSES_CHANNEL_ID
    if not nurses_channel:
        raise RuntimeError(f"Could not send DM to {alok['name']} and NURSES_CHANNEL_ID is not configured")

    channel_msg = f"📢 **Daily 12:00 PM Patient Rounds Assigned to @{alok['name']}**\n\n{message}"
    event_id = await client.post_channel_message(nurses_channel, channel_msg)
    logger.info("Dispatched 12 PM rounds for %s to nurses channel (fallback: %s)", alok["name"], nurses_channel)

    result["delivery"] = "channel_fallback"
    result["channel_id"] = nurses_channel
    result["event_id"] = event_id
    result["message"] = f"Delivered to team channel for @{alok['name']} (fallback)"
    _last_dispatch_result = result
    _last_dispatched_date = datetime.now(IST).strftime("%Y-%m-%d")
    return result

async def start_rounds_scheduler():
    """
    Background loop running inside FastAPI lifespan.
    Checks time every 25 seconds; triggers dispatch when it is 12:00 PM IST (once per day).
    """
    global _scheduler_running, _last_dispatched_date
    _scheduler_running = True
    logger.info("Patient rounds 12:00 PM IST scheduler started")

    while _scheduler_running:
        try:
            now_ist = datetime.now(IST)
            # Target 12:00 PM (12:00 - 12:01 window)
            if now_ist.hour == 12 and now_ist.minute == 0:
                today_str = now_ist.strftime("%Y-%m-%d")
                if _last_dispatched_date != today_str:
                    logger.info("Triggering scheduled 12:00 PM IST daily rounds dispatch...")
                    try:
                        await dispatch_daily_patient_rounds(custom_note="Automated 12:00 PM Schedule")
                    except Exception as err:
                        logger.error("Error during scheduled rounds dispatch: %s", err, exc_info=True)
            await asyncio.sleep(25)
        except asyncio.CancelledError:
            logger.info("Patient rounds scheduler loop cancelled")
            break
        except Exception as exc:
            logger.error("Unexpected error in patient rounds scheduler loop: %s", exc)
            await asyncio.sleep(30)

def stop_rounds_scheduler():
    global _scheduler_running, _scheduler_task
    _scheduler_running = False
    if _scheduler_task and not _scheduler_task.done():
        _scheduler_task.cancel()

def get_scheduler_status() -> dict:
    now_ist = datetime.now(IST)
    staff_members = get_demo_staff()
    alok = next((s for s in staff_members if s["id"] == "test_manager"), None)
    return {
        "scheduler_active": _scheduler_running,
        "target_time": "12:00 PM IST",
        "current_time_ist": now_ist.strftime("%Y-%m-%d %H:%M:%S %Z"),
        "target_recipient": alok["name"] if alok else "Unknown",
        "target_pubkey_preview": f"{alok['pubkey'][:8]}...{alok['pubkey'][-6:]}" if alok and alok.get("pubkey") else None,
        "last_dispatched_date": _last_dispatched_date,
        "last_dispatch_result": _last_dispatch_result,
    }
