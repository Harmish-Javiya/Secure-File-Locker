import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { authAPI, setAccessToken } from "../utils/api";
import { useAuth } from "../App";

// ─── Password strength checker ────────────────────────────────────────────────
function checkStrength(password) {
  const checks = {
    length:  { label: "12+ characters",      pass: password.length >= 12 },
    upper:   { label: "Uppercase letter",     pass: /[A-Z]/.test(password) },
    lower:   { label: "Lowercase letter",     pass: /[a-z]/.test(password) },
    digit:   { label: "Number",               pass: /\d/.test(password) },
    special: { label: "Special character",    pass: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  };
  const passed = Object.values(checks).filter((c) => c.pass).length;
  return { checks, score: passed, total: 5 };
}

const STRENGTH_LABELS = ["", "Weak", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_COLORS = ["", "#ef4444", "#ef4444", "#f59e0b", "#84cc16", "#22c55e"];

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&family=Syne:wght@400;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .reg-root {
    min-height: 100vh;
    background: #080808;
    display: flex;
    font-family: 'IBM Plex Mono', monospace;
    overflow: hidden;
    position: relative;
  }

  .reg-bg-grid {
    position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(245,158,11,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(245,158,11,0.03) 1px, transparent 1px);
    background-size: 40px 40px;
    pointer-events: none;
  }

  .reg-bg-glow {
    position: absolute;
    width: 700px; height: 700px;
    background: radial-gradient(circle, rgba(245,158,11,0.05) 0%, transparent 70%);
    bottom: -200px; right: -200px;
    pointer-events: none;
  }

  .reg-panel {
    margin: auto;
    width: 100%;
    max-width: 440px;
    padding: 20px;
    position: relative;
    z-index: 1;
    animation: fadeUp 0.5s ease forwards;
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .reg-header { margin-bottom: 36px; }

  .reg-badge {
    display: inline-flex; align-items: center; gap: 6px;
    background: rgba(245,158,11,0.08);
    border: 1px solid rgba(245,158,11,0.2);
    border-radius: 2px;
    padding: 4px 10px;
    font-size: 10px;
    color: #f59e0b;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    margin-bottom: 16px;
  }

  .reg-title {
    font-family: 'Syne', sans-serif;
    font-size: 26px;
    font-weight: 800;
    color: #f0f0f0;
    letter-spacing: -0.02em;
    margin-bottom: 6px;
  }

  .reg-subtitle {
    font-size: 11px;
    color: #3a3a3a;
    letter-spacing: 0.1em;
    line-height: 1.6;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 16px;
  }

  .form-group { margin-bottom: 16px; }

  .form-label {
    display: block;
    font-size: 10px;
    color: #555;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    margin-bottom: 8px;
  }

  .form-input {
    width: 100%;
    background: #0e0e0e;
    border: 1px solid #1e1e1e;
    border-radius: 4px;
    padding: 12px 14px;
    color: #e0e0e0;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .form-input:focus {
    border-color: #f59e0b;
    box-shadow: 0 0 0 3px rgba(245,158,11,0.08);
  }

  .form-input::placeholder { color: #2a2a2a; }
  .form-input.error { border-color: #ef4444; }
  .form-input.valid { border-color: #22c55e; }

  .field-error {
    font-size: 10px;
    color: #ef4444;
    margin-top: 5px;
    letter-spacing: 0.05em;
  }

  .strength-meter { margin-top: 10px; }

  .strength-bars {
    display: flex; gap: 3px; margin-bottom: 8px;
  }

  .strength-bar {
    flex: 1; height: 3px; border-radius: 2px;
    background: #1a1a1a;
    transition: background 0.3s;
  }

  .strength-info {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 10px;
  }

  .strength-label {
    font-size: 10px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    transition: color 0.3s;
  }

  .strength-checks {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
    padding: 10px;
    background: #0a0a0a;
    border: 1px solid #161616;
    border-radius: 4px;
  }

  .strength-check-item {
    display: flex; align-items: center; gap: 6px;
    font-size: 10px;
    letter-spacing: 0.05em;
    transition: color 0.2s;
  }

  .check-icon {
    width: 12px; height: 12px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    font-size: 8px;
    transition: all 0.2s;
  }

  .btn-primary {
    width: 100%;
    background: #f59e0b;
    color: #0a0a0a;
    border: none;
    border-radius: 4px;
    padding: 13px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    cursor: pointer;
    transition: background 0.2s, transform 0.1s;
    margin-top: 8px;
    display: flex; align-items: center; justify-content: center; gap: 8px;
  }

  .btn-primary:hover:not(:disabled) { background: #fbbf24; }
  .btn-primary:active:not(:disabled) { transform: scale(0.99); }
  .btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }

  .login-link {
    text-align: center;
    font-size: 12px;
    color: #444;
    margin-top: 24px;
  }
  .login-link a { color: #f59e0b; text-decoration: none; font-weight: 500; }
  .login-link a:hover { text-decoration: underline; }

  .security-badges {
    display: flex; gap: 8px; flex-wrap: wrap;
    margin-top: 24px; padding-top: 20px;
    border-top: 1px solid #111;
  }

  .sec-badge {
    font-size: 9px;
    color: #2e2e2e;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    padding: 4px 8px;
    border: 1px solid #161616;
    border-radius: 2px;
  }

  .spinner {
    width: 14px; height: 14px;
    border: 2px solid rgba(10,10,10,0.3);
    border-top-color: #0a0a0a;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
`;

// ─── Component ────────────────────────────────────────────────────────────────
export default function Register() {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const [form, setForm] = useState({
    username: "", email: "", password: "", confirm: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const strength = useMemo(() => checkStrength(form.password), [form.password]);

  const validate = () => {
    const errs = {};
    if (!form.username || form.username.length < 3)
      errs.username = "Username must be at least 3 characters";
    if (!form.email || !/\S+@\S+\.\S+/.test(form.email))
      errs.email = "Valid email required";
    if (strength.score < 5)
      errs.password = "Password does not meet all requirements";
    if (form.password !== form.confirm)
      errs.confirm = "Passwords do not match";
    return errs;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      const { data } = await authAPI.register({
        username: form.username,
        email: form.email,
        password: form.password,
      });
      const token = data.data?.access_token;
      if (token) {
        setAccessToken(token);
        const { data: meData } = await (await import("../utils/api")).default.get("/api/auth/me");
        setUser(meData.data);
        toast.success("Vault credentials created");
        navigate("/dashboard");
      } else {
        toast.success("Registration successful — please log in");
        navigate("/login");
      }
    } catch (err) {
      const msg = err.response?.data?.error || "Registration failed";
      toast.error(msg);
      setErrors({ submit: msg });
    } finally {
      setLoading(false);
    }
  };

  const color = STRENGTH_COLORS[strength.score] || "#1a1a1a";

  return (
    <>
      <style>{styles}</style>
      <div className="reg-root">
        <div className="reg-bg-grid" />
        <div className="reg-bg-glow" />

        <div className="reg-panel">
          <div className="reg-header">
            <div className="reg-badge">
              <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
                <polygon points="4,0 8,8 0,8"/>
              </svg>
              New operator registration
            </div>
            <h1 className="reg-title">Create credentials</h1>
            <p className="reg-subtitle">Your data is encrypted before it leaves your device.</p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-row">
              <div className="form-group" style={{marginBottom:0}}>
                <label className="form-label">Username</label>
                <input
                  type="text"
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  placeholder="operator"
                  className={`form-input ${errors.username ? "error" : form.username.length >= 3 ? "valid" : ""}`}
                  autoFocus
                />
                {errors.username && <p className="field-error">{errors.username}</p>}
              </div>
              <div className="form-group" style={{marginBottom:0}}>
                <label className="form-label">Email</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="user@vault.io"
                  className={`form-input ${errors.email ? "error" : ""}`}
                />
                {errors.email && <p className="field-error">{errors.email}</p>}
              </div>
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
                autoComplete="new-password"
              />

              {form.password && (
                <div className="strength-meter">
                  <div className="strength-bars">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className="strength-bar"
                        style={{ background: i <= strength.score ? color : "#1a1a1a" }}
                      />
                    ))}
                  </div>
                  <div className="strength-info">
                    <span className="strength-label" style={{ color }}>
                      {STRENGTH_LABELS[strength.score]}
                    </span>
                    <span style={{ fontSize:"10px", color:"#333" }}>
                      {strength.score}/5 requirements
                    </span>
                  </div>
                  <div className="strength-checks">
                    {Object.entries(strength.checks).map(([key, { label, pass }]) => (
                      <div
                        key={key}
                        className="strength-check-item"
                        style={{ color: pass ? "#888" : "#2e2e2e" }}
                      >
                        <div
                          className="check-icon"
                          style={{
                            background: pass ? "rgba(34,197,94,0.15)" : "#111",
                            border: `1px solid ${pass ? "#22c55e" : "#1a1a1a"}`,
                            color: pass ? "#22c55e" : "#333",
                          }}
                        >
                          {pass ? "✓" : "·"}
                        </div>
                        {label}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {errors.password && <p className="field-error" style={{marginTop:"8px"}}>{errors.password}</p>}
            </div>

            <div className="form-group">
              <label className="form-label">Confirm password</label>
              <input
                type="password"
                name="confirm"
                value={form.confirm}
                onChange={handleChange}
                placeholder="••••••••••••"
                className={`form-input ${errors.confirm ? "error" : form.confirm && form.confirm === form.password ? "valid" : ""}`}
                autoComplete="new-password"
              />
              {errors.confirm && <p className="field-error">{errors.confirm}</p>}
            </div>

            {errors.submit && (
              <p className="field-error" style={{marginBottom:"12px"}}>{errors.submit}</p>
            )}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading && <span className="spinner" />}
              {loading ? "Creating vault..." : "Create Vault Access"}
            </button>
          </form>

          <p className="login-link">
            Already registered? <Link to="/login">Authenticate</Link>
          </p>

          <div className="security-badges">
            {["AES-256-GCM", "Argon2id", "JWT RS256", "OWASP Top 10", "Zero-knowledge"].map((b) => (
              <span key={b} className="sec-badge">{b}</span>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
