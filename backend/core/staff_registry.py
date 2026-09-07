import os
from typing import Optional, TypedDict

class StaffMember(TypedDict):
    id: str
    name: str
    role: str
    pubkey: str

# Configurable staff list for demo and operational dispatch
DEMO_STAFF: list[StaffMember] = [
    {
        "id": "test_manager",
        "name": "Test Manager",
        "role": "MANAGER",
        "pubkey": os.environ.get("TEST_MANAGER_PUBKEY", "TEST_MANAGER_PUBKEY_PLACEHOLDER"),
    },
    {
        "id": "nurse_jitendar",
        "name": "Staff Nurse Jitendar",
        "role": "NURSE",
        "pubkey": os.environ.get("NURSE_JITENDAR_PUBKEY", ""),
    },
    {
        "id": "duty_manager",
        "name": "Duty Manager",
        "role": "MANAGER",
        "pubkey": os.environ.get("DUTY_MANAGER_PUBKEY", ""),
    },
]

def get_staff_list() -> list[dict]:
    """Returns staff members formatted for the UI picker."""
    return [
        {
            "id": s["id"],
            "name": s["name"],
            "role": s["role"],
            "has_dm": bool(s["pubkey"] and s["pubkey"] != "TEST_MANAGER_PUBKEY_PLACEHOLDER"),
            "pubkey_preview": f"{s['pubkey'][:8]}...{s['pubkey'][-6:]}" if s["pubkey"] and s["pubkey"] != "TEST_MANAGER_PUBKEY_PLACEHOLDER" else None,
        }
        for s in DEMO_STAFF
    ]

def get_staff_by_id(staff_id: str) -> Optional[StaffMember]:
    for s in DEMO_STAFF:
        if s["id"] == staff_id:
            return s
    return None
