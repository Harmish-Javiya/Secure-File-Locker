import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import toast from "react-hot-toast";
import { filesAPI } from "../utils/api";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB
const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/pdf",
  "text/plain", "text/csv",
  "application/zip", "application/x-zip-compressed",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "video/mp4", "video/quicktime",
];

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const styles = `
  /* 1. THE 3D GLASS CARD */
  .upload-card {
    background: linear-gradient(145deg, rgba(20, 20, 20, 0.6) 0%, rgba(5, 5, 5, 0.8) 100%);
    backdrop-filter: blur(24px) saturate(150%);
    -webkit-backdrop-filter: blur(24px) saturate(150%);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-top: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 20px;
    padding: 32px;
    font-family: 'IBM Plex Mono', monospace;
    
    /* The "Pop Out" Shadow */
    box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.9), 0 0 40px rgba(245, 158, 11, 0.05);
    
    width: 100%; height: 100%;
    display: flex; flex-direction: column;
    animation: fadeUpSmooth 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  .upload-card-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 24px; flex-shrink: 0;
  }

  /* Metallic Title */
  .upload-card-title {
    font-family: 'Syne', sans-serif;
    font-size: 20px; font-weight: 800;
    letter-spacing: -0.02em;
    background: linear-gradient(135deg, #ffffff 0%, #a3a3a3 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  /* 2. PREMIUM iOS-STYLE TOGGLE */
  .mode-toggle {
    display: flex;
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    padding: 4px;
    gap: 4px;
    box-shadow: inset 0 2px 4px rgba(0,0,0,0.5);
  }

  .mode-btn {
    padding: 6px 16px; border: none; border-radius: 4px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px; font-weight: 600;
    letter-spacing: 0.15em; text-transform: uppercase;
    cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    background: transparent; color: #666;
  }

  .mode-btn.active {
    background: linear-gradient(135deg, #fcd34d 0%, #f59e0b 100%);
    color: #080808;
    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
  }

  .mode-btn:not(.active):hover { color: #aaa; }

  /* Info box upgrades */
  .mode-info {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.03);
    border-left: 2px solid #f59e0b;
    border-radius: 6px;
    padding: 14px 16px; margin-bottom: 24px;
    font-size: 11px; color: #888; line-height: 1.6; letter-spacing: 0.05em;
    flex-shrink: 0;
  }
  .mode-info strong { 
    color: #f59e0b; display: block; margin-bottom: 4px; font-size: 12px; 
    text-shadow: 0 0 10px rgba(245, 158, 11, 0.3);
  }

  /* 3. SCI-FI GLOWING DROPZONE */
  .dropzone {
    border: 2px dashed rgba(245, 158, 11, 0.2);
    border-radius: 16px;
    padding: 40px 20px; text-align: center; cursor: pointer;
    background: rgba(0, 0, 0, 0.2);
    position: relative; overflow: hidden;
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    min-height: 50vh; 
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .dropzone:hover, .dropzone.drag-active {
    border-color: #f59e0b;
    background: rgba(245, 158, 11, 0.06);
    /* The Sci-Fi Portal Glow */
    box-shadow: 
      inset 0 0 40px rgba(245, 158, 11, 0.1), 
      0 10px 30px rgba(245, 158, 11, 0.1);
    transform: translateY(-2px);
  }

  .dropzone.drag-active::after {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(circle at center, rgba(245,158,11,0.15), transparent 70%);
    pointer-events: none;
    animation: pulseGlow 2s infinite alternate;
  }

  @keyframes pulseGlow {
    from { opacity: 0.5; } to { opacity: 1; }
  }

  /* 4. THE FLOATING HOLOGRAM ICON */
  @keyframes floatIcon {
    0% { transform: translateY(0px); }
    50% { transform: translateY(-8px); filter: drop-shadow(0 8px 12px rgba(245, 158, 11, 0.4)); }
    100% { transform: translateY(0px); }
  }

  .dz-icon {
    width: 56px; height: 56px; margin: 0 auto 20px;
    background: linear-gradient(135deg, rgba(245,158,11,0.1), transparent);
    border: 1px solid rgba(245, 158, 11, 0.3);
    border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 8px 20px rgba(0,0,0,0.5);
    transition: all 0.3s ease;
  }
  
  .dz-icon svg {
    /* Apply the floating animation to the icon inside */
    animation: floatIcon 3s ease-in-out infinite;
  }

  .dropzone:hover .dz-icon, .dropzone.drag-active .dz-icon {
    border-color: rgba(245,158,11,0.8);
    background: rgba(245,158,11,0.15);
    transform: scale(1.05);
  }

  .dz-main-text {
    font-size: 16px; font-weight: 600; color: #aaa; margin-bottom: 8px;
    letter-spacing: 0.02em;
  }
  .dz-main-text span { color: #f59e0b; text-shadow: 0 0 10px rgba(245,158,11,0.3); }

  .dz-sub-text {
    font-size: 11px; color: #555; letter-spacing: 0.1em; text-transform: uppercase;
  }

  /* File preview styling upgrades */
  .file-preview {
    display: flex; align-items: center; gap: 14px;
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 8px; padding: 14px 18px; margin-top: 20px;
    flex-shrink: 0; box-shadow: inset 0 2px 10px rgba(0,0,0,0.5);
  }

  .file-preview-icon {
    width: 40px; height: 40px;
    background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.3);
    border-radius: 8px; display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; font-size: 18px; box-shadow: 0 4px 10px rgba(245,158,11,0.15);
  }

  .file-preview-info { flex: 1; min-width: 0; }

  .file-preview-name {
    font-size: 13px; font-weight: 500; color: #eee;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 4px;
  }

  .file-preview-meta { font-size: 10px; color: #666; letter-spacing: 0.1em; text-transform: uppercase;}

  .file-preview-remove {
    background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: 6px; cursor: pointer; color: #ef4444; padding: 6px;
    transition: all 0.2s; flex-shrink: 0;
  }
  .file-preview-remove:hover { 
    background: rgba(239, 68, 68, 0.2); color: #f87171; transform: scale(1.05); 
    box-shadow: 0 0 10px rgba(239, 68, 68, 0.3);
  }

  /* Progress Bar Glow */
  .progress-track {
    height: 4px; background: rgba(0,0,0,0.5); border-radius: 4px;
    overflow: hidden; margin-top: 20px; flex-shrink: 0;
    box-shadow: inset 0 1px 3px rgba(0,0,0,0.8);
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #f59e0b, #fbbf24, #fff);
    border-radius: 4px; transition: width 0.2s ease; position: relative;
    box-shadow: 0 0 10px #f59e0b;
  }

  .progress-label {
    display: flex; justify-content: space-between; align-items: center;
    margin-top: 10px; font-size: 11px; color: #888; letter-spacing: 0.1em; text-transform: uppercase;
    flex-shrink: 0;
  }

  /* Main Upload Button */
  .upload-btn {
    width: 100%; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    color: #080808; border: none; border-radius: 8px; padding: 14px;
    font-family: 'IBM Plex Mono', monospace; font-size: 12px; font-weight: 700;
    letter-spacing: 0.15em; text-transform: uppercase; cursor: pointer;
    margin-top: 20px; transition: all 0.2s;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    flex-shrink: 0; box-shadow: 0 8px 20px rgba(245, 158, 11, 0.2);
  }

  .upload-btn:hover:not(:disabled) { 
    transform: translateY(-2px); 
    box-shadow: 0 12px 24px rgba(245, 158, 11, 0.3);
    filter: brightness(1.1);
  }
  .upload-btn:active:not(:disabled) { transform: scale(0.98); }
  .upload-btn:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; transform: none; }

  /* Instant Password Box */
  .instant-pw-group { margin-top: 20px; flex-shrink: 0; }
  .instant-pw-label { font-size: 10px; color: #777; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 8px; }
  .instant-pw-input {
    width: 100%; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.05);
    border-radius: 6px; padding: 12px 16px; color: #e0e0e0;
    font-family: 'IBM Plex Mono', monospace; font-size: 13px; outline: none; transition: all 0.2s;
    box-shadow: inset 0 2px 6px rgba(0,0,0,0.5);
  }
  .instant-pw-input:focus { 
    border-color: #f59e0b; 
    box-shadow: inset 0 2px 6px rgba(0,0,0,0.5), 0 0 12px rgba(245, 158, 11, 0.2);
  }
  .instant-pw-input::placeholder { color: #444; }

  .spinner-sm {
    width: 14px; height: 14px; border: 2px solid rgba(0,0,0,0.2);
    border-top-color: #080808; border-radius: 50%; animation: spin 0.6s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
`;

