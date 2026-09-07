"""
Buzz Relay HTTP Bridge Client

Posts signed Nostr events to the local Buzz relay on behalf of the workflow bot.

Implements Nostr event signing from scratch using:
  - Python's built-in `hashlib` (SHA-256 for event ID)
  - Python's built-in `json` + `secrets` (canonical serialization)
  - `coincurve` (secp256k1 Schnorr signatures — ships pre-built wheels)

Protocol:
- HTTP bridge: POST http://localhost:3000/events  (NIP-98 auth)
- Channel messages: kind=9, NIP-29 group (#h tag for channel routing)

References:
- NIP-01: https://github.com/nostr-protocol/nostr/blob/master/01.md
- NIP-29: https://github.com/nostr-protocol/nostr/blob/master/29.md
- NIP-98: https://github.com/nostr-protocol/nostr/blob/master/98.md
"""

import base64
import hashlib
import json
import os
import secrets
import time
import logging
from typing import Any, Optional

import httpx
from services.nostr_sign import privkey_to_pubkey_hex, schnorr_sign_hex, npub_to_hex

logger = logging.getLogger(__name__)


# ── Nostr event helpers ────────────────────────────────────────────────────────

def _compute_event_id(pubkey: str, created_at: int, kind: int, tags: list, content: str) -> str:
    """NIP-01: event ID = SHA256 of canonical serialisation."""
    serialised = json.dumps(
        [0, pubkey, created_at, kind, tags, content],
        separators=(",", ":"),
        ensure_ascii=False,
    )
    return hashlib.sha256(serialised.encode("utf-8")).hexdigest()


def _schnorr_sign(event_id_hex: str, privkey_hex: str) -> str:
    """
    NIP-01: sign the event ID with BIP-340 Schnorr (pure Python, no OpenSSL).
    """
    return schnorr_sign_hex(event_id_hex, privkey_hex)


def _build_event(
    privkey_hex: str,
    pubkey: str,
    kind: int,
    content: str,
    tags: list[list[str]],
) -> dict[str, Any]:
    """Assemble and sign a complete Nostr event."""
    created_at = int(time.time())
    event_id = _compute_event_id(pubkey, created_at, kind, tags, content)
    sig = _schnorr_sign(event_id, privkey_hex)
    return {
        "id": event_id,
        "pubkey": pubkey,
        "created_at": created_at,
        "kind": kind,
        "tags": tags,
        "content": content,
        "sig": sig,
    }


def _nip98_auth_header(event: dict[str, Any]) -> str:
    """Encode a signed event as a NIP-98 Authorization header value."""
    encoded = base64.b64encode(json.dumps(event).encode()).decode()
    return f"Nostr {encoded}"


# ── Buzz client ────────────────────────────────────────────────────────────────

