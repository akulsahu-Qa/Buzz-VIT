"""
Workflow configuration registry (backend)

This mirrors the frontend's workflowRegistry.ts.
Workflow tasks and metadata are defined here once — both the
API responses and the Buzz message text come from this source.

To add a new workflow:
  1. Add a new WorkflowConfig entry to WORKFLOW_REGISTRY
  2. Register it in the dict at the bottom
  3. Done — no API code changes needed
"""

from dataclasses import dataclass
from typing import Optional
from models import WorkflowTask


@dataclass
class WorkflowConfig:
    workflow_type: str
    name: str
    description: str
    department: str
    frequency: str
    icon: str
    tasks: list[WorkflowTask]
    timeout_minutes: Optional[int] = None


# ── ECG Machine Check ──────────────────────────────────────────────────────────

ECG_MACHINE_CHECK = WorkflowConfig(
    workflow_type="ecg-machine-check",
    name="ECG Machine Check",
    description="Daily morning inspection of the ECG machine per standard operating protocol.",
    department="Nursing",
    frequency="Daily (Morning)",
    icon="🫀",
    tasks=[
        WorkflowTask(
            id="paper-roll-stock",
            label="Check paper roll stock",
            description="Verify sufficient paper roll is loaded and spare rolls are available.",
            sop_hint="Replace if less than 20% remaining",
        ),
        WorkflowTask(
            id="cable-integrity",
            label="Check cable integrity",
            description="Inspect all lead cables and connectors for damage, fraying, or loose ends.",
            sop_hint="Tag and remove any damaged cables from service",
        ),
        WorkflowTask(
            id="battery-charging-status",
            label="Check battery charging status",
            description="Confirm the machine is on charge or has sufficient battery for the day.",
            sop_hint="Battery should read ≥80% before morning rounds",
        ),
        WorkflowTask(
            id="test-run",
            label="Perform test run",
            description="Run a short test ECG to confirm signal quality and machine output.",
            sop_hint="Test trace should be clean with no baseline wander",
        ),
    ],
    timeout_minutes=1,
)

# ── Registry ───────────────────────────────────────────────────────────────────

WORKFLOW_REGISTRY: dict[str, WorkflowConfig] = {
    ECG_MACHINE_CHECK.workflow_type: ECG_MACHINE_CHECK,
    # Add future workflows here:
    # MEDICATION_CHECK.workflow_type: MEDICATION_CHECK,
}


def get_workflow_config(workflow_type: str) -> Optional[WorkflowConfig]:
    return WORKFLOW_REGISTRY.get(workflow_type)