function getFileEmoji(type) {
  if (type.startsWith("image/")) return "🖼";
  if (type === "application/pdf") return "📄";
  if (type.startsWith("video/")) return "🎬";
  if (type.includes("zip")) return "📦";
  if (type.startsWith("text/")) return "📝";
  if (type.includes("word") || type.includes("document")) return "📃";
  if (type.includes("excel") || type.includes("spreadsheet")) return "📊";
  return "📁";
}

export default function FileUpload({ onUploadSuccess }) {
  const [mode, setMode] = useState("cloud"); // "cloud" | "instant"
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [instantPassword, setInstantPassword] = useState("");

  const onDrop = useCallback((accepted, rejected) => {
    if (rejected.length > 0) {
      const err = rejected[0].errors[0];
      if (err.code === "file-too-large") toast.error(`File exceeds 100 MB limit`);
      else if (err.code === "file-invalid-type") toast.error("File type not allowed");
      else toast.error(err.message);
      return;
    }
    if (accepted.length > 0) setFile(accepted[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: MAX_FILE_SIZE,
    accept: ALLOWED_TYPES.reduce((acc, t) => ({ ...acc, [t]: [] }), {}),
    multiple: false,
    disabled: uploading,
  });

  const handleUpload = async () => {
    if (!file) return;

    if (mode === "instant" && instantPassword.length < 8) {
      toast.error("Instant encrypt password must be at least 8 characters");
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (mode === "instant") formData.append("instant_encrypt", "true");

      const { data } = await filesAPI.upload(formData, setProgress);

      if (mode === "instant" && data.data?.encrypted_blob) {
        // Trigger download of encrypted file
        const blob = new Blob([data.data.encrypted_blob], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${file.name}.enc`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("File encrypted and downloaded — nothing stored on server");
      } else {
        toast.success("File encrypted and stored securely");
        onUploadSuccess?.();
      }

      setFile(null);
      setInstantPassword("");
      setProgress(0);
    } catch (err) {
      const msg = err.response?.data?.error || "Upload failed";
      toast.error(msg);
      setProgress(0);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="upload-card">
        <div className="upload-card-header">
          <h3 className="upload-card-title">Upload File</h3>
          <div className="mode-toggle">
            <button
              className={`mode-btn ${mode === "cloud" ? "active" : ""}`}
              onClick={() => setMode("cloud")}
              disabled={uploading}
            >
              Cloud
            </button>
            <button
              className={`mode-btn ${mode === "instant" ? "active" : ""}`}
              onClick={() => setMode("instant")}
              disabled={uploading}
            >
              Instant
            </button>
          </div>
        </div>

        <div className="mode-info">
          {mode === "cloud" ? (
            <>
              <strong>☁ Cloud Storage Mode</strong>
              File is AES-256-GCM encrypted, stored securely, and accessible from any device. Share via link or manage in your dashboard.
            </>
          ) : (
            <>
              <strong>⚡ Instant Encrypt Mode (Zero Storage)</strong>
              File is encrypted in real-time and streamed back to you. Nothing is stored on the server — pure zero-knowledge encryption.
            </>
          )}
        </div>

        <div
          {...getRootProps()}
          className={`dropzone ${isDragActive ? "drag-active" : ""}`}
        >
          <input {...getInputProps()} />
          <div className="dz-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 16V8m0 0l-3 3m3-3l3 3" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 16.5C3 18.433 4.567 20 6.5 20h11c1.933 0 3.5-1.567 3.5-3.5" stroke="#555" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <p className="dz-main-text">
            {isDragActive ? "Drop to encrypt" : <><span>Click to select</span> or drag a file here</>}
          </p>
          <p className="dz-sub-text">Max 100 MB · PDF, Images, Docs, Video, Archives</p>
        </div>

        {file && (
          <div className="file-preview">
            <div className="file-preview-icon">{getFileEmoji(file.type)}</div>
            <div className="file-preview-info">
              <p className="file-preview-name">{file.name}</p>
              <p className="file-preview-meta">{formatBytes(file.size)} · {file.type || "unknown type"}</p>
            </div>
            {!uploading && (
              <button className="file-preview-remove" onClick={() => setFile(null)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </div>
        )}

        {mode === "instant" && (
          <div className="instant-pw-group">
            <p className="instant-pw-label">Encryption password</p>
            <input
              type="password"
              className="instant-pw-input"
              placeholder="Min. 8 characters"
              value={instantPassword}
              onChange={(e) => setInstantPassword(e.target.value)}
              disabled={uploading}
            />
          </div>
        )}

        {uploading && (
          <>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <div className="progress-label">
              <span>Encrypting & uploading</span>
              <span>{progress}%</span>
            </div>
          </>
        )}

        {file && (
          <button
            className="upload-btn"
            onClick={handleUpload}
            disabled={uploading || !file}
          >
            {uploading ? (
              <><span className="spinner-sm" /> Processing...</>
            ) : (
              <>{mode === "instant" ? "⚡ Encrypt & Download" : "☁ Encrypt & Store"}</>
            )}
          </button>
        )}
      </div>
    </>
  );
}