━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROJECT OVERVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
A full-stack secure file storage application where users can register, login,
upload files (encrypted), download files (decrypted), and manage their files.
The app demonstrates the following security concepts:

Secure Software Development (OWASP Top 10, input validation, least privilege)
Network Security (HTTPS/TLS, security headers, rate limiting, CORS)
Cryptography (AES-256-GCM, ChaCha20-Poly1305, Fernet encryption, PBKDF2 key derivation, JWT auth)
Application Security (RBAC, MFA/TOTP, IDOR prevention, file sanitization)
Cloud Infrastructure & Security (AWS S3, IAM, Secrets Manager, VPC)
Digital Forensics (audit logging, SHA-256 file integrity, tamper-evident logs)
Zero-Knowledge Encryption (Instant Encrypt mode — server never stores plaintext or ciphertext)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TECH STACK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Backend:
Python 3.12.1
Flask 3.1.3 + Flask-JWT-Extended 4.6.0
Flask-SQLAlchemy 3.1.1 + Flask-Limiter 3.8.0
PostgreSQL 14 (localhost:5432)
Argon2id 25.1.0 (password hashing)
cryptography 43.0.3 (AES-256-GCM, ChaCha20-Poly1305, Fernet)
PyOTP 2.9.0 (MFA/TOTP)
Boto3 (AWS S3)
Gunicorn (production server — gunicorn -w 4 -t 300 "app:create_app()")

Frontend:
React.js 18 (Node v20.19.4, npm 10.8.2)
Vite (dev server)
Axios (API calls with custom interceptors)
React Router DOM (routing)
React Dropzone (file upload)
React Hot Toast (notifications)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ LOGIC STATUS — 100% FUNCTIONAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. MFA Login Handshake:
POST /api/auth/login returns code: "MFA_REQUIRED" (200 OK) if MFA is enabled.
App.jsx login() function returns the MFA_REQUIRED status to the component without setting tokens or navigating.
Login.jsx catches this code, toggles the TOTP input field, and waits for a second submission.

2. Silent Auth Initialization:
App.jsx checks localStorage.getItem('token') before calling /api/auth/me.
If no token exists, setLoading(false) triggers immediately, preventing 401 errors in the console on page refresh.

3. Immediate Header Synchronization:
setAccessToken in api.js explicitly updates api.defaults.headers.common['Authorization'].
This ensures the subsequent /me call (inside the login function) has the JWT attached immediately without requiring a full page reload or state cycle.

4. Multi-Algorithm Encryption:
Users can choose between AES-256-GCM, ChaCha20-Poly1305, and Fernet for both Cloud and Instant modes.
Selected algorithm is stored in the database and used for decryption.
File model has encryption_algo column storing the algorithm per file.

5. Instant Encrypt Mode (Zero-Knowledge):
Files are encrypted client-side on the server without being stored.
Small files (<=200MB) → self-decrypting HTML file (works offline, no internet needed).
Large files (>200MB) → chunked encryption → zip containing .enc file + decrypt.py + README.md.
Password-based encryption using PBKDF2 (600,000 iterations) — server never sees plaintext.
Self-decrypting HTML uses Web Crypto API — works fully offline in any modern browser.
HTML supports all 3 algorithms: AES via Web Crypto, ChaCha20 via pure JS, Fernet via Web Crypto.
Large file decryptor (decrypt.py) auto-installs cryptography library if not present.

6. Session Extension for Large Uploads:
POST /api/files/upload/extend-session issues a 2-hour token before large uploads begin.
Frontend calls extendSession() before every upload to prevent JWT expiry mid-upload.
Normal session expiry remains 15 minutes.

7. File Type Security:
Blocklist-based extension validation (instead of allowlist) — blocks executables, scripts, shells.
Magic byte validation for known file types.
All other file types allowed for maximum flexibility.

8. Large File Handling:
No Flask MAX_CONTENT_LENGTH limit (set to None) — size enforced per-route.
Cloud uploads capped at 100MB enforced in code, not Flask config.
Instant uploads have no size limit.
File size detected via request.content_length (no stream read needed).
Chunk size: 64MB per chunk for encryption — avoids AES-GCM 2GB per-call limit.
Temp files written to disk during large file encryption — never loads full file into RAM.
Zip streamed back in 1MB chunks — never loads full zip into RAM.
ZIP_STORED used for zip (no compression on encrypted data — faster, no CPU waste).

