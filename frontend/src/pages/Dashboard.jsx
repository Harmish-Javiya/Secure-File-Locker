
import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../App";
import { authAPI, filesAPI } from "../utils/api";
import FileUpload from "../components/FileUpload";
import FileList from "../components/FileList";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&family=Syne:wght@400;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .dash-root {
    min-height: 100vh;
    background-color: #050505;
    
    background-image: 
      /* Layer 1: Subtle center glow */
      radial-gradient(circle at 50% 50%, rgba(245, 158, 11, 0.05) 0%, transparent 80%),
      /* Layer 2: The clean grid */
      linear-gradient(rgba(245, 158, 11, 0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(245, 158, 11, 0.03) 1px, transparent 1px);

    background-size: 100% 100%, 40px 40px, 40px 40px;
    
    display: flex;
    font-family: 'IBM Plex Mono', monospace;
    color: #e0e0e0;
    position: relative;
    overflow: hidden;
  }

  /* Animations fixed (moved outside of classes) */
  @keyframes orbMove {
    0% { transform: translate(0, 0); }
    50% { transform: translate(80px, 40px); }
    100% { transform: translate(-40px, 80px); }
  }

  @keyframes pulseFade { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

  @keyframes tabFadeSlide {
    0% { opacity: 0; transform: translateY(10px) scale(0.99); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
  }

  @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

  @keyframes pulse-animation {
    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
    70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(34, 197, 94, 0); }
    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
  }

  @keyframes connection-glow {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(1.2); box-shadow: 0 0 15px #22c55e; }
  }

  @keyframes connection-pulse {
    0% { transform: scale(0.9); opacity: 1; }
    50% { transform: scale(1.1); opacity: 0.5; box-shadow: 0 0 15px #22c55e; }
    100% { transform: scale(0.9); opacity: 1; }
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  /* 2. GLASSMORPHISM SIDEBAR */
  .sidebar {
    width: 240px;
    flex-shrink: 0;
    margin: 20px;
    height: calc(100vh - 40px);
    border-radius: 24px;
    position: sticky; top: 20px; z-index: 20;
    background: linear-gradient(135deg, rgba(40, 40, 40, 0.3) 0%, rgba(10, 10, 10, 0.1) 100%);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-top: 1px solid rgba(255, 255, 255, 0.12);
    border-left: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: 0 24px 48px -12px rgba(0, 0, 0, 0.8), inset 0 0 20px rgba(255, 255, 255, 0.02);
    display: flex; flex-direction: column; padding: 24px 0; overflow: hidden;
  }

  .sidebar-logo {
    padding: 0 20px 28px; display: flex; align-items: center; gap: 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .sidebar-logo-icon {
    width: 32px; height: 32px;
    background: linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.05));
    border: 1px solid rgba(245,158,11,0.3); border-radius: 8px;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.15);
  }

  .sidebar-logo-text {
    font-family: 'Syne', sans-serif; font-size: 16px; font-weight: 800; letter-spacing: -0.02em;
    background: linear-gradient(135deg, #fcd34d 0%, #f59e0b 50%, #b45309 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  }

  .topbar-title {
    font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 800; letter-spacing: -0.02em;
    background: linear-gradient(135deg, #ffffff 0%, #a3a3a3 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  }

  .sidebar-section { padding: 24px 0 0; flex: 1; }
  .sidebar-label { padding: 0 24px 8px; font-size: 9px; color: rgba(255, 255, 255, 0.4); letter-spacing: 0.2em; text-transform: uppercase; }

  .sidebar-item {
    display: flex; align-items: center; gap: 12px; padding: 10px 24px;
    font-size: 12px; color: #888; cursor: pointer; letter-spacing: 0.05em;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    background: transparent; border: none; width: 100%; text-align: left;
    position: relative; z-index: 1;
  }

  .sidebar-item:hover { color: #fff; }
  .sidebar-item.active { color: #f59e0b; }

  .sidebar-item::after {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(90deg, rgba(245, 158, 11, 0.1) 0%, transparent 100%);
    opacity: 0; transform: translateX(-20px); transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); z-index: -1;
  }
  .sidebar-item.active::after { opacity: 1; transform: translateX(0); }

  .sidebar-item::before {
    content: ''; position: absolute; left: 0; top: 50%; bottom: 50%; width: 3px;
    background: #f59e0b; border-radius: 0 4px 4px 0; box-shadow: 0 0 0px rgba(245, 158, 11, 0);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .sidebar-item.active::before { top: 0; bottom: 0; box-shadow: 0 0 10px rgba(245, 158, 11, 0.5); }

  .sidebar-bottom { padding: 20px 24px; border-top: 1px solid rgba(255, 255, 255, 0.05); }

  .user-card {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 16px;
    padding: 16px;
    margin-bottom: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    box-shadow: inset 0 2px 10px rgba(0,0,0,0.5);
    position: relative;
    overflow: hidden;
  }

  .user-card::before {
    content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
    background: linear-gradient(45deg, transparent, rgba(255,255,255,0.01), transparent);
    transform: rotate(45deg); pointer-events: none;
  }

  .user-info-wrapper { display: flex; align-items: center; gap: 12px; }

  .user-avatar {
    width: 36px; height: 36px;
    background: linear-gradient(135deg, rgba(245,158,11,0.1), rgba(245,158,11,0.02));
    border: 1px solid rgba(245,158,11,0.2);
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    color: #f59e0b;
    flex-shrink: 0;
  }

  .user-details { min-width: 0; }
  .user-card-name { font-size: 13px; font-weight: 600; color: #eee; margin-bottom: 2px; display: flex; align-items: center; gap: 6px; }

  .status-pulse {
    width: 6px; height: 6px; background: #22c55e; border-radius: 50%;
    box-shadow: 0 0 8px #22c55e; animation: pulseFade 2s infinite;
  }

  .user-card-email { font-size: 10px; color: #555; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: 0.02em; }

  .user-card-mfa {
    align-self: flex-start;
    font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase;
    padding: 4px 10px; border-radius: 20px;
    font-weight: 700;
    display: flex; align-items: center; gap: 5px;
  }

  .user-card-mfa.enabled { background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.2); color: #22c55e; box-shadow: 0 0 10px rgba(34, 197, 94, 0.1); }
  .user-card-mfa.disabled { background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.2); color: #ef4444; box-shadow: 0 0 10px rgba(239, 68, 68, 0.1); }

  .logout-btn {
    width: 100%; background: rgba(0, 0, 0, 0.2); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 8px;
    padding: 10px; font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #888; cursor: pointer;
    letter-spacing: 0.12em; text-transform: uppercase; transition: all 0.2s;
    display: flex; align-items: center; justify-content: center; gap: 6px;
  }
  .logout-btn:hover { background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.3); color: #ef4444; }

  .main { flex: 1; min-width: 0; display: flex; flex-direction: column; }

  .topbar {
    margin: 20px 20px 20px 0; padding: 16px 28px;
    background: linear-gradient(135deg, rgba(40, 40, 40, 0.3) 0%, rgba(10, 10, 10, 0.1) 100%);
    backdrop-filter: blur(24px) saturate(180%); -webkit-backdrop-filter: blur(24px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.06); border-top: 1px solid rgba(255, 255, 255, 0.12); border-radius: 16px;
    box-shadow: 0 8px 32px -8px rgba(0, 0, 0, 0.6);
    display: flex; align-items: center; justify-content: space-between; position: sticky; top: 20px; z-index: 10;
  }

  .refresh-btn {
    background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.05); border-radius: 6px; padding: 8px 14px;
    font-family: 'IBM Plex Mono', monospace; font-size: 10px; color: #888; cursor: pointer;
    letter-spacing: 0.12em; text-transform: uppercase; transition: all 0.2s; display: flex; align-items: center; gap: 6px;
  }
  .refresh-btn:hover { border-color: #f59e0b; color: #f59e0b; }

  .tab-transition-wrapper { animation: tabFadeSlide 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

  .stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
  .stat-card {
    background: rgb(10, 10, 10); backdrop-filter: blur(50px);
    border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 20px;
    box-shadow: 0 10px 30px -10px rgba(245, 158, 11, 0.1); transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .stat-card:hover { transform: translateY(-2px); box-shadow: 0 10px 40px -10px rgba(245, 158, 11, 0.2); }
  .stat-value { font-family: 'Syne', sans-serif; font-size: 24px; font-weight: 800; color: #e0e0e0; margin-bottom: 4px; }
  .stat-label { font-size: 9px; color: #888; letter-spacing: 0.18em; text-transform: uppercase; }

  .security-card {
    background: linear-gradient(145deg, rgba(20, 20, 20, 0.6) 0%, rgba(5, 5, 5, 0.8) 100%);
    backdrop-filter: blur(24px) saturate(150%); -webkit-backdrop-filter: blur(24px) saturate(150%);
    border: 1px solid rgba(255, 255, 255, 0.06); border-top: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 20px; padding: 40px;
    box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.9), 0 0 40px rgba(245, 158, 11, 0.05);
  }

  .sec-title {
    font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 24px;
    background: linear-gradient(135deg, #ffffff 0%, #a3a3a3 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  }

  .mfa-status-box {
    background: rgba(0, 0, 0, 0.6); border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 8px; padding: 20px; margin-bottom: 24px; box-shadow: inset 0 2px 10px rgba(0,0,0,0.8); transition: all 0.3s ease;
  }
  .mfa-status-box.disabled { border-left: 3px solid #ef4444; background: linear-gradient(90deg, rgba(239, 68, 68, 0.05) 0%, transparent 100%); }
  .mfa-status-box.enabled { border-left: 3px solid #22c55e; background: linear-gradient(90deg, rgba(34, 197, 94, 0.05) 0%, transparent 100%); }
  .mfa-status-label { font-size: 11px; letter-spacing: 0.15em; font-weight: 600; margin-bottom: 6px; display: flex; align-items: center; gap: 8px; }
  .mfa-status-label.disabled { color: #ef4444; text-shadow: 0 0 10px rgba(239, 68, 68, 0.3); }
  .mfa-status-label.enabled { color: #22c55e; text-shadow: 0 0 10px rgba(34, 197, 94, 0.3); }

  .btn-premium-amber {
    width: 100%; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #080808; border: none; border-radius: 8px; padding: 14px;
    font-family: 'IBM Plex Mono', monospace; font-size: 12px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; cursor: pointer;
    transition: all 0.2s; box-shadow: 0 8px 20px rgba(245, 158, 11, 0.2); display: flex; align-items: center; justify-content: center; gap: 8px;
  }
  .btn-premium-amber:hover { transform: translateY(-2px); box-shadow: 0 12px 24px rgba(245, 158, 11, 0.3); filter: brightness(1.1); }
  .btn-premium-amber:active { transform: scale(0.98); }

  .btn-premium-danger {
    width: 100%; background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 14px;
    font-family: 'IBM Plex Mono', monospace; font-size: 12px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; cursor: pointer; transition: all 0.2s;
  }
  .btn-premium-danger:hover { background: rgba(239, 68, 68, 0.2); border-color: #ef4444; color: #f87171; transform: translateY(-2px); box-shadow: 0 8px 20px rgba(239, 68, 68, 0.2); }
  .btn-premium-danger:active { transform: scale(0.98); }

  .account-row { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.03); font-size: 13px; transition: all 0.2s; border-radius: 6px; }
  .account-row:hover { background: rgba(255, 255, 255, 0.02); transform: translateX(4px); }
  .account-row:last-child { border-bottom: none; }
  .account-label { color: #888; letter-spacing: 0.08em; display: flex; align-items: center; gap: 10px; }
  .account-value { color: #ccc; font-weight: 500; }

  .modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 999; backdrop-filter: blur(4px); }
  .modal { background: #0e0e0e; border: 1px solid #2a2a2a; border-radius: 16px; padding: 32px; width: 400px; max-width: 92vw; font-family: 'IBM Plex Mono', monospace; box-shadow: 0 20px 40px rgba(0,0,0,0.8); }
  .modal-title { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 700; color: #e0e0e0; margin-bottom: 6px; }
  .modal-sub { font-size: 12px; color: #666; margin-bottom: 20px; line-height: 1.6; }
  .qr-box { background: #fff; border-radius: 8px; padding: 12px; display: inline-block; margin-bottom: 16px; }
  .qr-box img { display: block; width: 160px; height: 160px; }
  .secret-row { background: #080808; border: 1px solid #1e1e1e; border-radius: 6px; padding: 12px; font-size: 12px; color: #888; letter-spacing: 0.12em; margin-bottom: 20px; word-break: break-all; }
  .modal-input { width: 100%; background: #080808; border: 1px solid #1e1e1e; border-radius: 6px; padding: 14px; color: #e0e0e0; font-family: 'IBM Plex Mono', monospace; font-size: 14px; text-align: center; letter-spacing: 0.3em; outline: none; margin-bottom: 20px; transition: border-color 0.2s; }
  .modal-input:focus { border-color: #f59e0b; }
  .modal-actions { display: flex; gap: 10px; justify-content: flex-end; }
  .btn-outline { background: none; border: 1px solid #1e1e1e; border-radius: 6px; padding: 10px 20px; font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #666; cursor: pointer; transition: all 0.15s; }
  .btn-outline:hover { border-color: #333; color: #888; }
  .spinner-sm { width: 12px; height: 12px; border: 2px solid rgba(0,0,0,0.2); border-top-color: #080808; border-radius: 50%; animation: spin 0.6s linear infinite; }

  .connection-status {
    display: flex;
    align-items: center;
    gap: 10px;
    font-family: 'IBM Plex Mono', monospace !important;
    font-size: 11px;
    font-weight: 600;
    color: #22c55e;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    background: rgba(34, 197, 94, 0.08);
    padding: 6px 14px;
    border-radius: 20px;
    border: 1px solid rgba(34, 197, 94, 0.2);
  }

  .pulse-dot {
    width: 8px;
    height: 8px;
    background: #22c55e;
    border-radius: 50%;
    box-shadow: 0 0 10px #22c55e;
    animation: connection-glow 2s infinite ease-in-out;
  }

  .storage-container {
    position: relative;
    width: 70px; height: 70px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }

  .progress-ring { transform: rotate(-90deg); }

  .progress-ring__circle {
    stroke: #f59e0b !important; 
    stroke-linecap: round;
    filter: drop-shadow(0 0 8px rgba(245, 158, 11, 0.6));
    transition: stroke-dashoffset 1s ease-in-out;
  }

  .progress-bg { stroke: rgba(255, 255, 255, 0.05) !important; }

  .topbar-right { display: flex; align-items: center; gap: 24px; }
`;

export default function Dashboard() {
  const auth = useAuth?.() || {};
  const user = auth.user || { username: "Demo User", email: "demo@vault.local", mfa_enabled: false };
  const logout = auth.logout || (() => {});
  const setUser = auth.setUser || (() => {});
  const [files, setFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("files");
  const [mfaModal, setMfaModal] = useState(null); 
  const [mfaToken, setMfaToken] = useState("");
  const [mfaLoading, setMfaLoading] = useState(false);

  const fetchFiles = useCallback(async () => {
    setFilesLoading(true);
    try {
      const mock = [
        { id: 1, filename: "vault_report.pdf", file_size: 120000 },
        { id: 2, filename: "encrypted_notes.txt", file_size: 45000 },
        { id: 3, filename: "image.png", file_size: 98000 }
      ];
      setTimeout(() => {
        setFiles(mock);
        setFilesLoading(false);
      }, 600);
    } catch (err) {
      toast.error("Failed to load files");
      setFilesLoading(false);
    }
  }, []);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const handleLogout = async () => {
    await logout();
    toast("Session terminated", { icon: "🔒" });
  };

  const handleMfaSetup = async () => {
    try {
      const { data } = await authAPI.mfaSetup();
      setMfaModal(data.data);
      setMfaToken("");
    } catch (err) {
      toast.error("Failed to initialize MFA");
    }
  };

  const handleMfaVerify = async () => {
    if (mfaToken.length !== 6) { toast.error("Enter a 6-digit code"); return; }
    setMfaLoading(true);
    try {
      await authAPI.mfaVerify(mfaToken);
      setUser((u) => ({ ...u, mfa_enabled: true }));
      setMfaModal(null);
      toast.success("MFA enabled — vault secured");
    } catch (err) {
      toast.error(err.response?.data?.error || "Invalid code");
    } finally {
      setMfaLoading(false);
    }
  };

  const handleMfaDisable = async () => {
    const code = window.prompt("Enter your authenticator code to disable MFA:");
    if (!code) return;
    try {
      await authAPI.mfaDisable(code);
      setUser((u) => ({ ...u, mfa_enabled: false }));
      toast.success("MFA disabled");
    } catch (err) {
      toast.error(err.response?.data?.error || "Invalid code");
    }
  };

  const totalSize = files.reduce((acc, f) => acc + (f.file_size || 0), 0);

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return "0 B";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const vaultLimit = 10 * 1024 * 1024;
  const storagePercent = Math.min(Math.round((totalSize / vaultLimit) * 100), 100);
  const circumference = 2 * Math.PI * 30; 
  const offset = circumference - (storagePercent / 100) * circumference;

  return (
    <>
      <style>{styles}</style>
      <div className="dash-root">
        
        {/* BIG AMBIENT ORB 1 */}
        <div style={{
          position: 'absolute', top: '-10%', left: '10%',
          width: '600px', height: '600px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.12) 0%, transparent 70%)',
          filter: 'blur(100px)', animation: 'orbMove 25s infinite alternate-reverse ease-in-out',
          zIndex: 1, pointerEvents: 'none', mixBlendMode: 'screen'
        }} />

        {/* BIG AMBIENT ORB 2 */}
        <div style={{
          position: 'absolute', bottom: '-10%', right: '10%',
          width: '700px', height: '700px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.1) 0%, transparent 70%)',
          filter: 'blur(130px)', animation: 'orbMove 30s infinite alternate ease-in-out',
          zIndex: 1, pointerEvents: 'none', mixBlendMode: 'screen'
        }} />

        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="7" width="18" height="14" rx="2" stroke="#f59e0b" strokeWidth="1.5"/>
                <circle cx="12" cy="14" r="2" stroke="#f59e0b" strokeWidth="1.5"/>
                <path d="M8 7V5a4 4 0 018 0v2" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="sidebar-logo-text">SecureVault</span>
          </div>

          <div className="sidebar-section">
            <p className="sidebar-label">Navigation</p>
            {[
              { id: "files", label: "File Vault", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 7H4a2 2 0 00-2 2v9a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" stroke="currentColor" strokeWidth="1.5"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" stroke="currentColor" strokeWidth="1.5"/></svg> },
              { id: "upload", label: "Upload", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 16V8m0 0l-3 3m3-3l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M3 16.5C3 18.433 4.567 20 6.5 20h11c1.933 0 3.5-1.567 3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
              { id: "security", label: "Security", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2L4 6v6c0 5.523 3.582 10.276 8 11 4.418-.724 8-5.477 8-11V6l-8-4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg> },
            ].map((item) => (
              <button key={item.id} className={`sidebar-item ${activeTab === item.id ? "active" : ""}`} onClick={() => setActiveTab(item.id)}>
                {item.icon} {item.label}
              </button>
            ))}
          </div>

          <div className="sidebar-bottom">
            <div className="user-card">
              <div className="user-info-wrapper">
                <div className="user-avatar">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2m8-10a4 4 0 100-8 4 4 0 000 8z" />
                  </svg>
                </div>
                <div className="user-details">
                  <p className="user-card-name">
                    {user?.username || "Operator"}
                    <span className="status-pulse" title="Active Session"></span>
                  </p>
                  <p className="user-card-email">{user?.email || "—"}</p>
                </div>
              </div>
              <div className={`user-card-mfa ${user?.mfa_enabled ? "enabled" : "disabled"}`}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  {user?.mfa_enabled ? (
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  ) : (
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4m0 4h.01" />
                  )}
                </svg>
                {user?.mfa_enabled ? "Vault Secured" : "Security Risk"}
              </div>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Logout
            </button>
          </div>
        </aside>

        <main className="main">
          <div className="topbar">
            <h1 className="topbar-title">
              {activeTab === "files" && "File Vault"}
              {activeTab === "upload" && "Upload Protocol"}
              {activeTab === "security" && "Security Settings"}
            </h1>

            <div className="topbar-right">
              <div className="connection-status">
                <div className="pulse-dot"></div>
                System Live
              </div>

              <div className="topbar-actions">
                {activeTab === "files" && (
                  <button className="refresh-btn" onClick={fetchFiles}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                      <path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Refresh
                  </button>
                )}
              </div>
            </div>
          </div>  

          <div key={activeTab} className="tab-transition-wrapper" style={{ padding: "0 28px 40px" }}>
            {activeTab === "files" && (
              <>
                <div className="stats-row">
                  <div className="stat-card">
                    <div className="stat-value">{files.length}</div>
                    <div className="stat-label">Encrypted Files</div>
                  </div>

                  <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div className="storage-container">
                      <svg className="progress-ring" width="70" height="70">
                        <circle className="progress-bg" strokeWidth="4" fill="transparent" r="30" cx="35" cy="35"/>
                        <circle 
                          className="progress-ring__circle" 
                          strokeWidth="4" 
                          strokeDasharray={circumference} 
                          strokeDashoffset={offset} 
                          fill="transparent" r="30" cx="35" cy="35"
                        />
                      </svg>
                      <div style={{ position: 'absolute', fontSize: '11px', fontWeight: '800', fontFamily: 'Syne' }}>
                        {storagePercent}%
                      </div>
                    </div>
                    <div>
                      <div className="stat-value">{formatBytes(totalSize)}</div>
                      <div className="stat-label">Vault Storage Used</div>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-value" style={{ color: user?.mfa_enabled ? "#22c55e" : "#ef4444" }}>
                      {user?.mfa_enabled ? "Secure" : "At Risk"}
                    </div>
                    <div className="stat-label">Identity Status</div>
                  </div>
                </div>
                <FileList files={files} loading={filesLoading} onRefresh={fetchFiles} />
              </>
            )}

            {activeTab === "upload" && (
              <div style={{ maxWidth: "900px", width: "100%", margin: "0 auto", minHeight: "80vh", display: "flex", flexDirection: "column" }}>
                <FileUpload onUploadSuccess={() => { fetchFiles(); setActiveTab("files"); }} />
              </div>
            )}

            {activeTab === "security" && (
              <div style={{ maxWidth: "800px", width: "100%", margin: "0 auto" }}>
                <div className="security-card">
                  <h2 className="sec-title">Authentication Security</h2>

                  <div className={`mfa-status-box ${user?.mfa_enabled ? "enabled" : "disabled"}`}>
                    <p className={`mfa-status-label ${user?.mfa_enabled ? "enabled" : "disabled"}`}>
                      {user?.mfa_enabled ? (
                        <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> MFA IS ACTIVE</>
                      ) : (
                        <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg> MFA IS DISABLED</>
                      )}
                    </p>
                    <p style={{ fontSize: "11px", color: "#888", lineHeight: "1.6", marginTop: "8px" }}>
                      {user?.mfa_enabled
                        ? "Your vault is currently shielded by time-based one-time passwords (TOTP). A physical device is required to access your files."
                        : "Your vault relies only on your password. Enable Multi-Factor Authentication immediately to ensure military-grade access control."}
                    </p>
                  </div>

                  {!user?.mfa_enabled ? (
                    <button className="btn-premium-amber" onClick={handleMfaSetup}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Initialize MFA Setup
                    </button>
                  ) : (
                    <button className="btn-premium-danger" onClick={handleMfaDisable}>
                      Disable MFA Protection
                    </button>
                  )}

                  <div style={{ marginTop: "48px", paddingTop: "32px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                    <h2 className="sec-title" style={{ fontSize: "18px" }}>Operator Identity</h2>
                    
                    <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.03)", padding: "8px 0" }}>
                      {[
                        [<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>, "Designation", user?.username],
                        [<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>, "Comms Channel", user?.email],
                        [<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>, "Clearance Level", user?.role || "Operator"],
                        [<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>, "Access Granted", user?.created_at ? new Date(user.created_at).toLocaleDateString() : "Present"],
                      ].map(([icon, label, val]) => (
                        <div key={label} className="account-row">
                          <span className="account-label">{icon} {label}</span>
                          <span className="account-value">{val || "—"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {mfaModal && (
        <div className="modal-bg" onClick={(e) => { if (e.target === e.currentTarget) setMfaModal(null); }}>
          <div className="modal">
            <h3 className="modal-title">Enable MFA</h3>
            <p className="modal-sub">Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.), then enter the 6-digit code to confirm.</p>
            {mfaModal.qr_code && <div className="qr-box"><img src={mfaModal.qr_code} alt="MFA QR Code" /></div>}
            {mfaModal.secret && (
              <div style={{ marginBottom: "16px" }}>
                <p style={{ fontSize: "10px", color: "#444", letterSpacing: "0.12em", marginBottom: "6px" }}>MANUAL ENTRY KEY</p>
                <div className="secret-row">{mfaModal.secret}</div>
              </div>
            )}
            <input
              type="text" className="modal-input" placeholder="000 000" value={mfaToken}
              onChange={(e) => setMfaToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
              maxLength={6} inputMode="numeric" autoFocus
            />
            <div className="modal-actions">
              <button className="btn-outline" onClick={() => setMfaModal(null)}>Cancel</button>
              <button className="btn-premium-amber" onClick={handleMfaVerify} disabled={mfaLoading || mfaToken.length !== 6}>
                {mfaLoading && <span className="spinner-sm" />} Verify & Enable
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}