class BuzzClient:
    """
    Thin HTTP client for posting signed Nostr events to the Buzz relay.

    Usage:
        client = BuzzClient()
        await client.post_channel_message(channel_id, "Hello, nurses!")
    """

    def __init__(self) -> None:
        self.relay_http_url = os.environ.get(
            "BUZZ_RELAY_HTTP_URL", "http://localhost:3000"
        ).rstrip("/")

        privkey_hex = os.environ.get("BOT_PRIVATE_KEY", "")
        if not privkey_hex:
            raise RuntimeError(
                "BOT_PRIVATE_KEY is not set. "
                "Generate one with: buzz-admin generate-key --name workflow-bot\n"
                "Or use any 32-byte hex string as a test key."
            )

        self._privkey_hex = privkey_hex
        # Nostr public key = x-coordinate of secp256k1 point (32 bytes, hex)
        self._pubkey = privkey_to_pubkey_hex(bytes.fromhex(privkey_hex))

    def _make_nip98_auth(self, url: str, method: str = "POST") -> str:
        """Build and sign a NIP-98 HTTP auth event."""
        auth_event = _build_event(
            privkey_hex=self._privkey_hex,
            pubkey=self._pubkey,
            kind=27235,
            content="",
            tags=[["u", url], ["method", method]],
        )
        return _nip98_auth_header(auth_event)

    async def post_channel_message(self, channel_id: str, content: str) -> str:
        """
        Post a kind=9 NIP-29 group message to a Buzz channel.
        Returns the Nostr event ID.
        """
        endpoint = f"{self.relay_http_url}/events"
        event = _build_event(
            privkey_hex=self._privkey_hex,
            pubkey=self._pubkey,
            kind=9,
            content=content,
            tags=[["h", channel_id]],
        )
        auth_header = self._make_nip98_auth(endpoint)

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                endpoint,
                json=event,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": auth_header,
                },
            )
            if response.status_code not in (200, 201):
                logger.error(
                    "Buzz relay error: HTTP %s — %s",
                    response.status_code,
                    response.text[:300],
                )
                response.raise_for_status()

            logger.info("Posted event %s to channel %s", event["id"], channel_id)
            return event["id"]

    async def open_dm(self, recipient_pubkey: str) -> str:
        """
        Opens or retrieves a 1-on-1 private DM channel with the recipient on Buzz.
        Uses signed kind:41010 command event with tag ["p", recipient_pubkey_hex].
        Returns the DM channel_id (UUID).
        Idempotent: returns existing channel_id if DM is already open.
        """
        recipient_hex = npub_to_hex(recipient_pubkey)
        endpoint = f"{self.relay_http_url}/events"

        event = _build_event(
            privkey_hex=self._privkey_hex,
            pubkey=self._pubkey,
            kind=41010,
            content="",
            tags=[["p", recipient_hex]],
        )
        auth_header = self._make_nip98_auth(endpoint)

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                endpoint,
                json=event,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": auth_header,
                },
            )
            if response.status_code not in (200, 201):
                logger.error(
                    "Buzz open_dm error: HTTP %s — %s",
                    response.status_code,
                    response.text[:300],
                )
                response.raise_for_status()

            data = response.json()
            msg = data.get("message", "")
            channel_id = None
            if msg.startswith("response:"):
                inner = json.loads(msg[len("response:"):])
                channel_id = inner.get("channel_id")
            elif "channel_id" in data:
                channel_id = data["channel_id"]

            if not channel_id:
                raise RuntimeError(f"Could not extract channel_id from open_dm response: {data}")

            logger.info("Opened/retrieved DM channel %s with recipient %s", channel_id, recipient_hex)
            return channel_id

    async def send_direct_message(self, recipient_pubkey: str, content: str) -> dict[str, str]:
        """
        Sends a direct message to a user on Buzz.
        Opens/retrieves the DM channel (kind 41010) and posts the message (kind 9).
        Returns {"channel_id": channel_id, "event_id": event_id}.
        """
        channel_id = await self.open_dm(recipient_pubkey)
        event_id = await self.post_channel_message(channel_id, content)
        return {"channel_id": channel_id, "event_id": event_id}


    async def post_nurse_task_notification(
        self,
        channel_id: str,
        workflow_id: str,
        workflow_config: Any,
        checklist_base_url: str,
        nurse_name: str = "Staff Nurse",
    ) -> str:
        """Posts the task assignment message to the nurses channel."""
        task_list = "\n".join(f"  ☐ {t.label}" for t in workflow_config.tasks)
        checklist_url = (
            f"{checklist_base_url}/checklist"
            f"?workflow_id={workflow_id}"
            f"&type={workflow_config.workflow_type}"
        )
        content = (
            f"{workflow_config.icon} {workflow_config.name} — {workflow_config.frequency}\n\n"
            f"{nurse_name}, your morning equipment check is due.\n\n"
            f"Please complete the following:\n{task_list}\n\n"
            f"👉 Open Checklist: {checklist_url}"
        )
        return await self.post_channel_message(channel_id, content)

    async def post_generic_task_notification(
        self,
        channel_id: str,
        workflow_id: str,
        task_id: str,
        phase_id: str,
        checklist_base_url: str,
        assignee_name: str,
    ) -> str:
        """Posts a generic task assignment message to Buzz."""
        task_url = (
            f"{checklist_base_url}/task"
            f"?task_id={task_id}"
            f"&phase_id={phase_id}"
        )
        
        display_phase = phase_id.replace("_", " ").title()
        
        content = (
            f"📋 **Task Assignment: {display_phase}**\n\n"
            f"Hello {assignee_name},\n"
            f"You have been assigned a new task for workflow `{workflow_id}`.\n\n"
            f"👉 Open Task Form: {task_url}"
        )
        return await self.post_channel_message(channel_id, content)

    async def post_generic_task_completion(
        self,
        channel_id: str,
        workflow_id: str,
        task_id: str,
        phase_id: str,
        assignee_name: str,
        payload: Optional[dict] = None,
    ) -> str:
        """Posts a generic task completion message to Buzz."""
        display_phase = phase_id.replace("_", " ").title()
        
        content = f"✅ **Task Completed: {display_phase}**\n\n"
        
        if phase_id == "roster_creation" and payload and "assigned_staff" in payload:
            content += f"Roster Created: **{payload['assigned_staff']}** has been assigned for the upcoming week.\n"
        elif phase_id == "shift_handover" and payload:
            handover_to = payload.get("handover_to", "Unknown")
            open_items = payload.get("open_items", "None")
            content += f"Shift handed over to **{handover_to}**.\n**Open Items:** {open_items}\n"
        elif phase_id == "shift_checkin":
            content += f"**{assignee_name}** has checked in for their shift.\n"
        else:
            content += f"{assignee_name} has successfully completed the task for workflow `{workflow_id}`.\n"
            
        content += f"\n*(Task ID: `{task_id}`)*"
        
        return await self.post_channel_message(channel_id, content)

    async def post_generic_task_exception(
        self,
        channel_id: str,
        workflow_id: str,
        task_id: str,
        phase_id: str,
        assignee_name: str,
        validation_errors: list[str],
    ) -> str:
        """Posts a generic task exception alert to Buzz."""
        display_phase = phase_id.replace("_", " ").title()
        errors = "\n".join(f"- {e}" for e in validation_errors)
        content = (
            f"🚨 **Exception Alert: {display_phase}**\n\n"
            f"{assignee_name} submitted an incomplete or failing form for workflow `{workflow_id}`.\n\n"
            f"**Issues Detected:**\n{errors}\n\n"
            f"Please investigate Task ID: `{task_id}`"
        )
        return await self.post_channel_message(channel_id, content)

    async def post_escalation_alert(
        self,
        channel_id: str,
        phase_id: str,
        original_assignee: str,
        reason: str,
    ) -> str:
        """Posts an escalation task purely as an alert for manual coordination, without a task link."""
        display_phase = phase_id.replace("_", " ").title()
        
        content = (
            f"🚨 **Manual Coordination Required: {display_phase}**\n\n"
            f"An issue was escalated by **{original_assignee}**.\n"
            f"**Reported Issue:** {reason}\n\n"
            f"*(No digital form required. Please coordinate directly with the floor staff to resolve.)*"
        )
        return await self.post_channel_message(channel_id, content)

    async def post_supervisor_completion(
        self,
        channel_id: str,
        workflow_config: Any,
        nurse_name: str,
        completed_at: str,
        photo_urls: Optional[list[str]] = None,
    ) -> str:
        """Posts the completion notification to the supervisors channel."""
        task_list = "\n".join(f"  ✓ {t.label}" for t in workflow_config.tasks)
        content = (
            f"✅ {workflow_config.name} — Completed\n\n"
            f"{nurse_name} has completed the {workflow_config.frequency} check.\n"
            f"Completed at: {completed_at}\n\n"
            f"Tasks verified:\n{task_list}"
        )
        if photo_urls:
            content += "\n\n**Attached Photos:**\n"
            for url in photo_urls:
                content += f"![Attached Photo]({url})\n"
        return await self.post_channel_message(channel_id, content)
