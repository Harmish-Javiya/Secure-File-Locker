import os
import hashlib
import secrets
import base64
import io
from cryptography.hazmat.primitives.ciphers.aead import AESGCM, ChaCha20Poly1305
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.backends import default_backend
from cryptography.fernet import Fernet

# ── Constants ────────────────────────────────────────────
KEY_SIZE   = 32       # 256 bits
SALT_SIZE  = 16       # 128 bits
ITERATIONS = 600000   # NIST recommended minimum
CHUNK_SIZE = 64 * 1024 # 64KB chunks for memory efficiency

def get_master_key() -> bytes:
    """Load master encryption key from environment."""
    key = os.getenv("MASTER_ENCRYPTION_KEY")
    if not key:
        raise ValueError("MASTER_ENCRYPTION_KEY not set in environment.")
    return hashlib.sha256(key.encode()).digest()

def derive_user_key(user_id: int, salt: bytes = None):
    """Derive a unique encryption key per user using PBKDF2."""
    master_key = get_master_key()
    if salt is None:
        salt = secrets.token_bytes(SALT_SIZE)

    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=KEY_SIZE,
        salt=salt + str(user_id).encode(),
        iterations=ITERATIONS,
        backend=default_backend()
    )
    derived_key = kdf.derive(master_key)
    return derived_key, salt

# --- NEW: STREAMING ENCRYPTION FOR LARGE FILES (20GB+) ---
def encrypt_stream(file_stream, user_id: int, algo="AES-256-GCM"):
    file_stream.seek(0)
    
    user_key, salt = derive_user_key(user_id)
    nonce = secrets.token_bytes(12)
    
    yield salt + nonce

    if algo == "AES-256-GCM":
        cipher = AESGCM(user_key)
    elif algo == "ChaCha20":
        cipher = ChaCha20Poly1305(user_key)
    else:
        raise ValueError(f"Streaming not supported for {algo}")

    counter = 1
    while True:
        chunk = file_stream.read(CHUNK_SIZE)
        if not chunk:
            break
        # Unique nonce per chunk to avoid reuse
        chunk_nonce = (int.from_bytes(nonce, 'big') + counter).to_bytes(12, 'big')
        yield cipher.encrypt(chunk_nonce, chunk, None)
        counter += 1


# --- PRESERVED: STANDARD ENCRYPTION (For < 100MB Cloud) ---
def encrypt_file(file_bytes: bytes, user_id: int, algo="AES-256-GCM"):
    """Encrypt file bytes using the selected algorithm."""
    user_key, salt = derive_user_key(user_id)
    nonce = secrets.token_bytes(12)

    if algo == "AES-256-GCM":
        cipher = AESGCM(user_key)
        encrypted_data = cipher.encrypt(nonce, file_bytes, None)
    elif algo == "ChaCha20":
        cipher = ChaCha20Poly1305(user_key)
        encrypted_data = cipher.encrypt(nonce, file_bytes, None)
    elif algo == "Fernet":
        f = Fernet(base64.urlsafe_b64encode(user_key))
        encrypted_data = f.encrypt(file_bytes)
        nonce = b"fernet_internal" 
    else:
        raise ValueError(f"Unsupported algorithm: {algo}")

    return encrypted_data, nonce, salt

def decrypt_file(encrypted_data: bytes, nonce: bytes, salt: bytes, user_id: int, algo="AES-256-GCM") -> bytes:
    """Decrypt file bytes using the stored algorithm."""
    user_key, _ = derive_user_key(user_id, salt=salt)

    if algo == "AES-256-GCM":
        cipher = AESGCM(user_key)
        return cipher.decrypt(nonce, encrypted_data, None)
    elif algo == "ChaCha20":
        cipher = ChaCha20Poly1305(user_key)
        return cipher.decrypt(nonce, encrypted_data, None)
    elif algo == "Fernet":
        f = Fernet(base64.urlsafe_b64encode(user_key))
        return f.decrypt(encrypted_data)
    
    raise ValueError(f"Unsupported decryption algorithm: {algo}")

def compute_sha256(file_bytes: bytes) -> str:
    """Compute SHA-256 hash for integrity verification."""
    return hashlib.sha256(file_bytes).hexdigest()

def verify_file_integrity(file_bytes: bytes, stored_hash: str) -> bool:
    """Verify file integrity via SHA-256."""
    return secrets.compare_digest(compute_sha256(file_bytes), stored_hash)

def encode_bytes(data: bytes) -> str:
    """Encode bytes to base64 for database storage."""
    return base64.b64encode(data).decode("utf-8")

def decode_bytes(data: str) -> bytes:
    """Decode base64 string back to bytes."""
    return base64.b64decode(data.encode("utf-8"))