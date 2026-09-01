import { useSearchParams } from "react-router-dom";
import { WorkflowChecklist } from "../../core/WorkflowChecklist";
import { ecgCheckConfig } from "./ecgCheckConfig";

/**
 * ECG Machine Check page
 *
 * Thin wrapper — passes the ECG-specific local config to the generic template.
 * The workflow_id comes from the URL: /checklist?workflow_id=<id>
 */
export function ECGChecklist() {
  const [params] = useSearchParams();
  const workflowId = params.get("workflow_id") ?? "";

  return (
    <WorkflowChecklist
      workflowId={workflowId}
      localConfig={ecgCheckConfig}
    />
  );
}
