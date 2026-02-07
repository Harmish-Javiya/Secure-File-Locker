# config.py
"""
Central configuration for Secure File Locker.
All paths, security constants and defaults live here.
"""

from pathlib import Path
import os

#               PROJECT STRUCTURE & PATHS

BASE_DIR = Path(__file__).resolve().parent          # root

DATA_DIR          = BASE_DIR / "data"
VAULT_STORAGE_DIR = DATA_DIR / "vault_storage"      # where encrypted files / blobs are actually saved
DB_PATH           = DATA_DIR / "locker.db"          # SQLite metadata database
LOG_PATH          = DATA_DIR / "app.log"

# Ensure critical directories exist on first run
for directory in [DATA_DIR, VAULT_STORAGE_DIR]:
    directory.mkdir(parents=True, exist_ok=True)


#               SECURITY & CRYPTO SETTINGS
# These values should NOT be changed after users have created vaults!

# Key Derivation (master password → encryption key)
KDF_ALGORITHM   = "pbkdf2_hmac-sha256"
KDF_ITERATIONS  = 600_000               # strong 2025–2026 value (increase if performance allows)
KDF_KEY_LENGTH  = 32                    # 256 bits
KDF_SALT_LENGTH = 16                    # bytes

# File encryption
ENCRYPTION_CIPHER     = "AES-256-GCM"   # modern & authenticated
# Alternative (simpler but less flexible): "Fernet" (also AES-128-CBC + HMAC-SHA256)
USE_FERNET            = False           # set True if you prefer cryptography.Fernet

# AES-GCM specific (only used when USE_FERNET = False)
AES_KEY_LENGTH       = 256              # bits → 32 bytes
AES_NONCE_LENGTH     = 12               # bytes (recommended)
AES_TAG_LENGTH       = 16               # bytes (128 bit authentication tag)

# File naming / storage
ENCRYPTED_FILE_SUFFIX = ".secure"       # or ".enc", ".vault", etc.
METADATA_FILENAME     = "metadata.db"   # only used if you ever switch to file-per-vault mode

# Password policy
MIN_MASTER_PASSWORD_LENGTH = 12
RECOMMENDED_MIN_ENTROPY    = 60         # bits — roughly 12 random chars or 16 memorable ones

# ────────────────────────────────────────────────
#               APPLICATION BEHAVIOR
# ────────────────────────────────────────────────
APP_NAME    = "Secure File Locker"
VERSION     = "0.1.0-dev"
APP_TITLE   = f"{APP_NAME} v{VERSION}"

# Session / UI related
SESSION_TIMEOUT_MINUTES = 15            # auto-lock after inactivity
DEFAULT_THEME           = "dark"        # if you implement theme support

# Debugging & logging
DEBUG           = True
LOG_LEVEL       = "DEBUG" if DEBUG else "INFO"
LOG_TO_CONSOLE  = True
LOG_TO_FILE     = True

# ────────────────────────────────────────────────
#               Helper / Convenience functions
# ────────────────────────────────────────────────

def get_vault_file_path(filename: str) -> Path:
    """Full path where an encrypted file should be stored"""
    safe_name = filename.replace("/", "_").replace("\\", "_")
    return VAULT_STORAGE_DIR / f"{safe_name}{ENCRYPTED_FILE_SUFFIX}"


def get_db_uri() -> str:
    """For SQLAlchemy or future database drivers"""
    return f"sqlite:///{DB_PATH.absolute()}"


# ────────────────────────────────────────────────
#               Quick self-check when imported directly
# ────────────────────────────────────────────────

if __name__ == "__main__":
    print(f"Project root:       {BASE_DIR}")
    print(f"Database:           {DB_PATH}")
    print(f"Encrypted files go: {VAULT_STORAGE_DIR}")
    print(f"Debug mode:         {DEBUG}")
    print(f"Using Fernet:       {USE_FERNET}")