import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

interface StaffOption {
  id: string;
  name: string;
  role: string;
  has_dm: boolean;
  pubkey_preview?: string;
}

interface DispatchResult {
  status: string;
  delivery: "dm" | "channel_fallback";
  staff_name: string;
  message: string;
  task_url?: string;
}

export function AdminSimulator() {
  const { adminLogout } = useAuth();
  const [loadingPhase, setLoadingPhase] = useState<string | null>(null);
  const [staffList, setStaffList] = useState<StaffOption[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("test_manager");
  const [customPubkey, setCustomPubkey] = useState<string>("");
  const [selectedTaskType, setSelectedTaskType] = useState<string>("patient_round");
  const [dispatchResult, setDispatchResult] = useState<DispatchResult | null>(null);

  const navigate = useNavigate();

  const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";
  const ADMIN_API_KEY = import.meta.env.VITE_ADMIN_API_KEY ?? "supersecret123";

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/staff`, {
        headers: { "X-Admin-API-Key": ADMIN_API_KEY }
      });
      if (res.ok) {
        const data = await res.json();
        setStaffList(data);
        if (data.length > 0) {
          setSelectedStaffId(data[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch staff list:", err);
    }
  };

  const dispatchToUser = async () => {
    setLoadingPhase("dispatch");
    setDispatchResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/admin/tasks/dispatch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-API-Key": ADMIN_API_KEY
        },
        body: JSON.stringify({
          staff_id: selectedStaffId,
          task_type: selectedTaskType,
          custom_pubkey: customPubkey.trim() || undefined
        })
      });

      if (!res.ok) {
        throw new Error(`Dispatch failed with status ${res.status}`);
      }

      const result: DispatchResult = await res.json();
      setDispatchResult(result);
    } catch (e) {
      console.error(e);
      alert("Failed to dispatch task to user");
    } finally {
      setLoadingPhase(null);
    }
  };

  const triggerDailyRounds = async () => {
    setLoadingPhase("daily_rounds");
    try {
      const res = await fetch(`${API_BASE}/api/admin/rounds/trigger`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Admin-API-Key": ADMIN_API_KEY
        }
      });
      if (res.ok) {
        alert("Daily Patient Rounds reminder sent to the Nurses channel!");
      } else {
        throw new Error("Failed to trigger rounds");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to trigger daily rounds reminder");
    } finally {
      setLoadingPhase(null);
    }
  };

  const selectedStaff = staffList.find(s => s.id === selectedStaffId);

  return (
    <div style={{ padding: "40px 20px", maxWidth: "640px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "bold", margin: "0 0 6px 0", color: "var(--text-primary)" }}>
            System Admin Simulator
          </h1>
          <p style={{ margin: "0", color: "var(--text-muted)", fontSize: "14px" }}>
            Assign tasks directly to user Buzz DMs or trigger automated department notifications.
          </p>
        </div>
        <button
          type="button"
          onClick={adminLogout}
          title="Lock Admin Portal"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 14px",
            fontSize: "13px",
            fontWeight: 600,
            color: "var(--text-secondary)",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-sm)",
            cursor: "pointer",
            transition: "all 0.2s ease"
          }}
        >
          🔒 Lock Portal
        </button>
      </div>

      {/* ── Section 1: User-Targeted Direct Message (DM) Dispatch ── */}
      <div style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        padding: "20px",
        boxShadow: "var(--shadow-card)",
        display: "flex",
        flexDirection: "column",
        gap: "16px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "20px" }}>💬</span>
          <h2 style={{ fontSize: "16px", fontWeight: "600", margin: 0 }}>
            Dispatch Task to User's Buzz DM
          </h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)" }}>
            Select Staff Member:
          </label>
          <select
            value={selectedStaffId}
            onChange={(e) => setSelectedStaffId(e.target.value)}
            style={{
              padding: "10px 12px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-subtle)",
              background: "var(--bg-base)",
              color: "var(--text-primary)",
              fontSize: "14px",
              outline: "none"
            }}
          >
            {staffList.map((staff) => (
              <option key={staff.id} value={staff.id}>
                {staff.name} ({staff.role}) {staff.has_dm ? "— [DM Direct]" : "— [Channel Fallback]"}
              </option>
            ))}
          </select>
          {selectedStaff && (
            <span style={{ fontSize: "12px", color: selectedStaff.has_dm ? "var(--success)" : "var(--text-muted)" }}>
              {selectedStaff.has_dm 
                ? `✓ Direct Message active (${selectedStaff.pubkey_preview})` 
                : "ℹ️ No pubkey yet — will deliver via #nurses channel with @mention fallback"}
            </span>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)" }}>
            Custom Pubkey / npub (Optional override):
          </label>
          <input
            type="text"
            placeholder="Paste npub1... or 64-character hex to send to any user"
            value={customPubkey}
            onChange={(e) => setCustomPubkey(e.target.value)}
            style={{
              padding: "10px 12px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-subtle)",
              background: "var(--bg-base)",
              color: "var(--text-primary)",
              fontSize: "13px",
              outline: "none"
            }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)" }}>
            Select Task / Workflow:
          </label>
          <select
            value={selectedTaskType}
            onChange={(e) => setSelectedTaskType(e.target.value)}
            style={{
              padding: "10px 12px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-subtle)",
              background: "var(--bg-base)",
              color: "var(--text-primary)",
              fontSize: "14px",
              outline: "none"
            }}
          >
            <option value="patient_round">📋 Daily Patient Rounds (/rounds)</option>
            <option value="shift_checkin">📍 Shift Check-in & Geofence (/task?phase_id=shift_checkin)</option>
            <option value="readiness_checklist">🩺 Equipment Readiness Check (/checklist?type=ecg-machine-check)</option>
            <option value="preshift">⏰ 30-Min Pre-Shift Alert</option>
          </select>
        </div>

        <button
          onClick={dispatchToUser}
          disabled={loadingPhase !== null}
          className="btn btn--active"
          style={{
            width: "100%",
            padding: "12px",
            fontWeight: "600",
            fontSize: "14px",
            background: "var(--accent)",
            color: "#fff",
            borderRadius: "var(--radius-sm)",
            cursor: loadingPhase !== null ? "not-allowed" : "pointer"
          }}
        >
          {loadingPhase === "dispatch" ? "Dispatching to Buzz..." : "Send Task to User's Buzz DM 🚀"}
        </button>

        {dispatchResult && (
          <div style={{
            padding: "12px 16px",
            borderRadius: "var(--radius-sm)",
            background: dispatchResult.delivery === "dm" ? "var(--success-dim)" : "var(--bg-elevated)",
            border: `1px solid ${dispatchResult.delivery === "dm" ? "var(--success)" : "var(--border-subtle)"}`,
            fontSize: "13px",
            color: "var(--text-primary)"
          }}>
            <div style={{ fontWeight: "600", marginBottom: "4px" }}>
              {dispatchResult.delivery === "dm" ? "✅ Sent to Buzz Private DM!" : "📢 Delivered to Team Channel"}
            </div>
            <div>{dispatchResult.message}</div>
            {dispatchResult.task_url && (
              <div style={{ marginTop: "6px" }}>
                <span style={{ color: "var(--text-muted)" }}>Link sent: </span>
                <a href={dispatchResult.task_url} target="_blank" rel="noreferrer" style={{ color: "var(--accent)", textDecoration: "underline" }}>
                  {dispatchResult.task_url}
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Section 2: General Department Triggers (Broadcast) ── */}
      <div style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        padding: "20px",
        boxShadow: "var(--shadow-card)",
        display: "flex",
        flexDirection: "column",
        gap: "12px"
      }}>
        <h2 style={{ fontSize: "15px", fontWeight: "600", margin: "0 0 4px 0", color: "var(--text-secondary)" }}>
          Department Broadcast & Quick Links
        </h2>

        <button 
          onClick={triggerDailyRounds} 
          disabled={loadingPhase !== null}
          className="btn"
          style={{
            width: "100%",
            border: "1px solid var(--border-subtle)",
            padding: "12px",
            borderRadius: "var(--radius-sm)",
            background: "var(--bg-base)",
            color: "var(--text-primary)",
            fontWeight: "500",
            cursor: "pointer"
          }}
        >
          {loadingPhase === "daily_rounds" ? "Sending Broadcast..." : "📢 Broadcast Daily Rounds to #nurses"}
        </button>
        
        <button 
          onClick={() => {
            const staff = selectedStaff || staffList[0];
            const query = staff ? `?staff_name=${encodeURIComponent(staff.name)}&staff_id=${staff.id}` : "";
            navigate(`/rounds${query}`);
          }}
          className="btn"
          style={{
            width: "100%",
            border: "1px solid var(--border-subtle)",
            padding: "12px",
            borderRadius: "var(--radius-sm)",
            background: "var(--bg-elevated)",
            color: "var(--text-primary)",
            fontWeight: "bold",
            cursor: "pointer"
          }}
        >
          Open Manager Patient Round Tracker →
        </button>
      </div>
    </div>
  );
}

