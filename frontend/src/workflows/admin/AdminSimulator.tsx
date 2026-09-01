import { useState } from "react";
import { useNavigate } from "react-router-dom";

export function AdminSimulator() {
  const [loadingPhase, setLoadingPhase] = useState<string | null>(null);
  const navigate = useNavigate();

  const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";
  const ADMIN_API_KEY = import.meta.env.VITE_ADMIN_API_KEY ?? "supersecret123";

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

  return (
    <div style={{ padding: "40px 20px", maxWidth: "600px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <h1 style={{ fontSize: "24px", fontWeight: "bold", margin: "0 0 10px 0" }}>System Admin Simulator</h1>
        <p style={{ margin: "0", color: "var(--text-muted)" }}>
          Use these buttons to manually simulate the cron jobs triggering specific workflows. 
        </p>
      </div>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <button 
          onClick={triggerDailyRounds} 
          disabled={loadingPhase !== null}
          className="btn btn--active"
          style={{ width: "100%" }}
        >
          {loadingPhase === "daily_rounds" ? "Sending..." : "Trigger: Daily Patient Rounds Reminder (to Buzz)"}
        </button>
        
        <button 
          onClick={() => navigate("/rounds")}
          className="btn"
          style={{ width: "100%", border: "1px solid var(--border-color)", padding: "12px", borderRadius: "8px", background: "var(--bg-elevated)", color: "var(--text-primary)", fontWeight: "bold" }}
        >
          Open Manager Patient Round Tracker
        </button>
      </div>
    </div>
  );
}