9. Frontend Upload Flow:
Response content-type checked to decide .html vs .zip download.
Toast message differs for small vs large file output.
Axios timeout set to 0 (no timeout) for uploads.
Session extended before every upload via extendSession().

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROJECT STRUCTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
secure-file-locker/
│
├── backend/
│   ├── app.py                  ✅ Factory pattern, security middleware init, timedelta import
│   ├── config.py               ✅
│   ├── extensions.py           ✅ db, jwt, limiter
│   ├── routes/
│   │   ├── auth.py             ✅ Login (MFA-aware), Register, Me, Refresh
│   │   └── files.py            ✅ Upload (multi-algo), Download, List, Share,
│   │                              Instant Encrypt (HTML + ZIP), extend-session
│   ├── utils/
│   │   ├── encryption.py       ✅ AES-256-GCM, ChaCha20, Fernet, PBKDF2, streaming
│   │   └── audit_logger.py     ✅ AuditLog table integration
│   └── middleware/
│       └── security.py         ✅ OWASP headers, CORS, sanitization
│
└── frontend/src/
    ├── App.jsx                 ✅ Auth context, Silent Init logic, Protected/Public routes
    ├── utils/api.js            ✅ JWT Interceptors, Header Sync, Refresh Queue,
    │                              extendSession, timeout=0 for uploads
    ├── pages/
    │   ├── Login.jsx           ✅ Two-step MFA support, account lockout handling
    │   ├── Register.jsx        ✅ Strength meter, conflict mapping
    │   └── Dashboard.jsx       ✅ Sidebar tabs, MFA setup, File Vault
    └── components/
        ├── FileUpload.jsx      ✅ Progress bar, Cloud vs Instant toggle,
        │                          Algorithm selector, password input,
        │                          HTML/ZIP detection, session extension
        └── FileList.jsx        ✅ Integrity hash preview, download/delete/share actions

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KEY IMPLEMENTATION DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Instant Encrypt Small File Flow:
  Browser → POST /api/files/upload (instant_encrypt=true, password, algo)
  → PBKDF2 key derivation (600k iterations)
  → Encrypt with chosen algo
  → Embed base64 ciphertext in self-decrypting HTML
  → Return HTML file (never stored on server)
  → Browser downloads .html
  → User opens HTML offline, enters password → file decrypted in browser

Instant Encrypt Large File Flow (>200MB):
  Browser → POST /api/files/upload (instant_encrypt=true, password, algo)
  → PBKDF2 key derivation
  → Stream file in 64MB chunks → encrypt each chunk → write to temp .enc file on disk
  → Bundle .enc + decrypt.py + README.md into zip (ZIP_STORED, no compression)
  → Stream zip back in 1MB chunks
  → Browser downloads _encrypted.zip
  → User extracts zip, runs: python decrypt.py
  → decrypt.py auto-installs cryptography if needed, decrypts chunk by chunk

.enc File Format (large files):
  [salt: 16 bytes][iv: 12 bytes][num_chunks: 4 bytes]
  [chunk_len: 4 bytes][chunk_data: N bytes] × num_chunks
  Chunk nonce = base_iv + chunk_index (starting at 1)

JWT Config:
  Access token: 15 minutes (extended to 2 hours for uploads via /extend-session)
  Refresh token: 7 days
  JWT key: minimum 32 bytes required

Flask Config:
  MAX_CONTENT_LENGTH = None (no Flask limit)
  Cloud upload limit: 100MB enforced in route code
  Instant upload limit: none

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔲 PENDING — PHASE 5 (DO IN ORDER)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔲 1. AWS S3 Integration
Replace uploads/ folder with Boto3 calls.
Update files.py to use S3 presigned URLs for secure streaming.

🔲 2. Dockerization
docker-compose.yml for Flask, Postgres, React (build), and Nginx.

🔲 3. Production Nginx Config
Reverse proxy with SSL termination and custom security headers.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CODING RULES (GROUND TRUTH)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
App Factory Pattern: Always use create_app().
Secret Management: Use os.getenv() exclusively.
JWT Storage: Access Tokens in MEMORY (api.js), Refresh in httpOnly cookie.
MFA Security: Never issue a JWT until the TOTP token is verified.
Clean Console: No 401 calls allowed on the initial splash screen load.
Complete Files Only: Provide full code, never partial snippets.
Design: Do not alter the existing Cyber-Grid/Glassmorphism UI.
No RAM Loading: Never load full large files into memory — always stream/chunk.
Encryption: Always use PBKDF2 (600,000 iterations) for password-based key derivation.
Nonce Safety: Chunk nonces start at counter=1 to avoid reusing the header nonce.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HOW TO RUN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Development:
Terminal 1 — Backend
cd backend && source venv/bin/activate && python3 app.py

Terminal 2 — Frontend
cd frontend && npm run dev

Production:
Terminal 1 — Backend
cd backend && source venv/bin/activate
gunicorn -w 4 -t 300 "app:create_app()"

Terminal 2 — Frontend
cd frontend && npm run build