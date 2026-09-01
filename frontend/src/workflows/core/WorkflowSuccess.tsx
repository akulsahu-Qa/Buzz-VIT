interface WorkflowSuccessProps {
  workflowName: string;
  nurseName?: string;
  completedAt: string;
  icon: string;
  accentColor: string;
  taskCount: number;
}

export function WorkflowSuccess({
  workflowName,
  nurseName,
  completedAt,
  icon,
  accentColor,
  taskCount,
}: WorkflowSuccessProps) {
  const formatted = new Date(completedAt).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div
      className="success-screen"
      style={{ "--accent": accentColor } as React.CSSProperties}
    >
      <div className="success-screen__burst">
        <div className="burst-ring burst-ring--1" />
        <div className="burst-ring burst-ring--2" />
        <div className="burst-ring burst-ring--3" />
        <div className="success-screen__icon">{icon}</div>
      </div>

      <h1 className="success-screen__title">All Done!</h1>
      <p className="success-screen__subtitle">
        {workflowName} completed successfully
      </p>

      {nurseName && (
        <p className="success-screen__nurse">by {nurseName}</p>
      )}

      <div className="success-screen__meta">
        <div className="meta-pill">
          <span className="meta-pill__label">Completed at</span>
          <span className="meta-pill__value">{formatted}</span>
        </div>
        <div className="meta-pill">
          <span className="meta-pill__label">Tasks verified</span>
          <span className="meta-pill__value">{taskCount} / {taskCount}</span>
        </div>
      </div>

      <p className="success-screen__note">
        ✉️ Supervisor channel has been notified automatically.
      </p>
    </div>
  );
}
