import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { authAPI, setAccessToken, clearAccessToken } from "./utils/api";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";

// ─── Auth Context ─────────────────────────────────────────────────────────────
export const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};

// ─── Auth Provider ────────────────────────────────────────────────────────────
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Start loading as true while we check auth

  const logout = useCallback(async () => {
    try { await authAPI.logout(); } catch (_) {}
    clearAccessToken();
    setUser(null);
  }, []);

  const login = useCallback(async (credentials) => {
    const { data } = await authAPI.login(credentials);
    const token = data.data?.access_token;
    if (!token) throw new Error("No access token received");
    setAccessToken(token);
    const { data: meData } = await authAPI.me();
    setUser(meData.data);
    return data;
  }, []);

  // Listen for token expiry from interceptor
  useEffect(() => {
    const handler = () => { clearAccessToken(); setUser(null); };
    window.addEventListener("auth:expired", handler);
    return () => window.removeEventListener("auth:expired", handler);
  }, []);

  // Attempt silent refresh on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Try to fetch the user profile. If successful, they are logged in.
        const { data } = await authAPI.me();
        setUser(data.data);
      } catch (error) {
        // If it fails (e.g., no token, expired token), ensure state is clean
        clearAccessToken();
        setUser(null);
      } finally {
        setLoading(false); // Stop the loading spinner
      }
    };
    initAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Protected Route ──────────────────────────────────────────────────────────
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <BootSplash />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

// ─── Public Route (redirect if already authed) ────────────────────────────────
function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) return <BootSplash />;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

// ─── Boot Splash ──────────────────────────────────────────────────────────────
function BootSplash() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0a",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      gap: "20px",
    }}>
      <div style={{
        width: "48px", height: "48px",
        border: "2px solid #1a1a1a",
        borderTop: "2px solid #f59e0b",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <span style={{ color: "#444", fontFamily: "monospace", fontSize: "12px", letterSpacing: "0.2em" }}>
        INITIALIZING VAULT
      </span>
    </div>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            // Base style for all toasts
            style: {
              background: "rgba(10, 10, 10, 0.85)", // Frosted dark glass
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              color: "#e0e0e0",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "12px",
              fontWeight: "500",
              letterSpacing: "0.05em",
              borderRadius: "12px",
              padding: "16px 20px",
              boxShadow: "0 20px 40px -10px rgba(0, 0, 0, 0.8), inset 0 1px 3px rgba(255, 255, 255, 0.05)",
            },
            // Specific style for Success toasts
            success: {
              iconTheme: { primary: "#f59e0b", secondary: "#111" },
              style: {
                borderLeft: "4px solid #f59e0b", // Glowing amber edge
                boxShadow: "0 20px 40px -10px rgba(0, 0, 0, 0.8), 0 0 30px rgba(245, 158, 11, 0.15)",
              },
            },
            // Specific style for Error toasts
            error: {
              iconTheme: { primary: "#ef4444", secondary: "#111" },
              style: {
                borderLeft: "4px solid #ef4444", // Glowing red edge
                boxShadow: "0 20px 40px -10px rgba(0, 0, 0, 0.8), 0 0 30px rgba(239, 68, 68, 0.15)",
              },
            },
          }}
        />
        
        
        <Routes>
          {/* Public Routes - Auto-redirect to dashboard if logged in */}
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

          {/* Protected Routes - Auto-redirect to login if NOT logged in */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

          {/* Catch-all fallbacks */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
