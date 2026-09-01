import { useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

export function ManagerOperationsBlock({ taskId, phaseId }: { taskId: string; phaseId: string }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [mockLocation, setMockLocation] = useState<'inside' | 'outside'>('inside');

  const [activeTab, setActiveTab] = useState<'ipd' | 'opd' | 'discharge'>('ipd');
  const [ipdData, setIpdData] = useState({
    enabled: true,
    health_status: 'Good',
    diagnosis_clear: true,
    staff_regular: true,
    staff_polite: true,
    cleanliness: true,
    issue: '',
    photos_added: false,
  });
  const [opdData, setOpdData] = useState({
    enabled: true,
    experience: 'Good',
    issue: '',
    photos_added: false,
  });
  const [dischargeData, setDischargeData] = useState({
    enabled: true,
    smooth_process: true,
    issue: '',
    photos_added: false,
  });

  const handleSubmit = async (payload: any) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/tasks/${taskId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Submission failed");
      }
      setSuccess(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="checklist-page" style={{ "--accent": "hsl(142, 70%, 48%)" } as React.CSSProperties}>
        <div className="checklist-card">
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>✅</div>
            <h2 style={{ fontSize: "24px", color: "var(--text-primary)" }}>Task Completed</h2>
            <p style={{ color: "var(--text-secondary)", marginTop: "8px" }}>The operation was recorded successfully.</p>
            <button 
              onClick={() => window.location.href = '/admin'}
              className="btn btn--active" 
              style={{ marginTop: "24px", width: "100%" }}
            >
              Back to Simulator
            </button>
          </div>
        </div>
      </div>
    );
  }

  const displayPhase = phaseId.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase());

  return (
    <div className="checklist-page">
      <div className="checklist-card">
        <header className="checklist-header" style={{ flexDirection: "column", alignItems: "stretch", gap: "8px", paddingBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <div className="checklist-icon" style={{ fontSize: "24px", lineHeight: 1 }}>📋</div>
            <span style={{ fontSize: "12px", color: "var(--text-muted)", letterSpacing: "1px", textTransform: "uppercase" }}>
              Manager Operations
            </span>
          </div>
          <h1 className="checklist-title" style={{ fontSize: "28px", margin: 0, lineHeight: 1.2 }}>{displayPhase}</h1>
          
          {phaseId === "roster_creation" && <p className="checklist-meta" style={{ color: "var(--text-secondary)", margin: 0 }}>Assign staff for the upcoming week.</p>}
          {phaseId === "shift_checkin" && <p className="checklist-meta" style={{ color: "var(--text-secondary)", margin: 0 }}>Please confirm your attendance for the shift.</p>}
          {phaseId === "readiness_checklist" && <p className="checklist-meta" style={{ color: "var(--text-secondary)", margin: 0 }}>Complete readiness checks.</p>}
          {phaseId === "shift_handover" && <p className="checklist-meta" style={{ color: "var(--text-secondary)", margin: 0 }}>List open work for incoming staff.</p>}
          {phaseId === "patient_round" && <p className="checklist-meta" style={{ color: "var(--text-secondary)", margin: 0 }}>Complete daily patient check-in and satisfaction survey.</p>}
        </header>

        {error && (
          <div className="error-card" style={{ marginBottom: "20px" }}>
            <span className="error-icon">⚠️</span>
            <p>{error}</p>
          </div>
        )}

        <div style={{ marginTop: "30px" }}>
          {phaseId === "roster_creation" && (
            <button 
              disabled={loading} 
              onClick={() => handleSubmit({ assigned_staff: "Nurse Jitendar" })}
              className={`btn btn--active ${loading ? "btn--disabled" : ""}`}
              style={{ width: "100%" }}
            >
              {loading ? "Submitting..." : "Submit Roster (Assign Jitendar)"}
            </button>
          )}

          {phaseId === "shift_checkin" && (
            <div style={{ display: "flex", gap: "10px", flexDirection: "column" }}>
              <div style={{ padding: "12px", backgroundColor: "var(--bg-tertiary)", border: "1px solid var(--border-color)", borderRadius: "8px", fontSize: "14px", marginBottom: "8px" }}>
                <p style={{ margin: "0 0 10px 0", fontWeight: "bold", color: "var(--text-primary)" }}>📍 Demo Location Simulator</p>
                <div style={{ display: "flex", gap: "15px", color: "var(--text-secondary)" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer" }}>
                    <input type="radio" checked={mockLocation === 'inside'} onChange={() => { setMockLocation('inside'); setError(""); }} /> 
                    Inside Hospital
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer" }}>
                    <input type="radio" checked={mockLocation === 'outside'} onChange={() => setMockLocation('outside')} /> 
                    Outside (Blocks Submission)
                  </label>
                </div>
              </div>
              <button 
                disabled={loading} 
                onClick={() => {
                  if (mockLocation === 'outside') {
                    setError("Geofence Alert: You are not within the hospital premises. Check-in blocked.");
                    return;
                  }
                  handleSubmit({ checkin_time: new Date().toISOString() });
                }}
                className={`btn btn--active ${loading ? "btn--disabled" : ""}`}
                style={{ width: "100%", "--accent": "var(--success)" } as React.CSSProperties}
              >
                {loading ? "Checking in..." : "Check In"}
              </button>
            </div>
          )}

          {phaseId === "readiness_checklist" && (
            <div style={{ display: "flex", gap: "10px", flexDirection: "column" }}>
              <button 
                disabled={loading} 
                onClick={() => handleSubmit({ checks_completed: true, notes: "All good" })}
                className={`btn btn--active ${loading ? "btn--disabled" : ""}`}
                style={{ width: "100%" }}
              >
                {loading ? "Submitting..." : "Submit Complete (Safe)"}
              </button>
              <button 
                disabled={loading} 
                onClick={() => handleSubmit({ checks_completed: false, notes: "Missing supplies" })}
                className={`btn btn--active ${loading ? "btn--disabled" : ""}`}
                style={{ width: "100%", "--accent": "var(--warning)" } as React.CSSProperties}
              >
                {loading ? "Submitting..." : "Submit Incomplete (Trigger Exception)"}
              </button>
            </div>
          )}

          {phaseId === "shift_handover" && (
            <div style={{ display: "flex", gap: "10px", flexDirection: "column" }}>
              <button 
                disabled={loading} 
                onClick={() => handleSubmit({ open_items: "Patient 3 needs meds", handover_to: "Nurse Priya" })}
                className={`btn btn--active ${loading ? "btn--disabled" : ""}`}
                style={{ width: "100%" }}
              >
                {loading ? "Handing over..." : "Transfer Ownership"}
              </button>
              <button 
                disabled={loading} 
                onClick={() => handleSubmit({ open_items: "Patient 3 needs meds", handover_to: "" })}
                className={`btn btn--active ${loading ? "btn--disabled" : ""}`}
                style={{ width: "100%", "--accent": "var(--warning)" } as React.CSSProperties}
              >
                {loading ? "Handing over..." : "Transfer Ownership (Empty / Trigger Exception)"}
              </button>
            </div>
          )}

          {phaseId === "patient_round" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ display: "flex", justifyContent: "center", gap: "24px", borderBottom: "1px solid var(--border-subtle)", padding: "0 28px", margin: "0 -28px 10px" }}>
                <button 
                  onClick={() => setActiveTab('ipd')} 
                  style={{ background: "none", border: "none", fontWeight: activeTab === 'ipd' ? '600' : '400', padding: "12px 4px", color: activeTab === 'ipd' ? 'var(--text-primary)' : 'var(--text-secondary)', cursor: "pointer", borderBottom: activeTab === 'ipd' ? '2px solid var(--accent, hsl(210, 85%, 55%))' : '2px solid transparent', marginBottom: "-1px" }}>
                  IPD Daily
                </button>
                <button 
                  onClick={() => setActiveTab('opd')} 
                  style={{ background: "none", border: "none", fontWeight: activeTab === 'opd' ? '600' : '400', padding: "12px 4px", color: activeTab === 'opd' ? 'var(--text-primary)' : 'var(--text-secondary)', cursor: "pointer", borderBottom: activeTab === 'opd' ? '2px solid var(--accent, hsl(210, 85%, 55%))' : '2px solid transparent', marginBottom: "-1px" }}>
                  OPD Feedback
                </button>
                <button 
                  onClick={() => setActiveTab('discharge')} 
                  style={{ background: "none", border: "none", fontWeight: activeTab === 'discharge' ? '600' : '400', padding: "12px 4px", color: activeTab === 'discharge' ? 'var(--text-primary)' : 'var(--text-secondary)', cursor: "pointer", borderBottom: activeTab === 'discharge' ? '2px solid var(--accent, hsl(210, 85%, 55%))' : '2px solid transparent', marginBottom: "-1px" }}>
                  Post-Discharge
                </button>
              </div>

              {activeTab === 'ipd' && (
                <div style={{ display: "flex", flexDirection: "column", gap: "15px", backgroundColor: "var(--bg-secondary)", padding: "15px", borderRadius: "8px" }}>
                      <label>
                        Health Status today: 
                        <select value={ipdData.health_status} onChange={(e) => setIpdData({...ipdData, health_status: e.target.value})} style={{ marginLeft: "10px", padding: "5px", borderRadius: "4px" }}>
                          <option>Good</option>
                          <option>Fair</option>
                          <option>Poor</option>
                        </select>
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <input type="checkbox" checked={ipdData.diagnosis_clear} onChange={(e) => setIpdData({...ipdData, diagnosis_clear: e.target.checked})} />
                        Clear about diagnosis & treatment?
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <input type="checkbox" checked={ipdData.staff_regular} onChange={(e) => setIpdData({...ipdData, staff_regular: e.target.checked})} />
                        Doctors/nurses attending regularly?
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <input type="checkbox" checked={ipdData.staff_polite} onChange={(e) => setIpdData({...ipdData, staff_polite: e.target.checked})} />
                        Staff polite and respectful?
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <input type="checkbox" checked={ipdData.cleanliness} onChange={(e) => setIpdData({...ipdData, cleanliness: e.target.checked})} />
                        Satisfied with cleanliness?
                      </label>
                      <label style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                        Any specific issues faced?
                        <textarea value={ipdData.issue} onChange={(e) => setIpdData({...ipdData, issue: e.target.value})} rows={2} style={{ padding: "8px", borderRadius: "4px", border: "1px solid var(--border-color)", background: "var(--bg-tertiary)", color: "var(--text-primary)" }} placeholder="E.g., Bathroom not cleaned..."></textarea>
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <input type="checkbox" checked={ipdData.photos_added} onChange={(e) => setIpdData({...ipdData, photos_added: e.target.checked})} />
                        [Mock] Attach Photos
                      </label>
                </div>
              )}

              {activeTab === 'opd' && (
                <div style={{ display: "flex", flexDirection: "column", gap: "15px", backgroundColor: "var(--bg-secondary)", padding: "15px", borderRadius: "8px" }}>
                      <label>
                        Overall Experience: 
                        <select value={opdData.experience} onChange={(e) => setOpdData({...opdData, experience: e.target.value})} style={{ marginLeft: "10px", padding: "5px", borderRadius: "4px" }}>
                          <option>Good</option>
                          <option>Fair</option>
                          <option>Poor</option>
                        </select>
                      </label>
                      <label style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                        Specific Issues:
                        <textarea value={opdData.issue} onChange={(e) => setOpdData({...opdData, issue: e.target.value})} rows={2} style={{ padding: "8px", borderRadius: "4px", border: "1px solid var(--border-color)", background: "var(--bg-tertiary)", color: "var(--text-primary)" }}></textarea>
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <input type="checkbox" checked={opdData.photos_added} onChange={(e) => setOpdData({...opdData, photos_added: e.target.checked})} />
                        [Mock] Attach Photos
                      </label>
                </div>
              )}

              {activeTab === 'discharge' && (
                <div style={{ display: "flex", flexDirection: "column", gap: "15px", backgroundColor: "var(--bg-secondary)", padding: "15px", borderRadius: "8px" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <input type="checkbox" checked={dischargeData.smooth_process} onChange={(e) => setDischargeData({...dischargeData, smooth_process: e.target.checked})} />
                        Was the discharge process smooth?
                      </label>
                      <label style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                        Specific Issues / Complaints:
                        <textarea value={dischargeData.issue} onChange={(e) => setDischargeData({...dischargeData, issue: e.target.value})} rows={2} style={{ padding: "8px", borderRadius: "4px", border: "1px solid var(--border-color)", background: "var(--bg-tertiary)", color: "var(--text-primary)" }}></textarea>
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <input type="checkbox" checked={dischargeData.photos_added} onChange={(e) => setDischargeData({...dischargeData, photos_added: e.target.checked})} />
                        [Mock] Attach Photos
                      </label>
                </div>
              )}
            </div>
          )}
        </div>
        
        {phaseId === "patient_round" && (
          <div className="checklist-footer">
            <button 
              disabled={loading} 
              onClick={() => handleSubmit({ ipdData, opdData, dischargeData })}
              className={`btn btn--active ${loading ? "btn--disabled" : ""}`}
              style={{ width: "100%" }}
            >
              {loading ? "Submitting..." : "Submit Consolidated Feedback"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
