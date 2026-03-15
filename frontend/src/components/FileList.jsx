import React, { useState } from "react";
import toast from "react-hot-toast";
import { filesAPI } from "../utils/api";

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function getFileIcon(type = "") {
  let color = "#888";
  if (type.startsWith("image/")) color = "#3b82f6";
  else if (type === "application/pdf") color = "#ef4444";
  else if (type.startsWith("text/")) color = "#10b981";
  else if (type.includes("zip") || type.includes("tar")) color = "#f59e0b";

  if (type.startsWith("image/")) return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="2" stroke={color} strokeWidth="1.5"/>
      <circle cx="8.5" cy="8.5" r="1.5" fill={color}/>
      <path d="M3 16l5-5 4 4 3-3 6 6" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
  if (type === "application/pdf") return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke={color} strokeWidth="1.5"/>
      <path d="M14 2v6h6M9 13h6M9 17h4" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" stroke={color} strokeWidth="1.5"/>
      <path d="M13 2v7h7" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

const styles = `
  .filelist-card {
    background: rgba(10, 10, 10, 0.9);
    backdrop-filter: blur(16px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
    font-family: 'IBM Plex Mono', monospace;
  }

  .filelist-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .filelist-title {
    font-family: 'Syne', sans-serif;
    font-size: 16px; font-weight: 700; color: #e0e0e0;
  }

  .filelist-count {
    font-size: 10px; color: #f59e0b;
    background: rgba(245, 158, 11, 0.1);
    border: 1px solid rgba(245, 158, 11, 0.2);
    border-radius: 4px; padding: 4px 10px;
    letter-spacing: 0.1em;
  }

  .file-vault-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }

  .col-file { width: 40%; text-align: left; padding-left: 24px; }
  .col-size, .col-uploaded, .col-sha { width: 15%; color: #666; }
  .col-actions { width: 25%; text-align: right; padding-right: 24px; }

  th {
    padding: 14px 20px;
    font-size: 9px; font-weight: 600; color: #555;
    letter-spacing: 0.18em; text-transform: uppercase;
  }

  td {
    padding: 14px 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.02);
    vertical-align: middle;
  }

  /* KEEPING YOUR ANIMATIONS */
  tbody tr {
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    border-left: 3px solid transparent;
  }

  tbody tr:hover { 
    background: linear-gradient(90deg, rgba(245, 158, 11, 0.05) 0%, transparent 100%); 
    transform: translateX(6px);
    border-left: 3px solid #f59e0b;
  }

  @keyframes slideInRow {
    from { opacity: 0; transform: translateX(-15px); }
    to { opacity: 1; transform: translateX(0); }
  }
  .animate-row {
    animation: slideInRow 0.5s ease forwards;
    opacity: 0;
  }

  .file-name-cell { display: flex; align-items: center; gap: 12px; }
  .file-name-icon {
    width: 32px; height: 32px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 6px;
    display: flex; align-items: center; justify-content: center;
  }

  .file-name-text { color: #ddd; font-size: 13px; font-weight: 500; }

  .hash-cell {
    color: #444; font-size: 10px; font-family: 'IBM Plex Mono', monospace;
    background: rgba(0,0,0,0.3);
    padding: 4px 8px; border-radius: 4px;
  }

  .actions-cell-wrapper {
    display: flex; gap: 8px; justify-content: flex-end;
  }

  /* BUTTON STYLES */
  .icon-btn {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 8px 14px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    color: #888; font-family: 'IBM Plex Mono', monospace;
    font-size: 11px; font-weight: 600;
    cursor: pointer; transition: all 0.3s ease;
    --btn-glow: rgba(245, 158, 11, 0.4);
    --btn-text: #f59e0b;
  }

  .icon-btn:hover:not(:disabled) {
    color: var(--btn-text);
    border-color: var(--btn-text);
    box-shadow: 0 5px 15px var(--btn-glow);
    transform: translateY(-2px);
  }

  .icon-btn.btn-danger {
    --btn-glow: rgba(239, 68, 68, 0.5);
    --btn-text: #ef4444;
  }

  /* MODAL STYLES */
  .share-modal-bg {
    position: fixed; inset: 0; background: rgba(0,0,0,0.8);
    display: flex; align-items: center; justify-content: center;
    z-index: 999; backdrop-filter: blur(4px);
  }
  .share-modal {
    background: #0e0e0e; border: 1px solid #2a2a2a;
    border-radius: 12px; padding: 32px; width: 440px;
    box-shadow: 0 20px 40px rgba(0,0,0,0.8);
  }
  .hours-options { display: flex; gap: 8px; margin-bottom: 24px; }
  .hours-opt {
    padding: 8px 16px; background: #111; border: 1px solid #1e1e1e;
    border-radius: 6px; font-size: 11px; color: #666; cursor: pointer;
  }
  .hours-opt.selected { border-color: #f59e0b; color: #f59e0b; background: rgba(245,158,11,0.1); }

  .skeleton-box {
    background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%);
    background-size: 200% 100%;
    animation: skeletonShimmer 2s infinite linear;
    border-radius: 4px; height: 16px;
  }
  @keyframes skeletonShimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
  @keyframes spin { to { transform: rotate(360deg); } }
  .spinner-sm { width: 12px; height: 12px; border: 2px solid rgba(255,255,255,0.1); border-top-color: currentColor; border-radius: 50%; animation: spin 0.6s linear infinite; }
`;

export default function FileList({ files = [], loading, onRefresh }) {
  const [shareModal, setShareModal] = useState(null);
  const [shareHours, setShareHours] = useState(24);
  const [shareLink, setShareLink] = useState("");
  const [shareLoading, setShareLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const handleDownload = async (file) => {
    setDownloadingId(file.id);
    try {
      const response = await filesAPI.download(file.id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = file.original_name || file.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success("Decryption successful");
    } catch (err) {
      toast.error("Download failed");
    } finally { setDownloadingId(null); }
  };

  const handleDelete = async (file) => {
    if (!window.confirm(`Delete ${file.original_name}?`)) return;
    setDeletingId(file.id);
    try {
      await filesAPI.delete(file.id);
      toast.success("Removed from vault");
      onRefresh?.();
    } catch (err) {
      toast.error("Delete failed");
    } finally { setDeletingId(null); }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="filelist-card">
        <div className="filelist-header">
          <h3 className="filelist-title">Encrypted Files</h3>
          <span className="filelist-count">{files.length} FILES</span>
        </div>

        <div className="table-wrap">
          <table className="file-vault-table">
            <thead>
              <tr>
                <th className="col-file">File</th>
                <th className="col-size">Size</th>
                <th className="col-uploaded">Uploaded</th>
                <th className="col-sha">SHA-256</th>
                <th className="col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [1, 2, 3].map(i => (
                  <tr key={i}>
                    <td className="col-file"><div className="skeleton-box" /></td>
                    <td colSpan="4"><div className="skeleton-box" /></td>
                  </tr>
                ))
              ) : files.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '50px' }}>Vault is empty</td>
                </tr>
              ) : (
                files.map((file, index) => (
                  <tr key={file.id} className="animate-row" style={{ animationDelay: `${index * 0.05}s` }}>
                    <td className="col-file">
                      <div className="file-name-cell">
                        <div className="file-name-icon">{getFileIcon(file.mime_type)}</div>
                        <span className="file-name-text">{file.original_name || file.filename}</span>
                      </div>
                    </td>
                    <td className="col-size">{formatBytes(file.file_size)}</td>
                    <td className="col-uploaded">{formatDate(file.created_at)}</td>
                    <td className="col-sha">
                      <div className="hash-cell">{file.integrity_hash?.slice(0, 8)}...</div>
                    </td>
                    <td className="col-actions">
                      <div className="actions-cell-wrapper">
                        <button className="icon-btn" onClick={() => handleDownload(file)} disabled={downloadingId === file.id}>
                          {downloadingId === file.id ? <span className="spinner-sm" /> : "Get"}
                        </button>
                        <button className="icon-btn" onClick={() => setShareModal(file)}>Share</button>
                        <button className="icon-btn btn-danger" onClick={() => handleDelete(file)} disabled={deletingId === file.id}>
                          {deletingId === file.id ? <span className="spinner-sm" /> : "Del"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Share Modal Logic would continue here... */}
    </>
  );
}