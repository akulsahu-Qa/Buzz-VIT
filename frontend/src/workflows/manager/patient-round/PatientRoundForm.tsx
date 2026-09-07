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
  const [activeTab, setActiveTab] = useState<'ipd' | 'discharge' | 'opd'>('ipd');

  // Interaction tracking per tab
  const [ipdTouched, setIpdTouched] = useState(false);
  const [dischargeTouched, setDischargeTouched] = useState(false);
  const [opdTouched, setOpdTouched] = useState(false);

  // Form State for IPD
  const [ipdData, setIpdData] = useState({
    health_status: 'Good',
    diagnosis_clear: false,
    staff_regular: false,
    staff_polite: false,
    cleanliness: false,
    gown_linen_changed: false,
    issue: '',
  });
  const [ipdPhotos, setIpdPhotos] = useState<string[]>([]);

  // Form State for OPD
  const [opdData, setOpdData] = useState({
    experience: 'Good',
    issue: '',
  });
  const [opdPhotos, setOpdPhotos] = useState<string[]>([]);

  // Form State for Post-Discharge
  const [dischargeData, setDischargeData] = useState({
    smooth_process: false,
    issue: '',
  });
  const [dischargePhotos, setDischargePhotos] = useState<string[]>([]);

  // Upload state
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

  // Compute which tabs have valid/entered feedback
  const isIpdFilled =
    ipdTouched ||
    ipdPhotos.length > 0 ||
    ipdData.issue.trim().length > 0 ||
    ipdData.diagnosis_clear ||
    ipdData.staff_regular ||
    ipdData.staff_polite ||
    ipdData.cleanliness ||
    ipdData.gown_linen_changed ||
    (!dischargeTouched && !opdTouched && activeTab === 'ipd');

  const isDischargeFilled =
    dischargeTouched ||
    dischargePhotos.length > 0 ||
    dischargeData.issue.trim().length > 0 ||
    dischargeData.smooth_process ||
    (!ipdTouched && !opdTouched && activeTab === 'discharge');

  const isOpdFilled =
    opdTouched ||
    opdPhotos.length > 0 ||
    opdData.issue.trim().length > 0 ||
    (!ipdTouched && !dischargeTouched && activeTab === 'opd');

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
        
        // Attach photo to current active tab
        if (activeTab === 'ipd') {
          setIpdPhotos(prev => [...prev, data.photo_url]);
          setIpdTouched(true);
        } else if (activeTab === 'discharge') {
          setDischargePhotos(prev => [...prev, data.photo_url]);
          setDischargeTouched(true);
        } else if (activeTab === 'opd') {
          setOpdPhotos(prev => [...prev, data.photo_url]);
          setOpdTouched(true);
        }

        setUploadingPhoto(false);
        // Reset file input value so user can upload same photo again if desired
        e.target.value = "";
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

    // Consolidate photos and issues across all filled tabs
    const allPhotos: string[] = [];
    if (isIpdFilled) allPhotos.push(...ipdPhotos);
    if (isDischargeFilled) allPhotos.push(...dischargePhotos);
    if (isOpdFilled) allPhotos.push(...opdPhotos);

    const filledTitles: string[] = [];
    if (isIpdFilled) filledTitles.push("IPD");
    if (isDischargeFilled) filledTitles.push("Post-Discharge");
    if (isOpdFilled) filledTitles.push("OPD");

    const roundType = filledTitles.length > 1
      ? `${filledTitles.join(" & ")} Feedback`
      : filledTitles.length === 1
        ? (filledTitles[0] === "Post-Discharge" ? "Post-Discharge" : `${filledTitles[0]} Feedback`)
        : "Patient Round";

    const allIssues: string[] = [];
    if (isIpdFilled && ipdData.issue.trim()) allIssues.push(`[IPD]: ${ipdData.issue.trim()}`);
    if (isDischargeFilled && dischargeData.issue.trim()) allIssues.push(`[Post-Discharge]: ${dischargeData.issue.trim()}`);
    if (isOpdFilled && opdData.issue.trim()) allIssues.push(`[OPD]: ${opdData.issue.trim()}`);

    // Determine urgency and follow-up
    const hasIpdNegative = isIpdFilled && (
      !ipdData.diagnosis_clear ||
      !ipdData.staff_regular ||
      !ipdData.staff_polite ||
      !ipdData.cleanliness ||
      !ipdData.gown_linen_changed ||
      ipdData.health_status === 'Poor'
    );
    const hasDischargeNegative = isDischargeFilled && !dischargeData.smooth_process;
    const hasOpdNegative = isOpdFilled && (opdData.experience === 'Poor' || opdData.experience === 'Fair');

    const hasNegative = hasIpdNegative || hasDischargeNegative || hasOpdNegative;
    const isUrgent = (isIpdFilled && ipdData.health_status === 'Poor') || (isOpdFilled && opdData.experience === 'Poor');

    const payload: any = {
      patient_id: id,
      nurse_name: "Manager User",
      round_type: roundType,
      health_status: isIpdFilled ? ipdData.health_status : (isDischargeFilled ? "Discharged" : opdData.experience),
      urgency_flag: isUrgent ? "High" : (hasNegative ? "Medium" : "Low"),
      requires_follow_up: hasNegative,
      photo_url: allPhotos.length > 0 ? allPhotos.join(',') : null,
      issues_faced: allIssues.length > 0 ? allIssues.join('\n') : null,

      // IPD fields
      ipd_filled: isIpdFilled,
      clear_on_diagnosis: isIpdFilled ? ipdData.diagnosis_clear : null,
      doctors_attending: isIpdFilled ? ipdData.staff_regular : null,
      staff_polite: isIpdFilled ? ipdData.staff_polite : null,
      cleanliness_satisfied: isIpdFilled ? ipdData.cleanliness : null,
      gown_and_linens_changed: isIpdFilled ? ipdData.gown_linen_changed : null,
      ipd_health_status: isIpdFilled ? ipdData.health_status : null,
      ipd_issues: isIpdFilled && ipdData.issue.trim() ? ipdData.issue.trim() : null,
      ipd_photos: isIpdFilled ? ipdPhotos : [],

      // Post-Discharge fields
      discharge_filled: isDischargeFilled,
      discharge_readiness: isDischargeFilled ? dischargeData.smooth_process : null,
      discharge_smooth: isDischargeFilled ? dischargeData.smooth_process : null,
      discharge_issues: isDischargeFilled && dischargeData.issue.trim() ? dischargeData.issue.trim() : null,
      discharge_photos: isDischargeFilled ? dischargePhotos : [],

      // OPD fields
      opd_filled: isOpdFilled,
      opd_experience: isOpdFilled ? opdData.experience : null,
      opd_issues: isOpdFilled && opdData.issue.trim() ? opdData.issue.trim() : null,
      opd_photos: isOpdFilled ? opdPhotos : [],
    };

    try {
      const res = await fetch(`${API_BASE}/api/rounds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let errMsg = `Server error (${res.status})`;
        try {
          const errJson = await res.json();
          if (errJson.detail) errMsg = typeof errJson.detail === "string" ? errJson.detail : JSON.stringify(errJson.detail);
        } catch (_) {}
        throw new Error(errMsg);
      }

      navigate("/rounds");
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  const renderPhotoSection = (
    photos: string[],
    onRemove: (idx: number) => void,
    categoryName: string
  ) => {
    return (
      <div style={{ marginTop: "14px", padding: "12px", background: "var(--bg-base)", borderRadius: "8px", border: "1px dashed var(--border-subtle)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: photos.length > 0 ? "10px" : "0" }}>
          <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)" }}>
            Attached Photos ({categoryName}) — {photos.length}
          </span>
          <button
            type="button"
            onClick={() => document.getElementById(`photo-upload-${activeTab}`)?.click()}
            disabled={uploadingPhoto}
            style={{
              background: "var(--bg-elevated)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-subtle)",
              padding: "6px 12px",
              borderRadius: "6px",
              cursor: uploadingPhoto ? "not-allowed" : "pointer",
              fontWeight: "600",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            {uploadingPhoto ? <div className="spinner" style={{ width: "12px", height: "12px", borderWidth: "2px", borderTopColor: "transparent" }} /> : "📷"}
            {uploadingPhoto ? "Uploading..." : "+ Add Photo"}
          </button>
          <input
            id={`photo-upload-${activeTab}`}
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            style={{ display: "none" }}
          />
        </div>

        {photos.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            {photos.map((url, index) => (
              <div key={index} style={{ position: 'relative' }}>
                <img src={url} alt={`Upload ${index}`} style={{ width: "64px", height: "64px", objectFit: "cover", borderRadius: "6px", border: "1px solid var(--border-subtle)" }} />
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  style={{
                    position: 'absolute',
                    top: "-6px",
                    right: "-6px",
                    background: "var(--danger)",
                    color: "white",
                    border: "none",
                    borderRadius: "50%",
                    width: "20px",
                    height: "20px",
                    fontSize: "11px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
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
        <header className="checklist-header" style={{ flexDirection: "column", alignItems: "stretch", gap: "8px", paddingBottom: "20px" }}>
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
          <div style={{ marginTop: "6px" }}>
            {/* Feedback Category Dropdown */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "6px", display: "block" }}>
                Select Feedback Category:
              </label>
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value as 'ipd' | 'discharge' | 'opd')}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: "var(--radius-sm)",
                  border: "1.5px solid var(--accent)",
                  background: "var(--bg-elevated)",
                  color: "var(--text-primary)",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  outline: "none",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.04)"
                }}
              >
                <option value="ipd">
                  🏥 IPD Feedback {isIpdFilled ? "(✓ Filled)" : ""}
                </option>
                <option value="discharge">
                  🚪 Post-Discharge {isDischargeFilled ? "(✓ Filled)" : ""}
                </option>
                <option value="opd">
                  🩺 OPD Feedback {isOpdFilled ? "(✓ Filled)" : ""}
                </option>
              </select>
            </div>

            {/* IPD Tab Content */}
            {activeTab === 'ipd' && (
              <div style={{ display: "flex", flexDirection: "column", gap: "15px", padding: "16px", background: "var(--bg-surface)", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                <label style={{ fontSize: "15px" }}>
                  Health Status today:
                  <select
                    value={ipdData.health_status}
                    onChange={(e) => {
                      setIpdData({ ...ipdData, health_status: e.target.value });
                      setIpdTouched(true);
                    }}
                    style={{ marginLeft: "10px", padding: "4px 8px", borderRadius: "4px", background: "var(--bg-elevated)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)", outline: "none" }}
                  >
                    <option>Good</option>
                    <option>Fair</option>
                    <option>Poor</option>
                  </select>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={ipdData.diagnosis_clear}
                    onChange={(e) => {
                      setIpdData({ ...ipdData, diagnosis_clear: e.target.checked });
                      setIpdTouched(true);
                    }}
                    style={{ width: "16px", height: "16px" }}
                  />
                  Clear about diagnosis & treatment?
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={ipdData.staff_regular}
                    onChange={(e) => {
                      setIpdData({ ...ipdData, staff_regular: e.target.checked });
                      setIpdTouched(true);
                    }}
                    style={{ width: "16px", height: "16px" }}
                  />
                  Doctors/nurses attending regularly?
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={ipdData.staff_polite}
                    onChange={(e) => {
                      setIpdData({ ...ipdData, staff_polite: e.target.checked });
                      setIpdTouched(true);
                    }}
                    style={{ width: "16px", height: "16px" }}
                  />
                  Staff polite and respectful?
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={ipdData.cleanliness}
                    onChange={(e) => {
                      setIpdData({ ...ipdData, cleanliness: e.target.checked });
                      setIpdTouched(true);
                    }}
                    style={{ width: "16px", height: "16px" }}
                  />
                  Satisfied with cleanliness?
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={ipdData.gown_linen_changed}
                    onChange={(e) => {
                      setIpdData({ ...ipdData, gown_linen_changed: e.target.checked });
                      setIpdTouched(true);
                    }}
                    style={{ width: "16px", height: "16px" }}
                  />
                  Gown and linen changed in the morning?
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px" }}>
                  Any specific issues faced?
                  <textarea
                    value={ipdData.issue}
                    onChange={(e) => {
                      setIpdData({ ...ipdData, issue: e.target.value });
                      setIpdTouched(true);
                    }}
                    rows={2}
                    style={{ padding: "12px", borderRadius: "8px", border: "1px solid var(--border-subtle)", background: "var(--bg-elevated)", color: "var(--text-primary)", outline: "none", resize: "vertical" }}
                    placeholder="E.g., Bathroom not cleaned..."
                  />
                </label>

                {renderPhotoSection(ipdPhotos, (idx) => setIpdPhotos(ipdPhotos.filter((_, i) => i !== idx)), "IPD")}
              </div>
            )}

            {/* Post-Discharge Tab Content */}
            {activeTab === 'discharge' && (
              <div style={{ display: "flex", flexDirection: "column", gap: "15px", padding: "16px", background: "var(--bg-surface)", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={dischargeData.smooth_process}
                    onChange={(e) => {
                      setDischargeData({ ...dischargeData, smooth_process: e.target.checked });
                      setDischargeTouched(true);
                    }}
                    style={{ width: "16px", height: "16px" }}
                  />
                  Was the discharge process smooth?
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px" }}>
                  Specific Issues / Complaints:
                  <textarea
                    value={dischargeData.issue}
                    onChange={(e) => {
                      setDischargeData({ ...dischargeData, issue: e.target.value });
                      setDischargeTouched(true);
                    }}
                    rows={3}
                    style={{ padding: "12px", borderRadius: "8px", border: "1px solid var(--border-subtle)", background: "var(--bg-elevated)", color: "var(--text-primary)", outline: "none", resize: "vertical" }}
                    placeholder="E.g., Discharge summary delayed..."
                  />
                </label>

                {renderPhotoSection(dischargePhotos, (idx) => setDischargePhotos(dischargePhotos.filter((_, i) => i !== idx)), "Post-Discharge")}
              </div>
            )}

            {/* OPD Tab Content */}
            {activeTab === 'opd' && (
              <div style={{ display: "flex", flexDirection: "column", gap: "15px", padding: "16px", background: "var(--bg-surface)", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                <label style={{ fontSize: "15px" }}>
                  Overall Experience:
                  <select
                    value={opdData.experience}
                    onChange={(e) => {
                      setOpdData({ ...opdData, experience: e.target.value });
                      setOpdTouched(true);
                    }}
                    style={{ marginLeft: "10px", padding: "4px 8px", borderRadius: "4px", background: "var(--bg-elevated)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)", outline: "none" }}
                  >
                    <option>Good</option>
                    <option>Fair</option>
                    <option>Poor</option>
                  </select>
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px" }}>
                  Specific Issues:
                  <textarea
                    value={opdData.issue}
                    onChange={(e) => {
                      setOpdData({ ...opdData, issue: e.target.value });
                      setOpdTouched(true);
                    }}
                    rows={3}
                    style={{ padding: "12px", borderRadius: "8px", border: "1px solid var(--border-subtle)", background: "var(--bg-elevated)", color: "var(--text-primary)", outline: "none", resize: "vertical" }}
                    placeholder="E.g., Long wait time at reception..."
                  />
                </label>

                {renderPhotoSection(opdPhotos, (idx) => setOpdPhotos(opdPhotos.filter((_, i) => i !== idx)), "OPD")}
              </div>
            )}

            {/* Consolidated Submission Notice */}
            <div style={{ marginTop: "16px", padding: "12px 14px", background: "var(--bg-elevated)", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
              <div style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "6px" }}>
                Included in Consolidated Submission:
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {isIpdFilled && (
                  <span style={{ fontSize: "12px", background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", padding: "4px 8px", borderRadius: "4px", color: "var(--text-primary)" }}>
                    🏥 IPD {ipdPhotos.length > 0 ? `(${ipdPhotos.length} 📷)` : ""}
                  </span>
                )}
                {isDischargeFilled && (
                  <span style={{ fontSize: "12px", background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", padding: "4px 8px", borderRadius: "4px", color: "var(--text-primary)" }}>
                    🚪 Post-Discharge {dischargePhotos.length > 0 ? `(${dischargePhotos.length} 📷)` : ""}
                  </span>
                )}
                {isOpdFilled && (
                  <span style={{ fontSize: "12px", background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", padding: "4px 8px", borderRadius: "4px", color: "var(--text-primary)" }}>
                    🩺 OPD {opdPhotos.length > 0 ? `(${opdPhotos.length} 📷)` : ""}
                  </span>
                )}
                {!isIpdFilled && !isDischargeFilled && !isOpdFilled && (
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    No feedback entered yet
                  </span>
                )}
              </div>
            </div>

            {error && <div style={{ color: "var(--danger)", marginTop: "12px" }}>⚠️ {error}</div>}
          </div>

          <div className="checklist-footer" style={{ padding: "16px 0 0" }}>
            <button
              type="submit"
              disabled={submitting}
              className={`btn btn--active ${submitting ? "btn--disabled" : ""}`}
              style={{ width: "100%", padding: "12px" }}
            >
              {submitting ? "Submitting..." : "Submit Consolidated Feedback"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
