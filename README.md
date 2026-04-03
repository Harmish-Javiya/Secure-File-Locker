━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROJECT OVERVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
A full-stack secure file storage application where users can register, login,
upload files (encrypted), download files (decrypted), and manage their files.
The app demonstrates the following security concepts:

Secure Software Development (OWASP Top 10, input validation, least privilege)

Network Security (HTTPS/TLS, security headers, rate limiting, CORS)

Cryptography (AES-256-GCM encryption, Argon2id password hashing, JWT auth)

Application Security (RBAC, MFA/TOTP, IDOR prevention, file sanitization)

Cloud Infrastructure & Security (AWS S3, IAM, Secrets Manager, VPC)

Digital Forensics (audit logging, SHA-256 file integrity, tamper-evident logs)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TECH STACK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Backend:

Python 3.12.1

Flask 3.1.3 + Flask-JWT-Extended 4.6.0

Flask-SQLAlchemy 3.1.1 + Flask-Limiter 3.8.0

PostgreSQL 14 (localhost:5432)

Argon2id 25.1.0 (password hashing)

cryptography 43.0.3 (AES-256-GCM)

PyOTP 2.9.0 (MFA/TOTP)

Boto3 (AWS S3)

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

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROJECT STRUCTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
secure-file-locker/
│
├── backend/
│   ├── app.py                  ✅ Factory pattern, security middleware init
│   ├── config.py               ✅
│   ├── extensions.py           ✅ db, jwt, limiter
│   ├── routes/
│   │   ├── auth.py             ✅ Login (MFA-aware), Register, Me, Refresh
│   │   └── files.py            ✅ Upload (AES-GCM), Download, List, Share
│   ├── utils/
│   │   ├── encryption.py       ✅ AES-256-GCM + PBKDF2
│   │   └── audit_logger.py     ✅ AuditLog table integration
│   └── middleware/
│       └── security.py         ✅ OWASP headers, CORS, sanitization
│
└── frontend/src/
├── App.jsx                 ✅ Auth context, Silent Init logic, Protected/Public routes
├── utils/api.js            ✅ JWT Interceptors, Header Sync, Refresh Queue
├── pages/
│   ├── Login.jsx           ✅ Two-step MFA support, account lockout handling
│   ├── Register.jsx        ✅ Strength meter, conflict mapping
│   └── Dashboard.jsx       ✅ Sidebar tabs, MFA setup, File Vault
└── components/
├── FileUpload.jsx      ✅ Progress bar, Cloud vs. Instant toggle
└── FileList.jsx        ✅ Integrity hash preview, download/delete/share actions

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔲 PENDING — PHASE 5 (DO IN ORDER)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔲 1. AWS S3 Integration

Replace uploads/ folder with Boto3 calls.

Update files.py to use S3 presigned URLs for secure streaming.

🔲 2. Instant Encrypt Backend Route

Implement POST /api/files/stream-encrypt.

Must encrypt in chunks and stream back to client without saving to disk.

🔲 3. Dockerization

docker-compose.yml for Flask, Postgres, React (build), and Nginx.

🔲 4. Production Nginx Config

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

design: Do not alter the existing Cyber-Grid/Glassmorphism UI.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HOW TO RUN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Terminal 1 — Backend
cd backend && source venv/bin/activate && python3 app.py

Terminal 2 — Frontend
cd frontend && npm run dev