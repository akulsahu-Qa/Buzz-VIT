import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { Patient } from "./PatientRoundingTracker";

export function PatientRoundForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  
  const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";
  
  // Form State
  const [nurseName, setNurseName] = useState("");
  const [roundType, setRoundType] = useState("Morning");
  const [healthStatus, setHealthStatus] = useState("");
  const [clearOnDiagnosis, setClearOnDiagnosis] = useState<boolean | null>(null);
  const [doctorsAttending, setDoctorsAttending] = useState<boolean | null>(null);
  const [staffPolite, setStaffPolite] = useState<boolean | null>(null);
  const [cleanlinessSatisfied, setCleanlinessSatisfied] = useState<boolean | null>(null);
  
  // New Expanded Metrics
  const [dietarySatisfaction, setDietarySatisfaction] = useState<boolean | null>(null);
  const [nursingResponse, setNursingResponse] = useState<boolean | null>(null);
  const [painManaged, setPainManaged] = useState<boolean | null>(null);
  const [dischargeReadiness, setDischargeReadiness] = useState<boolean | null>(null);
  
  // Action Items
  const [urgencyFlag, setUrgencyFlag] = useState("Low");
  const [requiresFollowUp, setRequiresFollowUp] = useState(false);
  
  const [issuesFaced, setIssuesFaced] = useState("");
  const [managerRemarks, setManagerRemarks] = useState("");
  
  // Photo Upload
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/api/patients`)
      .then((res) => res.json())
      .then((data) => {
        const found = data.patients.find((p: Patient) => p.id === id);
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
      // Read file as base64
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
        setPhotoUrl(data.photo_url);
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
    if (clearOnDiagnosis === null || doctorsAttending === null || staffPolite === null || cleanlinessSatisfied === null) {
      setError("Please answer the core Yes/No questions.");
      return;
    }
    if (!nurseName || !healthStatus) {
      setError("Nurse name and health status are required.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/rounds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: id,
          nurse_name: nurseName,
          round_type: roundType,
          health_status: healthStatus,
          clear_on_diagnosis: clearOnDiagnosis,
          doctors_attending: doctorsAttending,
          staff_polite: staffPolite,
          cleanliness_satisfied: cleanlinessSatisfied,
          dietary_satisfaction: dietarySatisfaction,
          nursing_response: nursingResponse,
          pain_managed: painManaged,
          discharge_readiness: dischargeReadiness,
          urgency_flag: urgencyFlag,
          requires_follow_up: requiresFollowUp,
          issues_faced: issuesFaced,
          manager_remarks: managerRemarks,
          photo_url: photoUrl
        }),
      });

      if (!res.ok) throw new Error("Failed to submit round");
      
      navigate("/rounds");
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  const ToggleButtons = ({ value, onChange, label }: { value: boolean | null, onChange: (v: boolean) => void, label: string }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
      <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</label>
      <div style={{ display: 'flex', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '4px', border: '1px solid var(--border-subtle)' }}>
        <button
          type="button"
          onClick={() => onChange(true)}
          style={{
            flex: 1, padding: '10px', fontSize: '0.9rem', fontWeight: 600, borderRadius: 'var(--radius-sm)',
            background: value === true ? 'var(--success-dim)' : 'transparent',
            color: value === true ? 'var(--success)' : 'var(--text-secondary)',
            border: value === true ? '1px solid hsl(142, 70%, 48% / 0.3)' : '1px solid transparent',
            transition: 'var(--transition-fast)'
          }}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          style={{
            flex: 1, padding: '10px', fontSize: '0.9rem', fontWeight: 600, borderRadius: 'var(--radius-sm)',
            background: value === false ? 'hsl(4, 90%, 58% / 0.2)' : 'transparent',
            color: value === false ? 'var(--danger)' : 'var(--text-secondary)',
            border: value === false ? '1px solid hsl(4, 90%, 58% / 0.3)' : '1px solid transparent',
            transition: 'var(--transition-fast)'
          }}
        >
          No
        </button>
      </div>
    </div>
  );

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-subtle)',
    background: 'var(--bg-elevated)',
    color: 'var(--text-primary)',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'border-color var(--transition-fast)',
    marginBottom: '16px',
    fontFamily: 'inherit'
  };

  const sectionStyle = {
    padding: '24px',
    borderBottom: '1px solid var(--border-subtle)'
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
        
        {/* Header */}
        <header className="checklist-header" style={{ alignItems: 'center' }}>
          <button onClick={() => navigate("/rounds")} style={{ color: 'var(--text-muted)', fontSize: '1.5rem', marginRight: '8px' }}>
            ←
          </button>
          <div className="checklist-header__text">
            <h1 className="checklist-header__title">Patient Round</h1>
            <div className="checklist-header__nurse">Room {patient.room_no}</div>
          </div>
        </header>

        {/* Patient Details Summary */}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>{patient.name}</h2>
          <div className="checklist-item__description" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            <span className="sop-tag">Consultant: {patient.consultant}</span>
            <span className="sop-tag">Procedure: {patient.procedure}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          
          <div style={sectionStyle}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>Staff Info</h3>
            
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Manager/Nurse Name</label>
            <input type="text" value={nurseName} onChange={e => setNurseName(e.target.value)} style={inputStyle} placeholder="e.g. Alok Tiwari" required />
            
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Round Type</label>
            <select value={roundType} onChange={e => setRoundType(e.target.value)} style={inputStyle}>
              <option value="Morning">Morning Round</option>
              <option value="Evening">Evening Round</option>
              <option value="Night">Night Round</option>
            </select>
          </div>

          <div style={sectionStyle}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>Patient Feedback</h3>
            
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>How is your health today?</label>
            <input type="text" value={healthStatus} onChange={e => setHealthStatus(e.target.value)} style={inputStyle} placeholder="e.g. Feeling better, Pain in leg..." required />

            <ToggleButtons label="Are you clear about your diagnosis & treatment?" value={clearOnDiagnosis} onChange={setClearOnDiagnosis} />
            <ToggleButtons label="Have doctors and nurses been attending regularly?" value={doctorsAttending} onChange={setDoctorsAttending} />
            <ToggleButtons label="Has the staff been polite and respectful?" value={staffPolite} onChange={setStaffPolite} />
            <ToggleButtons label="Are you satisfied with hospital cleanliness?" value={cleanlinessSatisfied} onChange={setCleanlinessSatisfied} />
            
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)', margin: '24px 0 12px' }}>Expanded Metrics (Optional)</h4>
            <ToggleButtons label="Dietary: Satisfied with food quality?" value={dietarySatisfaction} onChange={setDietarySatisfaction} />
            <ToggleButtons label="Nursing: Quick response to calls?" value={nursingResponse} onChange={setNursingResponse} />
            <ToggleButtons label="Pain: Is pain managed effectively?" value={painManaged} onChange={setPainManaged} />
            <ToggleButtons label="Discharge: Clear on discharge instructions?" value={dischargeReadiness} onChange={setDischargeReadiness} />
            
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', marginTop: '16px' }}>Any specific issue faced?</label>
            <textarea value={issuesFaced} onChange={e => setIssuesFaced(e.target.value)} rows={2} style={inputStyle} placeholder="Optional..." />
          </div>

          <div style={sectionStyle}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>Action Items</h3>
            
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Urgency Flag</label>
            <select value={urgencyFlag} onChange={e => setUrgencyFlag(e.target.value)} style={{ ...inputStyle, border: urgencyFlag === 'High' ? '1px solid var(--danger)' : inputStyle.border }}>
              <option value="Low">🟢 Low (Routine)</option>
              <option value="Medium">🟡 Medium</option>
              <option value="High">🔴 High (Immediate Attention)</option>
            </select>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px', cursor: 'pointer' }}>
              <input type="checkbox" checked={requiresFollowUp} onChange={e => setRequiresFollowUp(e.target.checked)} style={{ width: '20px', height: '20px' }} />
              Requires Follow-up Later Today
            </label>

            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Manager Remarks</label>
            <textarea value={managerRemarks} onChange={e => setManagerRemarks(e.target.value)} rows={2} style={{ ...inputStyle, marginBottom: 0 }} placeholder="e.g. Discussed with RMO, plan discharge..." />
          </div>
          
          <div style={sectionStyle}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>Attachments</h3>
            
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Attach Photo (Optional)</label>
            <label style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              padding: "12px 16px",
              backgroundColor: "var(--bg-elevated)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "8px",
              cursor: uploadingPhoto ? "not-allowed" : "pointer",
              fontSize: "15px",
              fontWeight: 500,
              color: "var(--text-primary)",
              boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
              opacity: uploadingPhoto ? 0.6 : 1
            }}>
              {uploadingPhoto ? (
                <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', marginRight: '8px', borderColor: 'var(--text-primary)', borderTopColor: 'transparent' }}></div>
              ) : (
                <span style={{ marginRight: "8px" }}>📷</span>
              )}
              {uploadingPhoto ? "Uploading..." : "Add Photo"}
              <input 
                type="file" 
                accept="image/*"
                onChange={handlePhotoUpload} 
                disabled={uploadingPhoto}
                style={{ display: "none" }} 
              />
            </label>
            {photoUrl && (
              <div style={{ marginTop: '12px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <img src={photoUrl} alt="Uploaded" style={{ maxHeight: '100px', borderRadius: 'var(--radius-sm)' }} />
                <button type="button" onClick={() => setPhotoUrl(null)} style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: "14px", fontWeight: 500 }}>
                  Remove
                </button>
              </div>
            )}
          </div>

          {error && <div style={{ padding: '16px 24px 0', color: 'var(--danger)', fontSize: '0.9rem', fontWeight: 600, textAlign: 'center' }}>{error}</div>}

          <div className="checklist-footer">
            <button 
              type="submit" 
              disabled={submitting}
              className={`btn btn--submit ${submitting ? 'btn--disabled' : 'btn--active'}`}
            >
              {submitting ? <div className="btn-spinner"></div> : "Submit Round Feedback"}
            </button>
            <div className="checklist-footer__hint">Supervisors will be notified immediately.</div>
          </div>
        </form>

      </div>
    </div>
  );
}
