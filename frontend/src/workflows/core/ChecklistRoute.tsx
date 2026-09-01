import { useSearchParams } from "react-router-dom";
import { WorkflowChecklist } from "./WorkflowChecklist";
import { workflowRegistry } from "./workflowRegistry";

/**
 * Dynamic checklist route
 *
 * /checklist?workflow_id=<id>&type=ecg-machine-check
 *
 * The `type` param (optional) tells the frontend which local config to pre-load
 * so the UI shows instantly without waiting for the API.
 * If `type` is omitted, the component still works — it just fetches everything from the API.
 */
export function ChecklistRoute() {
  const [params] = useSearchParams();
  const workflowId = params.get("workflow_id") ?? "";
  const workflowType = params.get("type") ?? "";
  const localConfig = workflowRegistry[workflowType];

  return <WorkflowChecklist workflowId={workflowId} localConfig={localConfig} />;
}
