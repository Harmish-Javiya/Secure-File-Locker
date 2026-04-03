import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../App";

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&family=Syne:wght@400;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  /* 1. THE CYBER GRID BACKGROUND (Matches Dashboard) */
  .login-root {
    min-height: 100vh;
    background-color: #050505;
    background-image: 
      radial-gradient(circle at 50% 0%, rgba(245, 158, 11, 0.08) 0%, transparent 60%),
      linear-gradient(rgba(245, 158, 11, 0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(245, 158, 11, 0.04) 1px, transparent 1px);
    background-size: 100% 100%, 32px 32px, 32px 32px;
    animation: panCyberGrid 15s linear infinite;
    display: flex; align-items: center; justify-content: center;
    font-family: 'IBM Plex Mono', monospace;
    overflow: hidden; position: relative;
  }

  @keyframes panCyberGrid {
    0% { background-position: 0 0, 0px 0px, 0px 0px; }
    100% { background-position: 0 0, 32px 32px, 32px 32px; }
  }

  /* 2. THE 3D GLASSMORPHISM PANEL */
  .login-panel {
    margin: auto; width: 100%; max-width: 440px; padding: 48px;
    background: linear-gradient(145deg, rgba(20, 20, 20, 0.6) 0%, rgba(5, 5, 5, 0.8) 100%);
    backdrop-filter: blur(24px) saturate(150%); -webkit-backdrop-filter: blur(24px) saturate(150%);
    border: 1px solid rgba(255, 255, 255, 0.06); border-top: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 24px;
    box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.9), 0 0 40px rgba(245, 158, 11, 0.05);
    position: relative; z-index: 10;
    animation: fadeUpSmooth 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  @keyframes fadeUpSmooth {
    from { opacity: 0; transform: translateY(30px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* 3. THE FLOATING VAULT LOGO */
  @keyframes floatIcon {
    0% { transform: translateY(0px); }
    50% { transform: translateY(-8px); filter: drop-shadow(0 8px 12px rgba(245, 158, 11, 0.3)); }
    100% { transform: translateY(0px); }
  }

  .vault-icon {
    width: 64px; height: 64px; margin-bottom: 24px;
    background: linear-gradient(135deg, rgba(245,158,11,0.15), transparent);
    border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 16px;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 8px 20px rgba(0,0,0,0.5);
    animation: floatIcon 3s ease-in-out infinite;
  }

  /* 4. METALLIC TYPOGRAPHY */
  .login-title {
    font-family: 'Syne', sans-serif; font-size: 32px; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 6px;
    background: linear-gradient(135deg, #ffffff 0%, #a3a3a3 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  }

  .login-subtitle { font-size: 11px; color: #666; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 36px; }

  /* GLOWING STATUS BAR */
  .status-bar {
    display: flex; align-items: center; gap: 10px; margin-bottom: 32px;
    padding: 12px 16px; background: rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 8px; box-shadow: inset 0 2px 6px rgba(0,0,0,0.5);
  }
  .status-dot {
    width: 8px; height: 8px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 10px #22c55e;
    animation: pulse 2s ease-in-out infinite;
  }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
  .status-text { font-size: 10px; color: #888; letter-spacing: 0.12em; font-weight: 600; }

  /* PREMIUM INPUTS */
  .form-group { margin-bottom: 20px; }
  .form-label { display: block; font-size: 10px; color: #777; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 8px; font-weight: 600;}
  .form-input {
    width: 100%; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px;
    padding: 14px 16px; color: #e0e0e0; font-family: 'IBM Plex Mono', monospace; font-size: 13px;
    outline: none; transition: all 0.3s; box-shadow: inset 0 2px 6px rgba(0,0,0,0.5);
  }
  .form-input:focus { border-color: #f59e0b; box-shadow: inset 0 2px 6px rgba(0,0,0,0.5), 0 0 12px rgba(245, 158, 11, 0.2); }
  .form-input::placeholder { color: #444; }
  .form-input.error { border-color: #ef4444; box-shadow: inset 0 2px 6px rgba(0,0,0,0.5), 0 0 12px rgba(239, 68, 68, 0.2); }
  .field-error { font-size: 10px; color: #ef4444; margin-top: 8px; letter-spacing: 0.05em; }

  /* MFA SECTION */
  .mfa-section {
    background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.05); border-left: 3px solid #f59e0b;
    border-radius: 8px; padding: 16px; margin-bottom: 24px; animation: slideIn 0.3s ease; box-shadow: inset 0 0 20px rgba(245, 158, 11, 0.05);
  }
  @keyframes slideIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
  .mfa-label { font-size: 10px; color: #f59e0b; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 12px; font-weight: 600;}

  /* 5. TACTICAL 3D BUTTON */
  .btn-primary {
    width: 100%; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #080808;
    border: none; border-radius: 8px; padding: 16px;
    font-family: 'IBM Plex Mono', monospace; font-size: 12px; font-weight: 700;
    letter-spacing: 0.15em; text-transform: uppercase; cursor: pointer;
    transition: all 0.2s; margin-top: 12px;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    box-shadow: 0 8px 20px rgba(245, 158, 11, 0.2);
  }
  .btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 24px rgba(245, 158, 11, 0.3); filter: brightness(1.1); }
  .btn-primary:active:not(:disabled) { transform: scale(0.98); }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; transform: none; }

  /* DIVIDER */
  .divider { display: flex; align-items: center; gap: 12px; margin: 36px 0 24px; }
  .divider-line { flex: 1; height: 1px; background: rgba(255,255,255,0.08); }
  .divider-text { font-size: 9px; color: #555; letter-spacing: 0.2em; text-transform: uppercase; }

  .register-link { text-align: center; font-size: 11px; color: #666; letter-spacing: 0.05em; }
  .register-link a { color: #f59e0b; text-decoration: none; font-weight: 600; transition: all 0.2s;}
  .register-link a:hover { color: #fbbf24; text-shadow: 0 0 10px rgba(245, 158, 11, 0.4); }

  .spinner { width: 14px; height: 14px; border: 2px solid rgba(10,10,10,0.3); border-top-color: #0a0a0a; border-radius: 50%; animation: spin 0.6s linear infinite; }
`;

// ─── Component ────────────────────────────────────────────────────────────────
export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/dashboard";

  const [form, setForm] = useState({ email: "", password: "", mfa_token: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showMFA, setShowMFA] = useState(false);

  const mfaRef = useRef(null);
  useEffect(() => { if (showMFA) mfaRef.current?.focus(); }, [showMFA]);

  const validate = () => {
    const errs = {};
    if (!form.email) errs.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = "Invalid email format";
    if (!form.password) errs.password = "Password is required";
    return errs;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: "" }));
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    // ... validation ...
    setLoading(true);
    try {
      const payload = { email: form.email, password: form.password };
      if (showMFA && form.mfa_token) payload.mfa_token = form.mfa_token;
  
      // Call the login logic from AuthContext
      const data = await login(payload);
  
      if (data.code === "MFA_REQUIRED") {
        setShowMFA(true);
        toast("Identity verification required", { icon: "🔐" });
        return; // Stop here, waiting for code
      }
  
      // If we reach here and have a user, AuthProvider already handled state
      if (data.data?.access_token) {
        toast.success("Access granted");
        navigate(from, { replace: true });
      }
    } catch (err) {
      const msg = err.response?.data?.error || "Authentication failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="login-root">
        <div className="login-panel">
          
          <div className="vault-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="7" width="18" height="14" rx="3" stroke="#f59e0b" strokeWidth="1.5"/>
              <circle cx="12" cy="14" r="2.5" stroke="#f59e0b" strokeWidth="1.5"/>
              <path d="M12 14h2.5" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M8 7V5a4 4 0 018 0v2" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="18" cy="10" r="1" fill="#f59e0b" opacity="0.5"/>
            </svg>
          </div>

          <h1 className="login-title">Secure Vault</h1>
          <p className="login-subtitle">AES-256-GCM · Argon2id · Zero-knowledge</p>

          <div className="status-bar">
            <div className="status-dot" />
            <span className="status-text">VAULT ONLINE · TLS ACTIVE · END-TO-END ENCRYPTED</span>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="operator@vault.local"
                className={`form-input ${errors.email ? "error" : ""}`}
                autoComplete="email"
                autoFocus
              />
              {errors.email && <p className="field-error">{errors.email}</p>}
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••••••"
                className={`form-input ${errors.password ? "error" : ""}`}
                autoComplete="current-password"
              />
              {errors.password && <p className="field-error">{errors.password}</p>}
            </div>

            {showMFA && (
              <div className="mfa-section">
                <p className="mfa-label">⬡ Multi-factor authentication</p>
                <input
                  ref={mfaRef}
                  type="text"
                  name="mfa_token"
                  value={form.mfa_token}
                  onChange={handleChange}
                  placeholder="000000"
                  className="form-input"
                  maxLength={6}
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
              </div>
            )}

            {errors.submit && <p className="field-error" style={{marginBottom:"12px"}}>{errors.submit}</p>}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : null}
              {loading ? "Authenticating..." : "Unlock Vault"}
            </button>
          </form>

          <div className="divider">
            <div className="divider-line" />
            <span className="divider-text">NEW OPERATOR</span>
            <div className="divider-line" />
          </div>

          <p className="register-link">
            No account? <Link to="/register">Register access credentials</Link>
          </p>
        </div>
      </div>
    </>
  );
}