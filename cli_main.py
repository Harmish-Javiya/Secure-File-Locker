import os
import sys
import tkinter as tk
from tkinter import filedialog
from pathlib import Path
import time

# --- SETUP PATHS ---
# Add the current directory to Python path so we can import 'app'
sys.path.append(str(Path(__file__).resolve().parent))

from config import DATA_DIR, VAULT_STORAGE_DIR
from app.backend.crypto import (
    derive_key, generate_salt, generate_master_key, generate_recovery_key,
    encrypt_key_blob, decrypt_key_blob, encrypt_file_streaming, decrypt_file_streaming
)
from app.backend.database import initialize_db, save_vault_config, get_vault_config
import sqlite3

# --- UTILITY: Hide Folder (Windows/Mac/Linux) ---
import ctypes
import platform


def hide_folder(path):
    """Sets the 'Hidden' attribute on the vault folder."""
    if platform.system() == 'Windows':
        # 0x02 is the code for Hidden in Windows
        ctypes.windll.kernel32.SetFileAttributesW(str(path), 0x02)
    else:
        # On Mac/Linux, prefix with dot '.'
        p = Path(path)
        if not p.name.startswith('.'):
            new_path = p.parent / ('.' + p.name)
            p.rename(new_path)
            return new_path
    return Path(path)


# --- GUI HELPER: Select File ---
# --- SAFE ALTERNATIVE: No GUI windows to prevent SIGSEGV ---
def gui_select_file(title="Select File"):
    print(f"\n[ACTION] {title}")
    print("👉 Drag and drop the file here and press Enter (or type the path):")
    path = input(">>> ").strip().replace("\\", "") # Clean up path formatting
    # Remove quotes if the user dragged the file in
    if path.startswith("'") or path.startswith('"'):
        path = path[1:-1]
    return path

def gui_select_folder(title="Select Folder"):
    print(f"\n[ACTION] {title}")
    print("👉 Drag and drop the FOLDER here and press Enter:")
    path = input(">>> ").strip().replace("\\", "")
    if path.startswith("'") or path.startswith('"'):
        path = path[1:-1]
    return path


# --- CORE ACTIONS ---

def setup_vault_wizard():
    print("\n" + "=" * 50)
    print("      INITIAL SETUP: CREATE YOUR VAULT")
    print("=" * 50)

    # 1. Choose Storage Location
    print("\n[STEP 1] Where should we store your encrypted files?")
    print("         (Press Enter to select a folder)")
    input(">>> ")
    target_dir = gui_select_folder("Select Vault Storage Location")

    if not target_dir:
        print("❌ No folder selected. Exiting.")
        sys.exit()

    # Create the vault folder and hide it
    vault_name = "MySecureVault"
    vault_path = Path(target_dir) / vault_name
    vault_path.mkdir(exist_ok=True)

    # Try to hide it
    final_vault_path = hide_folder(vault_path)
    print(f"✅ Vault created (and hidden) at: {final_vault_path}")

    # 2. Set Password
    password = input("\n[STEP 2] Create a Master Password: ")
    if len(password) < 4:
        print("❌ Password too short.")
        sys.exit()

    # 3. Generate Keys
    print("\n[STEP 3] Generating Cryptographic Material...")
    master_key = generate_master_key()
    user_salt = generate_salt()
    token_salt = generate_salt()
    recovery_token = generate_recovery_key()

    # 4. Wrap Keys
    key_from_pass = derive_key(password, user_salt)
    enc_mk_pass = encrypt_key_blob(master_key, key_from_pass)

    # Simple hash for login check
    import hashlib
    pass_hash = hashlib.sha256(key_from_pass).digest()

    key_from_token = derive_key(recovery_token, token_salt)
    enc_mk_token = encrypt_key_blob(master_key, key_from_token)

    # 5. Save to DB
    # We update config.py paths dynamically in a real app,
    # but for now we'll assume DB stays in 'data/locker.db'
    initialize_db()
    save_vault_config(user_salt, enc_mk_pass, pass_hash, enc_mk_token, token_salt)

    # Save the custom vault path to a simple text file or DB (Simplification for this script)
    # In a real app, update 'backend/database.py' to store 'vault_path' in the config table.
    with open("vault_location.txt", "w") as f:
        f.write(str(final_vault_path))

    print("\n" + "!" * 60)
    print(f"SETUP COMPLETE. YOUR RECOVERY TOKEN: {recovery_token}")
    print("WRITE THIS DOWN. IT IS THE ONLY WAY TO RESET YOUR PASSWORD.")
    print("!" * 60)
    time.sleep(2)


def recover_vault_with_token():
    print("\n" + "!" * 40)
    print("      🆘 VAULT RECOVERY MODE")
    print("!" * 40)

    token_input = input("\nEnter your 16-character Recovery Token: ").strip()

    # 1. Get the config from DB
    config = get_vault_config()
    token_salt = config['token_salt']
    enc_mk_token = config['enc_master_key_token']

    try:
        # 2. Derive the key from the Token
        key_from_token = derive_key(token_input, token_salt)

        # 3. Try to unlock the Master Key
        master_key = decrypt_key_blob(enc_mk_token, key_from_token)
        print("\n✅ Token Verified! Master Key Unlocked.")

        # 4. Force Password Reset
        print("\nSince you used a recovery token, you must set a new password.")
        new_password = input("Enter New Master Password: ")

        # 5. Re-wrap the Master Key with the NEW password
        new_user_salt = generate_salt()
        new_key_from_pass = derive_key(new_password, new_user_salt)
        new_enc_mk_pass = encrypt_key_blob(master_key, new_key_from_pass)

        import hashlib
        new_pass_hash = hashlib.sha256(new_key_from_pass).digest()

        # 6. Update Database (Keep the same token, but update password box)
        save_vault_config(
            new_user_salt,
            new_enc_mk_pass,
            new_pass_hash,
            config['enc_master_key_token'],  # Keep old token box
            config['token_salt']  # Keep old token salt
        )

        print("\n🎉 Password reset successful! You can now login normally.")
        return master_key

    except Exception as e:
        print(f"\n❌ Recovery Failed: Invalid Token. ({e})")
        return None


