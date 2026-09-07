import React from "react";
import { useAuth } from "../context/AuthContext";
import { AdminPinPrompt } from "./AdminPinPrompt";

interface ProtectedRouteProps {
  children: React.ReactNode;
  role?: "admin" | "manager" | "nurse" | "user";
}

export function ProtectedRoute({ children, role = "admin" }: ProtectedRouteProps) {
  const { isAdminAuthenticated, user } = useAuth();

  if (role === "admin") {
    if (!isAdminAuthenticated) {
      return <AdminPinPrompt />;
    }
    return <>{children}</>;
  }

  // Future role-based check
  if (role && (!user || user.role !== role)) {
    return (
      <div className="checklist-page" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <div className="checklist-card" style={{ maxWidth: "400px", textAlign: "center", padding: "30px" }}>
          <h2>Access Restricted</h2>
          <p style={{ color: "var(--text-muted)", marginTop: "8px" }}>You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
