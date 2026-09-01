/**
 * Generic Workflow Checklist Type System
 *
 * To add a new workflow:
 * 1. Create a new config file in `./your-workflow/yourWorkflowConfig.ts`
 * 2. Export an object implementing `WorkflowConfig`
 * 3. Register it in `workflowRegistry.ts`
 * The UI (WorkflowChecklist) renders it automatically — no UI changes needed.
 */

export interface WorkflowTask {
  id: string;
  label: string;
  /** Optional sub-description shown under the task label */
  description?: string;
  /** Optional SOP reference or hint text */
  sopHint?: string;
}

export interface WorkflowConfig {
  /** Unique machine-readable identifier — used in URLs and API */
  workflowType: string;
  /** Human-readable name shown at the top of the checklist page */
  name: string;
  /** Short description of what this workflow accomplishes */
  description: string;
  /** Department / unit label */
  department: string;
  /** How often this runs (e.g. "Daily (Morning)") */
  frequency: string;
  /** The 4 (or more) tasks the staff must complete */
  tasks: WorkflowTask[];
  /** Icon emoji shown on the checklist page header */
  icon: string;
  /** Accent color for this workflow (CSS hsl string or hex) */
  accentColor: string;
}

export interface WorkflowExecution {
  workflowId: string;
  workflowType: string;
  config: WorkflowConfig;
  triggeredAt: string;
  nurseId?: string;
  nurseName?: string;
  status: "pending" | "completed";
  completedAt?: string;
  tasksCompleted: boolean[];
}

export interface ApiChecklist {
  workflow_id: string;
  workflow_type: string;
  triggered_at: string;
  status: string;
  tasks: Array<{
    id: string;
    label: string;
    description?: string;
    sop_hint?: string;
  }>;
  nurse_name?: string;
  department: string;
  frequency: string;
}
