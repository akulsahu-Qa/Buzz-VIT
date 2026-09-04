import { useState } from "react";
import { useNavigate } from "react-router-dom";

export function ShiftCheckinBlock({ taskId }: { taskId: string; phaseId: string }) {
  const [geofenceStatus, setGeofenceStatus] = useState<"unknown" | "valid" | "out_of_bounds">("unknown");
  const [isVerifying, setIsVerifying] = useState(false);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleVerifyLocation = () => {
    setIsVerifying(true);
    // Mocking Geolocation check for the demo
    setTimeout(() => {
      // For demo purposes, prompt the user if they want to simulate being in bounds or out of bounds
      const simulateSuccess = window.confirm("Demo Geofencing: Click OK to simulate being AT the hospital. Click Cancel to simulate being OUT OF BOUNDS.");
      setGeofenceStatus(simulateSuccess ? "valid" : "out_of_bounds");
      setIsVerifying(false);
    }, 1500);
  };

  const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

  const handleCheckIn = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        checkin_time: new Date().toISOString(),
        geofence_status: geofenceStatus,
        reason: geofenceStatus === "out_of_bounds" ? reason : undefined,
        is_late: false // Let the backend sweeper handle actual timeouts, but we can send false by default
      };

      const res = await fetch(`${API_BASE}/api/tasks/${taskId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload }),
      });

      const data = await res.json();
      if (res.ok) {
        alert("Check-in Successful!");
        navigate("/admin"); // Redirect back to simulator or success page
      } else {
        alert(`Failed: ${data.detail}`);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to submit check-in");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="checklist-page">
      <div className="checklist-card" style={{ maxWidth: "500px", margin: "40px auto", padding: "30px" }}>
        
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <div style={{ fontSize: "40px", marginBottom: "10px" }}>🏥</div>
          <h1 style={{ fontSize: "24px", fontWeight: "bold", margin: "0 0 8px 0" }}>Shift Check-in</h1>
          <p style={{ color: "var(--text-muted)", margin: 0 }}>Please verify your location to start your shift.</p>
        </div>

        <div style={{ background: "var(--bg-elevated)", padding: "20px", borderRadius: "12px", border: "1px solid var(--border-subtle)", marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <span style={{ fontWeight: 600 }}>Location Status</span>
            {geofenceStatus === "unknown" && <span style={{ color: "var(--text-muted)" }}>Unverified 📍</span>}
            {geofenceStatus === "valid" && <span style={{ color: "var(--success)", fontWeight: "bold" }}>In Bounds ✅</span>}
            {geofenceStatus === "out_of_bounds" && <span style={{ color: "var(--danger)", fontWeight: "bold" }}>Out of Bounds ❌</span>}
          </div>

          <button 
            onClick={handleVerifyLocation}
            disabled={isVerifying || geofenceStatus === "valid"}
            style={{
              width: "100%",
              padding: "12px",
              background: geofenceStatus === "valid" ? "var(--bg-hover)" : "var(--primary)",
              color: geofenceStatus === "valid" ? "var(--text-muted)" : "white",
              border: "none",
              borderRadius: "8px",
              fontWeight: 600,
              cursor: geofenceStatus === "valid" ? "not-allowed" : "pointer"
            }}
          >
            {isVerifying ? "Locating..." : geofenceStatus === "valid" ? "Location Verified" : "Verify Location"}
          </button>
        </div>

        {geofenceStatus === "out_of_bounds" && (
          <div style={{ background: "var(--danger-light, #fee2e2)", padding: "16px", borderRadius: "8px", marginBottom: "24px" }}>
            <p style={{ margin: "0 0 12px 0", color: "var(--danger)", fontWeight: 600, fontSize: "14px" }}>
              ⚠️ You appear to be outside the hospital radius. Please provide a reason (e.g., parking, remote duty).
            </p>
            <input 
              type="text" 
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for out of bounds check-in..."
              style={{
                width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid var(--danger)", background: "white"
              }}
            />
          </div>
        )}

        <button 
          onClick={handleCheckIn}
          disabled={isSubmitting || geofenceStatus === "unknown" || (geofenceStatus === "out_of_bounds" && !reason.trim())}
          style={{
            width: "100%",
            padding: "14px",
            background: "var(--success)",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontWeight: "bold",
            fontSize: "16px",
            cursor: (isSubmitting || geofenceStatus === "unknown" || (geofenceStatus === "out_of_bounds" && !reason.trim())) ? "not-allowed" : "pointer",
            opacity: (isSubmitting || geofenceStatus === "unknown" || (geofenceStatus === "out_of_bounds" && !reason.trim())) ? 0.6 : 1
          }}
        >
          {isSubmitting ? "Checking in..." : "Confirm Check-in"}
        </button>

      </div>
    </div>
  );
}
