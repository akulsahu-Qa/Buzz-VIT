import { useSearchParams } from "react-router-dom";
import { ManagerOperationsBlock } from "../manager-round/ManagerOperationsBlock";
import { ShiftCheckinBlock } from "../roster-assignment/ShiftCheckinBlock";

export function TaskRoute() {
  const [params] = useSearchParams();
  const taskId = params.get("task_id") ?? "";
  const phaseId = params.get("phase_id") ?? "";

  if (!taskId || !phaseId) {
    return <div className="p-10 text-red-600">Missing task_id or phase_id in URL</div>;
  }

  if (phaseId === "shift_checkin") {
    return <ShiftCheckinBlock taskId={taskId} phaseId={phaseId} />;
  }

  return <ManagerOperationsBlock taskId={taskId} phaseId={phaseId} />;
}
