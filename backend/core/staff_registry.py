import os
from typing import Optional, TypedDict

class StaffMember(TypedDict):
    id: str
    name: str
    role: str
    pubkey: str

# Configurable staff list for demo and operational dispatch
def get_demo_staff() -> list[StaffMember]:
    """Dynamically resolves staff list from environment variables on every call."""
    return [
        {
            "id": "test_manager",
            "name": "Test Manager",
            "role": "MANAGER",
            "pubkey": os.environ.get(
                "TEST_MANAGER_PUBKEY", 
                "0df805e06d9b97d236cb59c0b0ca4f2869994eb09a2236c4e28bac5cac4c7168"
            ).strip(),
        },
        {
            "id": "nurse_jitendar",
            "name": "Staff Nurse Jitendar",
            "role": "NURSE",
            "pubkey": os.environ.get("NURSE_JITENDAR_PUBKEY", "").strip(),
        },
        {
            "id": "duty_manager",
            "name": "Duty Manager",
            "role": "MANAGER",
            "pubkey": os.environ.get("DUTY_MANAGER_PUBKEY", "").strip(),
        },
    ]

def get_staff_list() -> list[dict]:
    """Returns staff members formatted for the UI picker."""
    return [
        {
            "id": s["id"],
            "name": s["name"],
            "role": s["role"],
            "has_dm": bool(s["pubkey"]),
            "pubkey_preview": f"{s['pubkey'][:8]}...{s['pubkey'][-6:]}" if s["pubkey"] else None,
        }
        for s in get_demo_staff()
    ]

def get_staff_by_id(staff_id: str) -> Optional[StaffMember]:
    for s in get_demo_staff():
        if s["id"] == staff_id:
            return s
    return None
