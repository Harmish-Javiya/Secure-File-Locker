### AI PROPMT to ready your AI

``` bash
I am building a Secure File Locker web application using Flask (Python) backend 
and React.js frontend. Here is everything you need to know to help me continue 
this project.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROJECT OVERVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
A full-stack secure file storage application where users can register, login, 
upload files (encrypted), download files (decrypted), and manage their files. 
The app must demonstrate the following security concepts:

1. Secure Software Development (OWASP Top 10, input validation, least privilege)
2. Network Security (HTTPS/TLS, security headers, rate limiting, CORS)
3. Cryptography (AES-256-GCM encryption, Argon2 password hashing, JWT auth)
4. Application Security (RBAC, MFA/TOTP, IDOR prevention, file sanitization)
5. Cloud Infrastructure & Security (AWS S3, IAM, Secrets Manager, VPC)
6. Digital Forensics (audit logging, SHA-256 file integrity, tamper-evident logs)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TECH STACK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Backend:
- Python 3.12.1
- Flask 3.1.3 + Flask-JWT-Extended 4.6.0
- Flask-SQLAlchemy 3.1.1 + Flask-Limiter 3.8.0
- PostgreSQL 14 (localhost:5432)
- Argon2id 25.1.0 (password hashing)
- cryptography 43.0.3 (AES-256-GCM)
- PyOTP 2.9.0 (MFA/TOTP)
- Boto3 (AWS S3)

Frontend:
- React.js 18 (Node v20.19.4, npm 10.8.2)
- Axios (API calls)
- React Router DOM (routing)
- React Dropzone (file upload)
- React Hot Toast (notifications)

DevOps:
- Docker + Docker Compose
- Nginx (reverse proxy)
- AWS S3 (file storage)
- AWS Secrets Manager (secrets)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SYSTEM INFO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Mac Intel (Homebrew at /usr/local)
- Python 3.12.1
- Node v20.19.4, npm 10.8.2
- PostgreSQL 14 at /usr/local/opt/postgresql@14
- Virtual environment: backend/venv
- Activate venv: source venv/bin/activate
- Start PostgreSQL: brew services start postgresql@14
- Open psql: /usr/local/opt/postgresql@14/bin/psql postgres

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROJECT STRUCTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
secure-file-locker/
│
├── backend/
│   ├── app.py                  ✅
│   ├── config.py               ✅
│   ├── extensions.py           ✅
│   ├── requirements.txt        ✅
│   ├── BACKEND_SETUP.md        ✅
│   ├── .env                    ✅
│   ├── uploads/                ✅ Local encrypted storage (temp, S3 later)
│   ├── models/
│   │   ├── user.py             ✅
│   │   └── file.py             ✅
│   ├── routes/
│   │   ├── auth.py             ✅
│   │   └── files.py            ✅
│   ├── utils/
│   │   ├── encryption.py       ✅
│   │   └── audit_logger.py     ✅
│   └── middleware/
│       └── security.py         ✅
│
└── frontend/
    └── src/
        ├── App.js              🔲
        ├── pages/
        │   ├── Login.jsx       🔲
        │   ├── Register.jsx    🔲
        │   └── Dashboard.jsx   🔲
        ├── components/
        │   ├── FileUpload.jsx  🔲
        │   └── FileList.jsx    🔲
        └── utils/
            └── api.js          🔲

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ BACKEND — 100% COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ PostgreSQL running on localhost:5432
✅ Database: secure_file_locker
✅ Virtual environment: backend/venv
✅ All packages installed (see requirements.txt)

✅ config.py — DevelopmentConfig + ProductionConfig
✅ extensions.py — db, jwt, limiter
✅ app.py — Flask app factory:
   - Models imported inside create_app()
   - db.create_all() in __main__ block (OUTSIDE create_app)
   - Blueprints: /api/auth + /api/files
   - JWT + global error handlers
   - init_security() called before return app

✅ models/user.py:
   - Argon2id hashing (time_cost=3, memory_cost=65536)
   - Password strength: 12+ chars, upper, lower, digit, special
   - Account lock after 5 failed attempts (15 min)
   - MFA/TOTP generation + verification
   - Relationships with foreign_keys= specified

✅ models/file.py:
   - SHA-256 integrity hash
   - encryption_iv: String(500) stores "nonce_b64:salt_b64"
   - Soft delete with deleted_at
   - Share token with expiry
   - AuditLog model in same file

✅ utils/encryption.py:
   - AES-256-GCM encrypt/decrypt
   - Per-user PBKDF2 key derivation (600,000 iterations)
   - Random nonce per file (never reused)
   - SHA-256 integrity hashing + verification
   - encode_bytes/decode_bytes (base64 helpers)

✅ utils/audit_logger.py:
   - Logs to AuditLog table
   - Captures IP, user agent, action, status, details
   - Never crashes app on failure

✅ routes/auth.py — ALL TESTED ✅:
   - POST /api/auth/register ✅
   - POST /api/auth/login ✅
   - GET  /api/auth/me ✅
   - POST /api/auth/refresh
   - POST /api/auth/logout
   - POST /api/auth/mfa/setup
   - POST /api/auth/mfa/verify
   - POST /api/auth/mfa/disable

✅ routes/files.py:
   - POST   /api/files/upload
   - GET    /api/files/
   - GET    /api/files/download/<id>
   - DELETE /api/files/delete/<id>
   - POST   /api/files/share/<id>
   - GET    /api/files/shared/<token>
   - GET    /api/files/<id>

✅ middleware/security.py — ACTIVE:
   - apply_security_headers() — on every response
   - configure_cors() — localhost:3000 only
   - block_suspicious_requests() — SQLi, XSS, path traversal
   - require_https() — production only
   - sanitize_string() + sanitize_request_data()
   - validate_content_type() decorator
   - init_security() — master function called in app.py

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ CRITICAL KNOWN ISSUES — ALREADY FIXED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- models/file.py must start with:
  "from datetime import datetime, timezone"
  NOT app.py code — this was mixed up before
- routes/files.py must start with:
  "from flask import Blueprint, request, jsonify, send_file"
- encryption_iv column must be String(500) not String(32)
- db.create_all() must be OUTSIDE create_app() in __main__
- User model relationships need foreign_keys= to avoid errors
- Always verify file contents before running:
  cat models/file.py | head -1
  cat routes/files.py | head -1

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔲 PENDING — DO IN ORDER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase 4 — Frontend (START HERE):
🔲 1. Install frontend packages:
      cd frontend
      npm install axios react-router-dom react-dropzone react-hot-toast

🔲 2.  src/utils/api.js
       Axios instance with:
       - Base URL: http://localhost:5000
       - JWT Authorization header on every request
       - Auto refresh token on 401
       - Request/response interceptors

🔲 3.  src/App.js
       React Router with:
       - Public routes: /login, /register
       - Protected routes: /dashboard
       - Auth context/state
       - Redirect if not logged in

🔲 4.  src/pages/Login.jsx
       - Email + password form
       - MFA token input (shows if MFA enabled)
       - JWT stored in memory (not localStorage)
       - Redirect to dashboard on success

🔲 5.  src/pages/Register.jsx
       - Username, email, password fields
       - Live password strength indicator
       - Validation errors shown inline

🔲 6.  src/pages/Dashboard.jsx
       - Mode selector: Cloud Storage vs Instant Encrypt
       - File list section
       - Upload section
       - User info + logout

🔲 7.  src/components/FileUpload.jsx
       - Drag and drop using react-dropzone
       - File type + size validation on frontend
       - Progress bar
       - Mode selection (Cloud vs Instant Encrypt)

🔲 8.  src/components/FileList.jsx
       - Table of uploaded files
       - Download, Delete, Share buttons per file
       - File size, date, type shown
       - Empty state when no files

Phase 5 — DevOps & Cloud:
🔲 9.  AWS S3 integration (replace local uploads/ folder)
🔲 10. Docker + docker-compose.yml
🔲 11. Nginx config with HTTPS/TLS
🔲 12. Deploy to AWS

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TWO STORAGE MODES (FEATURE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Mode 1 — Cloud Storage:
- File encrypted → stored in S3 → saved to DB
- Accessible from any device via account login
- Share via link, manage in dashboard

Mode 2 — Instant Encrypt (Zero Storage):
- File uploaded in chunks → encrypted in real time
- Streamed back to browser simultaneously
- Nothing stored on server or S3
- User sets password → downloads .enc file
- Decrypted locally with password (zero knowledge)
- New backend route needed: POST /api/files/stream-encrypt

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
.env FILE CONTENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FLASK_ENV=development
SECRET_KEY=your-super-secret-key-change-this
DEBUG=True
DB_HOST=localhost
DB_PORT=5432
DB_NAME=secure_file_locker
DB_USER=postgres
DB_PASSWORD=yourpassword
JWT_SECRET_KEY=your-jwt-secret-key-change-this
JWT_ACCESS_TOKEN_EXPIRES=900
JWT_REFRESH_TOKEN_EXPIRES=604800
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_BUCKET_NAME=your-bucket-name
AWS_REGION=us-east-1
MASTER_ENCRYPTION_KEY=your-32-byte-master-key-here-1234
ALLOWED_ORIGINS=http://localhost:3000

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
API ENDPOINTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Auth (prefix: /api/auth):
  POST   /register
  POST   /login          → access_token + refresh_token
  POST   /refresh        → new access_token
  POST   /logout
  GET    /me             → JWT required
  POST   /mfa/setup      → JWT required
  POST   /mfa/verify     → JWT required
  POST   /mfa/disable    → JWT required

Files (prefix: /api/files):
  POST   /upload         → JWT, form-data, key="file"
  GET    /               → JWT required
  GET    /download/<id>  → JWT required
  DELETE /delete/<id>    → JWT required
  POST   /share/<id>     → JWT, body: {"expires_in_hours": 24}
  GET    /shared/<token> → No auth needed
  GET    /<id>           → JWT required

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RESPONSE FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Success: {"message": "...", "data": {...}}
Error:   {"error": "...", "code": "SNAKE_CASE_CODE"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CODING RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- App factory pattern always (create_app())
- Never hardcode secrets — os.getenv() only
- Validate + sanitize all inputs on backend
- All DB ops in try/except with rollback
- Activate venv before running anything
- HTTP codes: 200, 201, 400, 401, 403, 404, 429, 500
- Always give COMPLETE files — no partial snippets
- Follow existing structure strictly
- Maintain all 6 security concepts throughout
- JWT stored in memory on frontend (NOT localStorage)
- Never expose stack traces to client

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HOW TO RUN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Terminal 1 — Backend
brew services start postgresql@14
cd backend
source venv/bin/activate
python3 app.py
→ http://localhost:5000

# Terminal 2 — Frontend
cd frontend
npm start
→ http://localhost:3000
```
