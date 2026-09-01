import { useState } from "react";
import type { WorkflowTask } from "./types";

interface ChecklistItemProps {
  task: WorkflowTask;
  index: number;
  checked: boolean;
  onChange: (checked: boolean) => void;
  accentColor: string;
}

export function ChecklistItem({
  task,
  index,
  checked,
  onChange,
  accentColor,
}: ChecklistItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      className={`checklist-item ${checked ? "checked" : ""} ${isHovered ? "hovered" : ""}`}
      onClick={() => onChange(!checked)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-pressed={checked}
      aria-label={`Task ${index + 1}: ${task.label}. ${checked ? "Completed" : "Pending"}`}
      style={{ "--accent": accentColor } as React.CSSProperties}
    >
      {/* Step number / checkmark */}
      <div className="checklist-item__indicator">
        {checked ? (
          <svg viewBox="0 0 20 20" fill="none" className="check-icon">
            <circle cx="10" cy="10" r="10" fill="currentColor" opacity="0.15" />
            <polyline
              points="5,10 9,14 15,7"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <span className="step-number">{index + 1}</span>
        )}
      </div>

      {/* Task content */}
      <div className="checklist-item__content">
        <p className="checklist-item__label">{task.label}</p>
        {task.description && (
          <p className="checklist-item__description">{task.description}</p>
        )}
        {task.sopHint && (
          <p className="checklist-item__sop">
            <span className="sop-tag">SOP</span>
            {task.sopHint}
          </p>
        )}
      </div>

      {/* Status badge */}
      <div className="checklist-item__status">
        {checked ? (
          <span className="status-badge status-badge--done">Done</span>
        ) : (
          <span className="status-badge status-badge--pending">Pending</span>
        )}
      </div>
    </button>
  );
}
