import os
import hashlib
import secrets
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.backends import default_backend
import base64


# ── Constants ────────────────────────────────────────────
NONCE_SIZE = 12       # 96 bits — recommended for AES-GCM
KEY_SIZE   = 32       # 256 bits — AES-256
SALT_SIZE  = 16       # 128 bits


def get_master_key() -> bytes:
    """Load master encryption key from environment."""
    key = os.getenv("MASTER_ENCRYPTION_KEY")
    if not key:
        raise ValueError("MASTER_ENCRYPTION_KEY not set in environment.")
    # Ensure exactly 32 bytes using SHA-256
    return hashlib.sha256(key.encode()).digest()


def derive_user_key(user_id: int, salt: bytes = None):
    """
    Derive a unique encryption key per user using PBKDF2.
    Returns (derived_key_bytes, salt_bytes)
    """
    master_key = get_master_key()
    if salt is None:
        salt = secrets.token_bytes(SALT_SIZE)

    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=KEY_SIZE,
        salt=salt + str(user_id).encode(),
        iterations=600000,          # NIST recommended minimum (2023)
        backend=default_backend()
    )
    derived_key = kdf.derive(master_key)
    return derived_key, salt


def encrypt_file(file_bytes: bytes, user_id: int):
    """
    Encrypt file bytes using AES-256-GCM.
    Returns:
        encrypted_data (bytes),
        nonce (bytes),
        salt (bytes)
    """
    # Derive a unique key for this user
    user_key, salt = derive_user_key(user_id)

    # Generate a random nonce (never reuse)
    nonce = secrets.token_bytes(NONCE_SIZE)

    # Encrypt
    aesgcm = AESGCM(user_key)
    encrypted_data = aesgcm.encrypt(nonce, file_bytes, None)

    return encrypted_data, nonce, salt


def decrypt_file(encrypted_data: bytes, nonce: bytes, salt: bytes, user_id: int) -> bytes:
    """
    Decrypt file bytes using AES-256-GCM.
    Returns original file bytes.
    """
    # Re-derive the same user key using stored salt
    user_key, _ = derive_user_key(user_id, salt=salt)

    aesgcm = AESGCM(user_key)
    decrypted_data = aesgcm.decrypt(nonce, encrypted_data, None)

    return decrypted_data


def compute_sha256(file_bytes: bytes) -> str:
    """
    Compute SHA-256 hash of file for integrity verification (Digital Forensics).
    Returns hex string.
    """
    return hashlib.sha256(file_bytes).hexdigest()


def verify_file_integrity(file_bytes: bytes, stored_hash: str) -> bool:
    """
    Verify file hasn't been tampered with by comparing SHA-256 hashes.
    """
    current_hash = compute_sha256(file_bytes)
    return secrets.compare_digest(current_hash, stored_hash)


def encode_bytes(data: bytes) -> str:
    """Encode bytes to base64 string for database storage."""
    return base64.b64encode(data).decode("utf-8")


def decode_bytes(data: str) -> bytes:
    """Decode base64 string back to bytes."""
    return base64.b64decode(data.encode("utf-8"))