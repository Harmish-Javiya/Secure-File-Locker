import sys
import os
import hashlib
from pathlib import Path

# Add the current folder to Python path so we can import app and config
sys.path.append(str(Path(__file__).resolve().parent))

from app.backend.crypto import (
    derive_key,
    generate_salt,
    generate_master_key,
    generate_recovery_key,
    encrypt_key_blob
)
from app.backend.database import initialize_db, save_vault_config


def setup_new_vault():
    print("=" * 60)
    print("          SECURE FILE LOCKER - INITIAL SETUP")
    print("=" * 60)

    # 1. Get User Input
    password = input("Choose a Master Password: ")
    if not password:
        print("❌ Password cannot be empty.")
        return

    # 2. Generate all the crypto materials
    print("\n[1/4] Generating Cryptographic Keys...")
    master_key = generate_master_key()  # The REAL key (32 bytes)
    user_salt = generate_salt()  # Salt for password
    token_salt = generate_salt()  # Salt for token
    recovery_token = generate_recovery_key()  # The backup code

    # 3. Create "Box 1" (Master Key locked by Password)
    print("[2/4] Encrypting Master Key with Password...")
    key_from_pass = derive_key(password, user_salt)
    # Encrypt the Master Key
    enc_mk_pass = encrypt_key_blob(master_key, key_from_pass)

    # Generate a hash for login verification (so we know if password is right quickly)
    password_hash = hashlib.sha256(key_from_pass).digest()

    # 4. Create "Box 2" (Master Key locked by Recovery Token)
    print("[3/4] Encrypting Master Key with Recovery Token...")
    key_from_token = derive_key(recovery_token, token_salt)
    enc_mk_token = encrypt_key_blob(master_key, key_from_token)

    # 5. Save everything to DB
    print("[4/4] Saving to Database...")
    initialize_db()  # Create tables if missing
    save_vault_config(
        salt=user_salt,
        enc_mk_pass=enc_mk_pass,
        pass_hash=password_hash,
        enc_mk_token=enc_mk_token,
        token_salt=token_salt
    )

    print("\n" + "=" * 60)
    print("✅ VAULT SETUP COMPLETE")
    print("=" * 60)
    print(f"\n⚠️  YOUR RECOVERY TOKEN:  {recovery_token}")
    print("\nWrite this down! If you lose your password, this is your ONLY way back in.")
    print("=" * 60)


if __name__ == "__main__":
    setup_new_vault()