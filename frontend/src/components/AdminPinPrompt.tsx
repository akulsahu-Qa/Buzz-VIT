import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

export function AdminPinPrompt() {
  const { verifyAdminPin } = useAuth();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) return;

    const success = verifyAdminPin(pin);
    if (!success) {
      setError(true);
      setErrorMessage("Incorrect PIN. Please try again.");
      setPin("");
      inputRef.current?.focus();
    }
  };

  return (
    <div className="checklist-page" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div
        className="checklist-card"
        style={{
          maxWidth: "400px",
          width: "100%",
          padding: "36px 28px",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "18px",
        }}
      >
        <div
          style={{
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            background: "var(--bg-elevated)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "26px",
            border: "1px solid var(--border-subtle)",
          }}
        >
          🔒
        </div>

        <div>
          <h2 style={{ fontSize: "20px", fontWeight: "700", margin: "0 0 6px 0", color: "var(--text-primary)" }}>
            Admin Access Required
          </h2>
          <p style={{ margin: 0, fontSize: "14px", color: "var(--text-muted)" }}>
            Please enter your security PIN to access the Admin Simulator.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ width: "100%", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <input
              ref={inputRef}
              type="password"
              inputMode="numeric"
              maxLength={8}
              placeholder="••••"
              value={pin}
              onChange={(e) => {
                setError(false);
                setPin(e.target.value);
              }}
              style={{
                width: "100%",
                padding: "14px 16px",
                fontSize: "22px",
                letterSpacing: "8px",
                textAlign: "center",
                borderRadius: "var(--radius-sm)",
                border: error ? "2px solid var(--danger)" : "1px solid var(--border-subtle)",
                background: "var(--bg-base)",
                color: "var(--text-primary)",
                outline: "none",
                transition: "all 0.2s ease",
              }}
            />
            {error && (
              <span style={{ fontSize: "12px", color: "var(--danger)", fontWeight: "500" }}>
                {errorMessage}
              </span>
            )}
          </div>

          <button
            type="submit"
            className="btn btn--active"
            style={{
              width: "100%",
              padding: "12px",
              fontWeight: "600",
              fontSize: "15px",
              background: "var(--accent)",
              color: "#fff",
              borderRadius: "var(--radius-sm)",
              cursor: "pointer",
            }}
          >
            Unlock Portal →
          </button>
        </form>

        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-muted)" }}>
          <span>💡</span>
          <span>Demo Default PIN: <strong style={{ color: "var(--text-secondary)" }}>1234</strong></span>
        </div>
      </div>
    </div>
  );
}