def login():
    if not os.path.exists("data/locker.db"):
        setup_vault_wizard()
        return login()

    print("\n🔐 LOGIN REQUIRED")
    print("Leave password blank and press Enter to use RECOVERY TOKEN.")
    password = input("Enter Master Password: ")

    if password == "":
        return recover_vault_with_token()

    # ... (Keep your existing password check logic below this) ...
    config = get_vault_config()
    user_salt = config['salt']
    enc_mk_pass = config['enc_master_key_pass']

    attempt_key = derive_key(password, user_salt)

    try:
        master_key = decrypt_key_blob(enc_mk_pass, attempt_key)
        print("✅ Access Granted.")
        return master_key
    except Exception:
        print("❌ Access Denied: Wrong Password.")
        # Instead of exiting, let's offer recovery
        choice = input("Forgot password? Use recovery token? (y/n): ")
        if choice.lower() == 'y':
            return recover_vault_with_token()
        sys.exit()

def get_vault_path():
    # Read the custom path we saved during setup
    try:
        with open("vault_location.txt", "r") as f:
            return Path(f.read().strip())
    except:
        return VAULT_STORAGE_DIR


# --- MENU ACTIONS ---

def action_encrypt(master_key):
    print("\n--- ENCRYPT FILE ---")
    file_path = gui_select_file("Select a file to Encrypt")
    if not file_path: return

    p = Path(file_path)
    vault_path = get_vault_path()

    # 1. Determine output path
    encrypted_filename = p.name + ".secure"
    output_path = vault_path / encrypted_filename

    print(f"Target: {p.name}")
    print(f"Encrypting to: {output_path}")

    try:
        encrypt_file_streaming(p, output_path, master_key)
        print("✅ Encryption Successful.")

        # Add to Database 'files' table
        conn = sqlite3.connect("data/locker.db")
        cursor = conn.cursor()
        cursor.execute("INSERT INTO files (original_name, encrypted_name, file_size) VALUES (?, ?, ?)",
                       (p.name, encrypted_filename, p.stat().st_size))
        conn.commit()
        conn.close()

        # Optional: Delete original
        # os.remove(p)
        print("Original file preserved (uncomment code to delete).")

    except Exception as e:
        print(f"❌ Error: {e}")


def action_decrypt(master_key):
    print("\n--- 🔓 DECRYPT FILE ---")

    # 1. Select the encrypted file from the hidden vault
    vault_path = get_vault_path()
    print(f"Looking in: {vault_path}")
    enc_file_path = gui_select_file("Select a .secure file from your Vault")

    if not enc_file_path or not os.path.exists(enc_file_path):
        print("❌ File not found.")
        return

    p = Path(enc_file_path)

    # 2. Decide where the restored file goes
    print("\nWhere would you like to save the decrypted file?")
    print("1. Desktop")
    print("2. Custom Path (Drag & Drop a folder)")

    loc_choice = input("Select Option (1-2): ")

    if loc_choice == '1':
        save_dir = Path.home() / "Desktop"
    else:
        save_dir = Path(gui_select_folder("Select Destination Folder"))

    # 3. Clean the filename (remove .secure and add RESTORED_ prefix)
    clean_name = p.name.replace(".secure", "")
    output_path = save_dir / f"RESTORED_{clean_name}"

    # 4. Perform Decryption
    try:
        print(f"Unlocking: {p.name}...")
        decrypt_file_streaming(p, output_path, master_key)
        print(f"\n✅ SUCCESS!")
        print(f"Your file is now visible at: {output_path}")

        # Optional: Ask to open the folder
        if platform.system() == 'Darwin':  # macOS
            os.system(f'open "{save_dir}"')

    except Exception as e:
        print(f"❌ Decryption Failed: {e}")


def action_show_details():
    print("\n--- 🕵️‍♂️ SECURITY DETAILS (DEBUG MODE) ---")
    config = get_vault_config()

    print(f"User Salt (Hex):      {config['salt'].hex().upper()}")
    print(f"Token Salt (Hex):     {config['token_salt'].hex().upper()}")

    print(f"\nEncrypted Master Key (via Password):")
    print(f"  {config['enc_master_key_pass'].hex()[:32]}... [Truncated]")

    print(f"\nEncrypted Master Key (via Token):")
    print(f"  {config['enc_master_key_token'].hex()[:32]}... [Truncated]")

    print("\n[NOTE] Use your Recovery Token to decrypt the second blob if you lose your password.")


# --- MAIN LOOP ---

def main():
    # 1. Check if we need to clean up old DB for a fresh test (Optional)
    # if os.path.exists("data/locker.db"): os.remove("data/locker.db")

    # 2. Login / Setup
    master_key = login()

    while True:
        print("\n" + "-" * 30)
        print("   SECURE LOCKER MENU")
        print("-" * 30)
        print("1. Encrypt a File")
        print("2. Decrypt a File")
        print("3. Show Security Details")
        print("4. Exit")

        choice = input("\nSelect Option: ")

        if choice == '1':
            action_encrypt(master_key)
        elif choice == '2':
            action_decrypt(master_key)
        elif choice == '3':
            action_show_details()
        elif choice == '4':
            print("Exiting...")
            break
        else:
            print("Invalid option.")


if __name__ == "__main__":
    main()