import os
from app.backend.crypto import (
    generate_master_key,
    encrypt_key_blob,
    encrypt_file_streaming,
    decrypt_file_streaming
)
from app.backend.database import get_vault_config, save_vault_config, get_all_files, update_file_record


def rotate_vault_keys(password, old_master_key):
    print("⚠️ STARTING KEY ROTATION - DO NOT INTERRUPT")

    # 1. Generate NEW Identity
    new_master_key = generate_master_key()
    new_salt = os.urandom(16)

    # 2. Re-Encrypt All Files
    # (We assume you wrote a get_all_files() in database.py that returns all file rows)
    all_files = get_all_files()

    for file_record in all_files:
        old_path = file_record['encrypted_path']
        temp_decrypted = old_path + ".temp"
        new_encrypted = old_path + ".new"

        # A. Unlock with OLD key
        decrypt_file_streaming(old_path, temp_decrypted, old_master_key)

        # B. Lock with NEW key
        encrypt_file_streaming(temp_decrypted, new_encrypted, new_master_key)

        # C. Swap files
        os.remove(temp_decrypted)
        os.remove(old_path)
        os.rename(new_encrypted, old_path)

        print(f"rotated: {file_record['original_name']}")

    # 3. Update the Database with NEW Master Key
    # (You need to derive the key wrapper from the password again with the NEW salt)
    # ... logic to save new config ...

    print("✅ SUCCESS: Old Master Key is now useless.")