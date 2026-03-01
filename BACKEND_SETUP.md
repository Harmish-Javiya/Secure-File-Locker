# 🔒 Secure File Locker — Backend Setup Guide

Complete step-by-step guide to set up the backend
on Mac and Windows from scratch.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1 — INSTALL SYSTEM DEPENDENCIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### Mac
```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Python 3.12
brew install python@3.12

# Install PostgreSQL 14
brew install postgresql@14

# Install Git
brew install git

# Verify installations
python3 --version     # Should show Python 3.12.x
psql --version        # Should show psql 14.x
git --version         # Should show git version
```

### Windows
```
1. Python 3.12
   → Download: https://www.python.org/downloads
   → During install: CHECK "Add Python to PATH"
   → Verify: open CMD → python --version

2. PostgreSQL 14
   → Download: https://www.postgresql.org/download/windows
   → Remember the password you set for postgres user
   → Default port: 5432
   → Verify: open CMD → psql --version

3. Git
   → Download: https://git-scm.com/download/win
   → Verify: open CMD → git --version
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2 — CLONE THE PROJECT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```bash
git clone https://github.com/Harmish-Javiya/Secure-File-Locker.git
cd secure-file-locker
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 3 — SET UP POSTGRESQL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### Mac — Start PostgreSQL
```bash
brew services start postgresql@14

# Verify it's running
brew services list
# Should show postgresql@14 as "started"
```

### Windows — Start PostgreSQL
```
PostgreSQL starts automatically after installation.
If not running:
→ Open Services (Win+R → services.msc)
→ Find postgresql-x64-14
→ Click Start
```

### Both Mac and Windows — Create Database
```bash
# Mac
/usr/local/opt/postgresql@14/bin/psql postgres

# Windows
psql -U postgres
```

Inside psql run:
```sql
CREATE DATABASE secure_file_locker;
CREATE USER postgres WITH PASSWORD 'yourpassword';
GRANT ALL PRIVILEGES ON DATABASE secure_file_locker TO postgres;
\q
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 4 — SET UP VIRTUAL ENVIRONMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```bash
cd backend
```

### Mac
```bash
python3 -m venv venv
source venv/bin/activate
# You should see (venv) in terminal
```

### Windows
```bash
python -m venv venv
venv\Scripts\activate
# You should see (venv) in terminal
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 5 — INSTALL PYTHON DEPENDENCIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Make sure (venv) is active before running this.
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### Verify all packages installed correctly
```bash
pip list
```

You should see all these packages:
```
Flask                3.0.3
Flask-JWT-Extended   4.6.0
Flask-Limiter        3.8.0
Flask-SQLAlchemy     3.1.1
SQLAlchemy           2.0.36
psycopg2-binary      2.9.9
cryptography         43.0.3
argon2-cffi          23.1.0
pyotp                2.9.0
qrcode               7.4.2
Pillow               11.0.0
boto3                1.35.36
python-dotenv        1.0.1
Werkzeug             3.0.6
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 6 — CREATE .env FILE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Create a file called .env inside the backend/ folder.
Never commit this file to GitHub.
```env
# ── App ──────────────────────────────────────────
FLASK_ENV=development
SECRET_KEY=your-super-secret-key-change-this-min-32-chars
DEBUG=True

# ── Database ─────────────────────────────────────
DB_HOST=localhost
DB_PORT=5432
DB_NAME=secure_file_locker
DB_USER=postgres
DB_PASSWORD=yourpassword

# ── JWT ───────────────────────────────────────────
JWT_SECRET_KEY=your-jwt-secret-key-change-this-min-32-chars
JWT_ACCESS_TOKEN_EXPIRES=900
JWT_REFRESH_TOKEN_EXPIRES=604800

# ── AWS S3 (optional for local dev) ───────────────
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_BUCKET_NAME=your-bucket-name
AWS_REGION=us-east-1

# ── Encryption ────────────────────────────────────
MASTER_ENCRYPTION_KEY=your-32-byte-master-key-here-1234

# ── CORS ──────────────────────────────────────────
ALLOWED_ORIGINS=http://localhost:3000
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 7 — RUN THE BACKEND
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Make sure (venv) is active and PostgreSQL is running.

