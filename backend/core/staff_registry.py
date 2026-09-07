import os
from typing import Optional, TypedDict
from dotenv import load_dotenv

class StaffMember(TypedDict):
    id: str
    name: str
    role: str
    pubkey: str

# Configurable staff list for demo and operational dispatch
def get_demo_staff() -> list[StaffMember]:
    """Dynamically resolves staff list from environment variables on every call."""
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
    load_dotenv(dotenv_path=env_path, override=True)
    return [
        {
            "id": "test_manager",
            "name": os.environ.get("TEST_MANAGER_NAME", "ALOK"),
            "role": "MANAGER",
            "pubkey": os.environ.get(
                "TEST_MANAGER_PUBKEY", 
                "6ffeefa1c96c9e7ea9bf0a8648908db8d8b1671de0d4d8906ba9ed505ad5f3dd"
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
