import os
import secrets
import string
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from config import KDF_ITERATIONS, KDF_KEY_LENGTH, AES_NONCE_LENGTH, KDF_SALT_LENGTH

# --- KEY GENERATION ---

def generate_salt() -> bytes:
    return os.urandom(KDF_SALT_LENGTH)

def generate_master_key() -> bytes:
    """Generates a random 32-byte key. This is the 'Inner Key'."""
    return os.urandom(KDF_KEY_LENGTH)

def generate_recovery_key() -> str:
    """Generates XXXX-XXXX-XXXX-XXXX"""
    chars = string.ascii_uppercase + string.digits
    parts = [''.join(secrets.choice(chars) for _ in range(4)) for _ in range(4)]
    return "-".join(parts)

def derive_key(password: str, salt: bytes) -> bytes:
    """Derives a key from password/token + salt."""
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=KDF_KEY_LENGTH,
        salt=salt,
        iterations=KDF_ITERATIONS,
    )
    return kdf.derive(password.encode())

# --- KEY WRAPPING (Encrypting the Master Key) ---

def encrypt_key_blob(data_key: bytes, wrapping_key: bytes) -> bytes:
    """
    Encrypts the Master Key using the Password-Derived-Key.
    Returns: Nonce + Ciphertext + Tag
    """
    aesgcm = AESGCM(wrapping_key)
    nonce = os.urandom(AES_NONCE_LENGTH)
    return nonce + aesgcm.encrypt(nonce, data_key, None)

def decrypt_key_blob(blob: bytes, wrapping_key: bytes) -> bytes:
    """
    Unlocks the Master Key. Raises InvalidTag if password is wrong.
    """
    aesgcm = AESGCM(wrapping_key)
    nonce = blob[:AES_NONCE_LENGTH]
    ciphertext = blob[AES_NONCE_LENGTH:]
    return aesgcm.decrypt(nonce, ciphertext, None)

# --- FILE STREAMING ---

CHUNK_SIZE = 64 * 1024

def encrypt_file_streaming(input_path, output_path, key):
    aesgcm = AESGCM(key)
    with open(input_path, 'rb') as f_in, open(output_path, 'wb') as f_out:
        while True:
            chunk = f_in.read(CHUNK_SIZE)
            if not chunk: break
            nonce = os.urandom(AES_NONCE_LENGTH)
            f_out.write(nonce + aesgcm.encrypt(nonce, chunk, None))

def decrypt_file_streaming(input_path, output_path, key):
    aesgcm = AESGCM(key)
    read_size = AES_NONCE_LENGTH + CHUNK_SIZE + 16
    with open(input_path, 'rb') as f_in, open(output_path, 'wb') as f_out:
        while True:
            chunk = f_in.read(read_size)
            if not chunk: break
            nonce = chunk[:AES_NONCE_LENGTH]
            ciphertext = chunk[AES_NONCE_LENGTH:]
            f_out.write(aesgcm.decrypt(nonce, ciphertext, None))