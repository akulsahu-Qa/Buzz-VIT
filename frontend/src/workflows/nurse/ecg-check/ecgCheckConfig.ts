import type { WorkflowConfig } from "../../core/types";

/**
 * ECG Machine Check — Daily Morning Workflow
 *
 * Based on: Staff Nurse Daily Duty Task & Checklist Sheet
 * SOP: Check paper roll stock, cable integrity, battery charging status, and perform test run.
 */
export const ecgCheckConfig: WorkflowConfig = {
  workflowType: "ecg-machine-check",
  name: "ECG Machine Check",
  description:
    "Daily morning inspection of the ECG machine per standard operating protocol.",
  department: "Nursing",
  frequency: "Daily (Morning)",
  icon: "🫀",
  accentColor: "hsl(210, 85%, 55%)",
  tasks: [
    {
      id: "paper-roll-stock",
      label: "Check paper roll stock",
      description: "Verify sufficient paper roll is loaded and spare rolls are available.",
      sopHint: "Replace if less than 20% remaining",
    },
    {
      id: "cable-integrity",
      label: "Check cable integrity",
      description: "Inspect all lead cables and connectors for damage, fraying, or loose ends.",
      sopHint: "Tag and remove any damaged cables from service",
    },
    {
      id: "battery-charging-status",
      label: "Check battery charging status",
      description: "Confirm the machine is on charge or has sufficient battery for the day.",
      sopHint: "Battery should read ≥80% before morning rounds",
    },
    {
      id: "test-run",
      label: "Perform test run",
      description: "Run a short test ECG to confirm signal quality and machine output.",
      sopHint: "Test trace should be clean with no baseline wander",
    },
  ],
};
