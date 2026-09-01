/**
 * Workflow Registry
 *
 * Register new workflows here. The rest of the system (routing, API lookup)
 * uses this map automatically.
 *
 * To add a new workflow:
 *   1. Create `src/workflows/your-workflow/yourWorkflowConfig.ts`
 *   2. Import and add it here
 *   3. Done — no UI code changes required
 */

import type { WorkflowConfig } from "./types";
import { ecgCheckConfig } from "../nurse/ecg-check/ecgCheckConfig";

export const workflowRegistry: Record<string, WorkflowConfig> = {
  [ecgCheckConfig.workflowType]: ecgCheckConfig,
  // future workflows:
  // [medicationCheckConfig.workflowType]: medicationCheckConfig,
  // [vitalSignsConfig.workflowType]: vitalSignsConfig,
};

export function getWorkflowConfig(workflowType: string): WorkflowConfig | undefined {
  return workflowRegistry[workflowType];
}
