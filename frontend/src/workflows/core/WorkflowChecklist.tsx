import { useState, useEffect } from "react";
import type { WorkflowConfig, ApiChecklist } from "./types";
import { ChecklistItem } from "./ChecklistItem";
import { WorkflowSuccess } from "./WorkflowSuccess";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

interface WorkflowChecklistProps {
  workflowId: string;
  /** Optional: override config from local registry (falls back to API) */
  localConfig?: WorkflowConfig;
}

type PageState = "loading" | "error" | "ready" | "submitting" | "done" | "reported";

/**
 * Generic Workflow Checklist
 *
 * This component works for ANY workflow — it just needs a `workflowId`
 * from the URL params. The checklist tasks and config come from the backend API.
 *
 * To add a new workflow: create a new config on the backend. This UI adapts
 * automatically.
 */
export function WorkflowChecklist({ workflowId, localConfig }: WorkflowChecklistProps) {
  const [pageState, setPageState] = useState<PageState>("loading");
  const [apiData, setApiData] = useState<ApiChecklist | null>(null);
  const [checkedTasks, setCheckedTasks] = useState<boolean[]>([]);
  const [completedAt, setCompletedAt] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isReporting, setIsReporting] = useState(false);
  const [issueDescription, setIssueDescription] = useState("");
  const [issueReportedSuccess, setIssueReportedSuccess] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);

  // Determine which config to use for display (local is faster, API is authoritative)
  const config = localConfig;

  // Load checklist from API
  useEffect(() => {
    if (!workflowId) {
      setErrorMessage("No workflow ID provided in the URL.");
      setPageState("error");
      return;
    }

    fetch(`${API_BASE}/api/checklists/${workflowId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Workflow not found (${res.status})`);
        return res.json() as Promise<ApiChecklist>;
      })
      .then((data) => {
        setApiData(data);
        setCheckedTasks(new Array(data.tasks.length).fill(false));
        if (data.status === "completed") {
          setCompletedAt(new Date().toISOString());
          setPageState("done");
        } else {
          setPageState("ready");
        }
      })
      .catch((err: Error) => {
        setErrorMessage(err.message ?? "Failed to load checklist.");
        setPageState("error");
      });
  }, [workflowId]);

  const allChecked = checkedTasks.length > 0 && checkedTasks.every(Boolean);
  const checkedCount = checkedTasks.filter(Boolean).length;

  function handleTaskToggle(index: number, checked: boolean) {
    setCheckedTasks((prev) => {
      const next = [...prev];
      next[index] = checked;
      return next;
    });
  }

  const toBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPhotos((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
    // reset input so the same file can be selected again if needed
    e.target.value = '';
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  async function handleSubmit() {
    if (!allChecked) return;
    setPageState("submitting");

    try {
      // 1. Upload photos if any
      const photoUrls: string[] = [];
      for (const photo of photos) {
        const base64_data = await toBase64(photo);
        const uploadRes = await fetch(`${API_BASE}/api/upload-photo`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ base64_data }),
        });
        if (!uploadRes.ok) throw new Error("Photo upload failed");
        const uploadBody = await uploadRes.json();
        photoUrls.push(uploadBody.photo_url);
      }

      // 2. Submit checklist
      const res = await fetch(
        `${API_BASE}/api/checklists/${workflowId}/complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            tasks_completed: checkedTasks,
            photo_urls: photoUrls.length > 0 ? photoUrls : undefined
          }),
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { detail?: string }).detail ?? `Server error (${res.status})`);
      }

      const body = await res.json() as { completed_at: string };
      setCompletedAt(body.completed_at ?? new Date().toISOString());
      setPageState("done");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Submission failed. Please try again.";
      setErrorMessage(message);
      setPageState("error");
    }
  }

  async function handleReportIssue() {
    if (!issueDescription.trim()) return;
    setPageState("submitting");

    try {
      const res = await fetch(
        `${API_BASE}/api/checklists/${workflowId}/report-issue`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nurse_name: apiData?.nurse_name ?? "Unknown",
            issue_description: issueDescription
          }),
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { detail?: string }).detail ?? `Server error (${res.status})`);
      }

      setIssueReportedSuccess(true);
      setIsReporting(false);
      setIssueDescription("");
      setPageState("ready");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Reporting failed.";
      setErrorMessage(message);
      setPageState("error");
    }
  }

  // ── Render states ──────────────────────────────────────────────────────────

  if (pageState === "loading") {
    return (
      <div className="checklist-page">
        <div className="checklist-card loading-card">
          <div className="spinner" />
          <p className="loading-text">Loading checklist…</p>
        </div>
      </div>
    );
  }

  if (pageState === "error") {
    return (
      <div className="checklist-page">
        <div className="checklist-card error-card">
          <span className="error-icon">⚠️</span>
          <h2>Something went wrong</h2>
          <p>{errorMessage}</p>
          <button
            className="btn btn--primary"
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (pageState === "done") {
    const taskCount = apiData?.tasks.length ?? config?.tasks.length ?? 0;
    const workflowName = apiData
      ? apiData.workflow_type
          .split("-")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ")
      : config?.name ?? "Workflow";

    return (
      <div className="checklist-page">
        <WorkflowSuccess
          workflowName={workflowName}
          nurseName={apiData?.nurse_name}
          completedAt={completedAt}
          icon={config?.icon ?? "✅"}
          accentColor={config?.accentColor ?? "hsl(210, 85%, 55%)"}
          taskCount={taskCount}
        />
      </div>
    );
  }

  // Ready or submitting
  const tasks = apiData?.tasks ?? config?.tasks ?? [];
  const accentColor = config?.accentColor ?? "hsl(210, 85%, 55%)";
  const icon = config?.icon ?? "📋";
  const name = config?.name ?? (apiData?.workflow_type ?? "Checklist");

  const frequency = apiData?.frequency ?? config?.frequency ?? "";
  const nurseName = apiData?.nurse_name;

return (
    <div
      className="checklist-page"
      style={{ "--accent": accentColor } as React.CSSProperties}
    >
      <div className="checklist-container">
        <header className="checklist-header">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
            <div className="checklist-header__title" style={{ margin: 0 }}>
              <div className="checklist-header__icon">{icon}</div>
              <h1 style={{ fontSize: "20px" }}>{name}</h1>
            </div>
            
            <button 
              onClick={() => setIsReporting(!isReporting)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: isReporting ? "#FEE2E2" : "#FFF1F2",
                color: "#E11D48",
                border: "1px solid #FECDD3",
                padding: "6px 12px",
                borderRadius: "20px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                transition: "all 0.2s"
              }}
            >
              {isReporting ? "Cancel" : "⚠️ Report Issue"}
            </button>
          </div>
          
          {issueReportedSuccess && (
            <div style={{ padding: "0.75rem", backgroundColor: "#d4edda", color: "#155724", borderRadius: "8px", marginBottom: "1rem", fontSize: "0.9rem" }}>
              ✅ Issue reported to supervisor!
            </div>
          )}

          <p className="checklist-header__meta">
            {nurseName && <>Staff Nurse: <strong>{nurseName}</strong> • </>} {frequency} Check
          </p>
        </header>

        {isReporting && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "12px", padding: "16px", marginBottom: "24px", animation: "slideDown 0.3s ease-out" }}>
            <h3 style={{ color: "#991B1B", margin: "0 0 12px 0", fontSize: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>🚨</span> Send Alert to Supervisor
            </h3>
            <textarea 
              placeholder="Describe the problem (e.g., machine is broken, pads expired...)"
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #FCA5A5", fontFamily: "inherit", resize: "vertical", minHeight: "80px", marginBottom: "12px", backgroundColor: "#ffffff" }}
            />
            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", alignItems: "center" }}>
              <button onClick={() => setIsReporting(false)} style={{ background: "transparent", color: "#6B7280", border: "none", cursor: "pointer", fontWeight: 500, padding: "8px" }}>
                Cancel
              </button>
              <button 
                onClick={handleReportIssue} 
                disabled={!issueDescription.trim() || pageState === "submitting"} 
                style={{ 
                  background: pageState === "submitting" ? "#9CA3AF" : "#EF4444", 
                  color: "white", 
                  border: "none", 
                  padding: "8px 16px", 
                  borderRadius: "6px", 
                  fontWeight: 600, 
                  cursor: pageState === "submitting" ? "not-allowed" : "pointer", 
                  opacity: !issueDescription.trim() ? 0.5 : 1,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                {pageState === "submitting" ? (
                  <>
                    <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px', borderColor: '#ffffff', borderTopColor: 'transparent' }} />
                    Sending Alert...
                  </>
                ) : (
                  "Submit Alert"
                )}
              </button>
            </div>
          </div>
        )}

        {/* Progress */}
        <div className="progress-bar-container">
          <div className="progress-bar-track">
            <div
              className="progress-bar-fill"
              style={{ width: `${tasks.length > 0 ? (checkedCount / tasks.length) * 100 : 0}%` }}
            />
          </div>
          <span className="progress-bar-label">
            {checkedCount} / {tasks.length} completed
          </span>
        </div>

        {/* Task list */}
        <div className="checklist-tasks" role="group" aria-label="Inspection tasks">
          {tasks.map((task, i) => (
            <ChecklistItem
              key={task.id}
              task={{
                id: task.id,
                label: task.label,
                description: task.description,
                sopHint: 'sopHint' in task ? task.sopHint : (task as any).sop_hint,
              }}
              index={i}
              checked={checkedTasks[i] ?? false}
              onChange={(checked) => handleTaskToggle(i, checked)}
              accentColor={accentColor}
            />
          ))}
        </div>

        {/* Submit */}
        <div className="checklist-footer">
          <div className="photo-upload-section" style={{ marginBottom: "16px", textAlign: "left", width: "100%" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: 600, color: "#374151" }}>
              Attach Photos (Optional)
            </label>

            {photos.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
                {photos.map((p, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px", background: "#f3f4f6", borderRadius: "6px" }}>
                    <span style={{ fontSize: "14px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#374151" }}>{p.name}</span>
                    <button type="button" onClick={() => removePhoto(i)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "14px", fontWeight: 500 }}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            <label style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              padding: "12px 16px",
              backgroundColor: "#ffffff",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "15px",
              fontWeight: 500,
              color: "#374151",
              boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)"
            }}>
              <span style={{ marginRight: "8px" }}>📷</span> Add Photo
              <input 
                type="file" 
                accept="image/*" 
                multiple
                onChange={handlePhotoSelect}
                style={{ display: "none" }}
              />
            </label>
          </div>

          {!allChecked && (
            <p className="checklist-footer__hint" style={{ marginTop: "8px" }}>
              Complete all {tasks.length} tasks to submit
            </p>
          )}

          <div style={{ display: "flex", width: "100%", marginTop: "12px" }}>
            <button
              id="submit-checklist-btn"
              className={`btn btn--submit ${allChecked ? "btn--active" : "btn--disabled"}`}
              onClick={handleSubmit}
              disabled={!allChecked || pageState === "submitting"}
              aria-disabled={!allChecked}
              style={{ width: "100%", padding: "14px", fontSize: "16px", borderRadius: "8px" }}
            >
              {pageState === "submitting" ? (
                <>
                  <span className="btn-spinner" />
                  Submitting…
                </>
              ) : (
                "Complete Checklist"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
