import React, { createContext, useContext, useState, useEffect } from "react";

interface AuthUser {
  id: string;
  name?: string;
  role: "admin" | "manager" | "nurse" | "user";
}

interface AuthContextType {
  // Admin PIN Auth
  isAdminAuthenticated: boolean;
  verifyAdminPin: (pin: string) => boolean;
  adminLogout: () => void;

  // Extensible User Auth for future routes
  user: AuthUser | null;
  loginUser: (user: AuthUser) => void;
  logoutUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Default admin PIN can be configured via VITE_ADMIN_PIN in .env or defaults to 1234
const DEFAULT_ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN || "1234";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem("admin_authenticated") === "true";
  });

  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem("auth_user");
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    sessionStorage.setItem("admin_authenticated", isAdminAuthenticated ? "true" : "false");
  }, [isAdminAuthenticated]);

  const verifyAdminPin = (inputPin: string): boolean => {
    const cleaned = inputPin.trim();
    if (cleaned === DEFAULT_ADMIN_PIN) {
      setIsAdminAuthenticated(true);
      return true;
    }
    return false;
  };

  const adminLogout = () => {
    setIsAdminAuthenticated(false);
    sessionStorage.removeItem("admin_authenticated");
  };

  const loginUser = (newUser: AuthUser) => {
    setUser(newUser);
    localStorage.setItem("auth_user", JSON.stringify(newUser));
  };

  const logoutUser = () => {
    setUser(null);
    localStorage.removeItem("auth_user");
  };

  return (
    <AuthContext.Provider
      value={{
        isAdminAuthenticated,
        verifyAdminPin,
        adminLogout,
        user,
        loginUser,
        logoutUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
