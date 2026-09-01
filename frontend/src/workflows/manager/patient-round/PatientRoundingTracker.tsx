import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export interface Patient {
  id: string;
  name: string;
  room_no: string;
  consultant: string;
  procedure: string;
  admitted_date: string;
  status: string;
}

export function PatientRoundingTracker() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";
  
  const [activeForm, setActiveForm] = useState<"add" | "issue" | null>(null);
  
  // New Patient Form State
  const [newPatient, setNewPatient] = useState({ name: "", room_no: "", consultant: "", procedure: "" });
  
  // Issue Form State
  const [issue, setIssue] = useState({ room_no: "", department: "Maintenance", description: "", reported_by: "" });

  const fetchPatients = () => {
    setLoading(true);
    fetch(`${API_BASE}/api/patients`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch patients");
        return res.json();
      })
      .then((data) => {
        // Handle both raw array and object with patients property for safety
        const patientList = Array.isArray(data) ? data : (data.patients || []);
        setPatients(patientList);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/patients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newPatient, admitted_date: new Date().toISOString().split('T')[0] })
      });
      if (res.ok) {
        setActiveForm(null);
        setNewPatient({ name: "", room_no: "", consultant: "", procedure: "" });
        fetchPatients();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReportIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/facility-issues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(issue)
      });
      if (res.ok) {
        setActiveForm(null);
        setIssue({ room_no: "", department: "Maintenance", description: "", reported_by: "" });
        alert("Issue reported to supervisors successfully.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-subtle)',
    background: 'var(--bg-elevated)',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    outline: 'none',
    marginBottom: '12px'
  };

  if (loading && patients.length === 0) {
    return (
      <div className="checklist-page">
        <div className="checklist-card loading-card">
          <div className="spinner"></div>
          <div className="loading-text">Loading patients...</div>
        </div>
      </div>
    );
  }

  if (error && patients.length === 0) {
    return (
      <div className="checklist-page">
        <div className="checklist-card error-card">
          <div className="error-icon">⚠️</div>
          <h2>Error</h2>
          <p>{error}</p>
          <button className="btn btn--primary" onClick={fetchPatients} style={{ marginTop: 16 }}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="checklist-page">
      <div className="checklist-card">
        <header className="checklist-header">
          <div className="checklist-header__icon">🩺</div>
          <div className="checklist-header__text">
            <h1 className="checklist-header__title">Patient Rounds</h1>
            <div className="checklist-header__nurse">Daily Tracker</div>
          </div>
        </header>

        <div style={{ padding: '16px 20px', display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
          <button className="btn btn--primary" onClick={() => setActiveForm(activeForm === "add" ? null : "add")} style={{ flex: 1, padding: '10px' }}>
            ➕ Add Patient
          </button>
          <button className="btn btn--primary" onClick={() => setActiveForm(activeForm === "issue" ? null : "issue")} style={{ flex: 1, padding: '10px', background: 'var(--warning)', color: '#000' }}>
            🚨 Report Issue
          </button>
        </div>

        {/* Add Patient Modal */}
        {activeForm === "add" && (
          <div style={{ padding: '20px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
            <h3 style={{ marginBottom: '12px', fontSize: '1.1rem' }}>Admit New Patient</h3>
            <form onSubmit={handleAddPatient}>
              <input style={inputStyle} placeholder="Patient Name" value={newPatient.name} onChange={e => setNewPatient({...newPatient, name: e.target.value})} required />
              <input style={inputStyle} placeholder="Room No" value={newPatient.room_no} onChange={e => setNewPatient({...newPatient, room_no: e.target.value})} required />
              <input style={inputStyle} placeholder="Consultant" value={newPatient.consultant} onChange={e => setNewPatient({...newPatient, consultant: e.target.value})} required />
              <input style={inputStyle} placeholder="Procedure" value={newPatient.procedure} onChange={e => setNewPatient({...newPatient, procedure: e.target.value})} required />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" className="btn btn--active" style={{ flex: 1, padding: '10px' }}>Save</button>
                <button type="button" className="btn" onClick={() => setActiveForm(null)} style={{ flex: 1, padding: '10px', border: '1px solid var(--border-subtle)' }}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Report Issue Modal */}
        {activeForm === "issue" && (
          <div style={{ padding: '20px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
            <h3 style={{ marginBottom: '12px', fontSize: '1.1rem', color: 'var(--warning)' }}>Report Facility Issue</h3>
            <form onSubmit={handleReportIssue}>
              <input style={inputStyle} placeholder="Room No" value={issue.room_no} onChange={e => setIssue({...issue, room_no: e.target.value})} required />
              <select style={inputStyle} value={issue.department} onChange={e => setIssue({...issue, department: e.target.value})}>
                <option value="Maintenance">Maintenance</option>
                <option value="Housekeeping">Housekeeping</option>
                <option value="IT">IT</option>
              </select>
              <textarea style={inputStyle} placeholder="Describe the issue..." value={issue.description} onChange={e => setIssue({...issue, description: e.target.value})} required />
              <input style={inputStyle} placeholder="Reported By" value={issue.reported_by} onChange={e => setIssue({...issue, reported_by: e.target.value})} required />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" className="btn btn--active" style={{ flex: 1, padding: '10px', background: 'var(--warning)', color: '#000' }}>Submit Issue</button>
                <button type="button" className="btn" onClick={() => setActiveForm(null)} style={{ flex: 1, padding: '10px', border: '1px solid var(--border-subtle)' }}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div className="checklist-tasks" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase' }}>
            Admitted Patients ({patients.length})
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {patients.map((patient) => (
              <Link
                key={patient.id}
                to={`/rounds/${patient.id}`}
                className="checklist-item"
                style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}
              >
                <div className="checklist-item__content">
                  <div className="checklist-item__label">{patient.name}</div>
                  <div className="checklist-item__description" style={{ display: 'flex', gap: '12px', marginTop: '8px', alignItems: 'center' }}>
                    <span className="sop-tag">Room {patient.room_no}</span>
                    <span>👨‍⚕️ {patient.consultant}</span>
                    <span>📋 {patient.procedure}</span>
                  </div>
                </div>
                <div className="checklist-item__status">
                  <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>→</span>
                </div>
              </Link>
            ))}
          </div>

          {patients.length === 0 && (
            <div className="loading-text" style={{ textAlign: 'center', padding: '40px' }}>
              No admitted patients found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
