import React, { createContext, useContext, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { authAPI, setTokens, clearTokens } from "./utils/api";

// We will build these pages next!
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Landing from "./pages/Landing";

// 1. Create the Auth Context (Global State)
const AuthContext = createContext(null);

// Custom hook so any component (like your Dashboard) can access auth data
export const useAuth = () => useContext(AuthContext);

// 2. Protected Route Component (Security Feature)
// This aggressively kicks unauthenticated users back to the login screen
function ProtectedRoute({ children }) {
  const auth = useAuth();
  if (!auth.user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  const [user, setUser] = useState(null);

  // 3. The Central Login Function
  const login = async (email, password, mfa_token) => {
    // A. Hit the backend login route
    const res = await authAPI.login({ email, password, mfa_token });
    const { access_token, refresh_token } = res.data.data;
    
    // B. Securely store tokens IN MEMORY (Prevents XSS attacks)
    setTokens(access_token, refresh_token);
    
    // C. Fetch the user's secure profile data
    const meRes = await authAPI.getMe();
    setUser(meRes.data.data);
  };

  // 4. The Central Logout Function
  const logout = async () => {
    try {
      // Tell the backend to invalidate the token
      await authAPI.logout();
    } catch (err) {
      console.error("Logout error", err);
    } finally {
      // Wipe the memory and state
      clearTokens();
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout }}>
      <BrowserRouter>
        {/* Elite Cyber-Themed Toaster for Notifications */}
        <Toaster 
          position="top-right" 
          toastOptions={{
            style: {
              background: '#0a0a0a',
              color: '#e0e0e0',
              border: '1px solid #333',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '12px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.8)'
            },
            success: { iconTheme: { primary: '#22c55e', secondary: '#0a0a0a' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#0a0a0a' } }
          }} 
        />
        
        <Routes>
          {/* Default Route redirects to Dashboard (which protects itself) */}
          <Route path="/" element={<Landing />} />
          
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Secure Routes */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}