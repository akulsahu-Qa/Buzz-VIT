import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { Patient } from "./PatientRoundingTracker";

export function PatientRoundForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);

  const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

  // Tab State
  const [activeTab, setActiveTab] = useState<'ipd' | 'opd' | 'discharge'>('ipd');

  // Form State matching the preferred UI
  const [ipdData, setIpdData] = useState({
    health_status: 'Good',
    diagnosis_clear: false,
    staff_regular: false,
    staff_polite: false,
    cleanliness: false,
    gown_linen_changed: false,
    issue: '',
  });

  const [opdData, setOpdData] = useState({
    experience: 'Good',
    issue: '',
  });

  const [dischargeData, setDischargeData] = useState({
    smooth_process: false,
    issue: '',
  });

  // Photo Upload
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/api/patients`)
      .then((res) => res.json())
      .then((data) => {
        const patientList = Array.isArray(data) ? data : (data.patients || []);
        const found = patientList.find((p: Patient) => String(p.id) === String(id));
        setPatient(found || null);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to fetch patient details.");
        setLoading(false);
      });
  }, [id]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    setError("");

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        const res = await fetch(`${API_BASE}/api/upload-photo`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ base64_data: base64Data }),
        });

        if (!res.ok) throw new Error("Failed to upload photo");
        const data = await res.json();
        setPhotoUrls(prev => [...prev, data.photo_url]);
        setUploadingPhoto(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error(err);
      setError("Photo upload failed: " + err.message);
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    // Consolidate data for the backend based on active tab
    // We send it to the existing backend endpoint which expects certain fields.
    // For V1, we map the UI fields to the closest backend fields.
    try {
      const res = await fetch(`${API_BASE}/api/rounds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: id,
          nurse_name: "Manager User", // Default or fetch from auth
          round_type: activeTab === 'ipd' ? 'Morning' : 'Evening', // map tab to round type loosely
          health_status: activeTab === 'ipd' ? ipdData.health_status : (activeTab === 'opd' ? opdData.experience : "Discharged"),
          clear_on_diagnosis: ipdData.diagnosis_clear,
          doctors_attending: ipdData.staff_regular,
          staff_polite: ipdData.staff_polite,
          cleanliness_satisfied: ipdData.cleanliness,
          gown_and_linens_changed: ipdData.gown_linen_changed,
          issues_faced: activeTab === 'ipd' ? ipdData.issue : (activeTab === 'opd' ? opdData.issue : dischargeData.issue),
          urgency_flag: "Low",
          requires_follow_up: false,
          photo_url: photoUrls.length > 0 ? photoUrls.join(',') : null
        }),
      });

      if (!res.ok) throw new Error("Failed to submit round");

      navigate("/rounds");
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="checklist-page">
        <div className="checklist-card loading-card">
          <div className="spinner"></div>
          <div className="loading-text">Loading patient...</div>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="checklist-page">
        <div className="checklist-card error-card">
          <div className="error-icon">⚠️</div>
          <h2>Error</h2>
          <p>Patient not found</p>
          <button className="btn btn--primary" onClick={() => navigate("/rounds")} style={{ marginTop: 16 }}>Back to List</button>
        </div>
      </div>
    );
  }

  return (
    <div className="checklist-page">
      <div className="checklist-card">
        <header className="checklist-header" style={{ flexDirection: "column", alignItems: "stretch", gap: "8px", paddingBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <button onClick={() => navigate("/rounds")} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "1.2rem", cursor: "pointer", padding: "0 8px 0 0" }}>
              ←
            </button>
            <div className="checklist-icon" style={{ fontSize: "24px", lineHeight: 1 }}>📋</div>
            <span style={{ fontSize: "12px", color: "var(--text-muted)", letterSpacing: "1px", textTransform: "uppercase" }}>
              Manager Operations
            </span>
          </div>
          <h1 className="checklist-title" style={{ fontSize: "28px", margin: 0, lineHeight: 1.2 }}>Patient Round</h1>
          <p className="checklist-meta" style={{ color: "var(--text-secondary)", margin: 0 }}>
            Complete daily patient check-in and satisfaction survey for Room {patient.room_no}.
          </p>
        </header>

        <form onSubmit={handleSubmit}>
          <div style={{ marginTop: "10px" }}>
            <div style={{ marginBottom: "16px", padding: "0 4px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "6px", display: "block" }}>
                Select Feedback Category:
              </label>
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value as 'ipd' | 'opd' | 'discharge')}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border-subtle)",
                  background: "var(--bg-elevated)",
                  color: "var(--text-primary)",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  outline: "none"
                }}
              >
                <option value="ipd">IPD Feedback</option>
                <option value="opd">OPD Feedback</option>
                <option value="discharge">Post-Discharge</option>
              </select>
            </div>

            {activeTab === 'ipd' && (
              <div style={{ display: "flex", flexDirection: "column", gap: "15px", padding: "15px 12px" }}>
                <label style={{ fontSize: "15px" }}>
                  Health Status today:
                  <select value={ipdData.health_status} onChange={(e) => setIpdData({ ...ipdData, health_status: e.target.value })} style={{ marginLeft: "10px", padding: "4px 8px", borderRadius: "4px", background: "var(--bg-elevated)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)", outline: "none" }}>
                    <option>Good</option>
                    <option>Fair</option>
                    <option>Poor</option>
                  </select>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                  <input type="checkbox" checked={ipdData.diagnosis_clear} onChange={(e) => setIpdData({ ...ipdData, diagnosis_clear: e.target.checked })} style={{ width: "16px", height: "16px" }} />
                  Clear about diagnosis & treatment?
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                  <input type="checkbox" checked={ipdData.staff_regular} onChange={(e) => setIpdData({ ...ipdData, staff_regular: e.target.checked })} style={{ width: "16px", height: "16px" }} />
                  Doctors/nurses attending regularly?
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                  <input type="checkbox" checked={ipdData.staff_polite} onChange={(e) => setIpdData({ ...ipdData, staff_polite: e.target.checked })} style={{ width: "16px", height: "16px" }} />
                  Staff polite and respectful?
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                  <input type="checkbox" checked={ipdData.cleanliness} onChange={(e) => setIpdData({ ...ipdData, cleanliness: e.target.checked })} style={{ width: "16px", height: "16px" }} />
                  Satisfied with cleanliness?
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                  <input type="checkbox" checked={ipdData.gown_linen_changed} onChange={(e) => setIpdData({ ...ipdData, gown_linen_changed: e.target.checked })} style={{ width: "16px", height: "16px" }} />
                  Gown and linen changed in the morning?
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px" }}>
                  Any specific issues faced?
                  <textarea value={ipdData.issue} onChange={(e) => setIpdData({ ...ipdData, issue: e.target.value })} rows={2} style={{ padding: "12px", borderRadius: "8px", border: "1px solid var(--border-subtle)", background: "var(--bg-elevated)", color: "var(--text-primary)", outline: "none", resize: "vertical" }} placeholder="E.g., Bathroom not cleaned..."></textarea>
                </label>
              </div>
            )}

            {activeTab === 'opd' && (
              <div style={{ display: "flex", flexDirection: "column", gap: "15px", padding: "15px 12px" }}>
                <label style={{ fontSize: "15px" }}>
                  Overall Experience:
                  <select value={opdData.experience} onChange={(e) => setOpdData({ ...opdData, experience: e.target.value })} style={{ marginLeft: "10px", padding: "4px 8px", borderRadius: "4px", background: "var(--bg-elevated)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)", outline: "none" }}>
                    <option>Good</option>
                    <option>Fair</option>
                    <option>Poor</option>
                  </select>
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px" }}>
                  Specific Issues:
                  <textarea value={opdData.issue} onChange={(e) => setOpdData({ ...opdData, issue: e.target.value })} rows={3} style={{ padding: "12px", borderRadius: "8px", border: "1px solid var(--border-subtle)", background: "var(--bg-elevated)", color: "var(--text-primary)", outline: "none", resize: "vertical" }}></textarea>
                </label>
              </div>
            )}

            {activeTab === 'discharge' && (
              <div style={{ display: "flex", flexDirection: "column", gap: "15px", padding: "15px 12px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                  <input type="checkbox" checked={dischargeData.smooth_process} onChange={(e) => setDischargeData({ ...dischargeData, smooth_process: e.target.checked })} style={{ width: "16px", height: "16px" }} />
                  Was the discharge process smooth?
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px" }}>
                  Specific Issues / Complaints:
                  <textarea value={dischargeData.issue} onChange={(e) => setDischargeData({ ...dischargeData, issue: e.target.value })} rows={3} style={{ padding: "12px", borderRadius: "8px", border: "1px solid var(--border-subtle)", background: "var(--bg-elevated)", color: "var(--text-primary)", outline: "none", resize: "vertical" }}></textarea>
                </label>
              </div>
            )}

            <div style={{ marginTop: "10px", paddingBottom: "15px" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "10px", justifyContent: "center" }}>
                {photoUrls.map((url, index) => (
                  <div key={index} style={{ position: 'relative' }}>
                    <img src={url} alt={`Upload ${index}`} style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "8px", border: "1px solid var(--border-subtle)" }} />
                    <button type="button" onClick={() => setPhotoUrls(photoUrls.filter((_, i) => i !== index))} style={{ position: 'absolute', top: "-5px", right: "-5px", background: "var(--danger)", color: "white", border: "none", borderRadius: "50%", width: "20px", height: "20px", fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <button
                  type="button"
                  onClick={() => document.getElementById('photo-upload-input')?.click()}
                  disabled={uploadingPhoto}
                  style={{
                    background: "var(--bg-elevated)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-subtle)",
                    padding: "10px 16px",
                    borderRadius: "8px",
                    cursor: uploadingPhoto ? "not-allowed" : "pointer",
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}
                >
                  {uploadingPhoto ? <div className="spinner" style={{ width: "16px", height: "16px", borderWidth: "2px", borderTopColor: "transparent" }} /> : "📷"}
                  {uploadingPhoto ? "Uploading..." : "Add Photo"}
                </button>
                <input
                  id="photo-upload-input"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  style={{ display: "none" }}
                />
              </div>
            </div>

            {error && <div style={{ color: "var(--danger)", marginBottom: "16px" }}>⚠️ {error}</div>}
          </div>

          <div className="checklist-footer" style={{ padding: "15px 0 0" }}>
            <button
              type="submit"
              disabled={submitting}
              className={`btn btn--active ${submitting ? "btn--disabled" : ""}`}
              style={{ width: "100%" }}
            >
              {submitting ? "Submitting..." : "Submit Consolidated Feedback"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