### Mac
```bash
source venv/bin/activate
python3 app.py
```

### Windows
```bash
venv\Scripts\activate
python app.py
```

Expected output:
```
* Running on http://0.0.0.0:5000
* Debug mode: on
* Debugger PIN: xxx-xxx-xxx
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 8 — VERIFY EVERYTHING WORKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Open Postman or browser and test:

1. Health Check
   GET http://localhost:5000/api/health
   Expected: {"status": "ok", "env": "development"}

2. Register
   POST http://localhost:5000/api/auth/register
   Body (JSON):
   {
     "username": "testuser",
     "email": "test@example.com",
     "password": "Test@1234567"
   }
   Expected: 201 Created

3. Login
   POST http://localhost:5000/api/auth/login
   Body (JSON):
   {
     "email": "test@example.com",
     "password": "Test@1234567"
   }
   Expected: 200 + access_token + refresh_token

4. Check Security Headers
   GET http://localhost:5000/api/health
   → Click Headers tab in Postman response
   → Should see X-Frame-Options, CSP, etc.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TROUBLESHOOTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ ModuleNotFoundError: No module named 'flask'
→ Virtual environment not active
→ Mac: source venv/bin/activate
→ Windows: venv\Scripts\activate

❌ psycopg2.OperationalError: Connection refused
→ PostgreSQL not running
→ Mac: brew services start postgresql@14
→ Windows: net start postgresql-x64-14

❌ ImportError: cannot import name 'X'
→ Wrong code in wrong file
→ Check first line of each file:
   models/file.py    → from datetime import datetime, timezone
   routes/files.py   → from flask import Blueprint
   app.py            → from flask import Flask, jsonify

❌ 500 Internal Server Error
→ Check terminal for traceback
→ Most common: .env values missing or wrong

❌ PostgreSQL error on Windows
→ Make sure postgres user password matches .env
→ Try: psql -U postgres -h localhost

❌ Port 5000 already in use
→ Mac: lsof -i :5000 then kill -9 <PID>
→ Windows: netstat -ano | findstr :5000
           taskkill /PID <PID> /F

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DAILY DEVELOPMENT WORKFLOW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Every time you open a new terminal to work:

### Mac
```bash
brew services start postgresql@14
cd secure-file-locker/backend
source venv/bin/activate
python3 app.py
```

### Windows
```bash
net start postgresql-x64-14
cd secure-file-locker\backend
venv\Scripts\activate
python app.py
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BACKEND API ENDPOINTS REFERENCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Auth Routes (prefix: /api/auth)
  POST   /register          Create account
  POST   /login             Login → access + refresh tokens
  POST   /refresh           Get new access token
  POST   /logout            Logout
  GET    /me                Get current user (JWT required)
  POST   /mfa/setup         Get MFA QR code (JWT required)
  POST   /mfa/verify        Enable MFA (JWT required)
  POST   /mfa/disable       Disable MFA (JWT required)

File Routes (prefix: /api/files)
  POST   /upload            Upload + encrypt file (JWT required)
  GET    /                  List my files (JWT required)
  GET    /download/<id>     Decrypt + download (JWT required)
  DELETE /delete/<id>       Soft delete (JWT required)
  POST   /share/<id>        Generate share link (JWT required)
  GET    /shared/<token>    Download shared file (no auth)
  GET    /<id>              File metadata (JWT required)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PACKAGES EXPLAINED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

flask                 Core web framework
flask-jwt-extended    JWT authentication tokens
flask-sqlalchemy      Database ORM (Object Relational Mapper)
flask-limiter         Rate limiting on endpoints
psycopg2-binary       PostgreSQL database driver
sqlalchemy            Database query engine
cryptography          AES-256-GCM file encryption
argon2-cffi           Argon2id password hashing
pyotp                 TOTP MFA (Google Authenticator)
qrcode                Generate MFA QR codes
pillow                Image processing (for QR codes)
boto3                 AWS S3 file storage
botocore              AWS core library
python-dotenv         Load .env environment variables
werkzeug              Secure filename sanitization
limits                Rate limiter storage backend