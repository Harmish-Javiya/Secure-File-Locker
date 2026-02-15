import sqlite3
from config import DB_PATH


def initialize_db():
    """Creates the tables if they don't exist."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 1. CONFIG TABLE (Stores the Keys)
    # This holds the "Boxes" containing the Master Key
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS vault_config (
            id INTEGER PRIMARY KEY,
            salt BLOB NOT NULL,                 -- User Salt (for password derivation)
            enc_master_key_pass BLOB NOT NULL,  -- BOX 1: Master Key locked by Password
            password_hash BLOB NOT NULL,        -- Quick check for "Is password correct?"

            enc_master_key_token BLOB NOT NULL, -- BOX 2: Master Key locked by Recovery Token
            token_salt BLOB NOT NULL            -- Salt for Token KDF
        )
    ''')

    # 2. FILES TABLE (Stores file metadata)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            original_name TEXT NOT NULL,
            encrypted_name TEXT NOT NULL,
            file_size INTEGER,
            date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()


def save_vault_config(salt, enc_mk_pass, pass_hash, enc_mk_token, token_salt):
    """Saves the initial encryption setup."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Reset config (We support only 1 user for now, so clear old data)
    cursor.execute("DELETE FROM vault_config")

    cursor.execute('''
        INSERT INTO vault_config 
        (salt, enc_master_key_pass, password_hash, enc_master_key_token, token_salt)
        VALUES (?, ?, ?, ?, ?)
    ''', (salt, enc_mk_pass, pass_hash, enc_mk_token, token_salt))

    conn.commit()
    conn.close()


def get_vault_config():
    """
    Retrieves the vault configuration so the user can log in.
    Returns a dictionary-like object (Row) containing the salts and encrypted keys.
    """
    conn = sqlite3.connect(DB_PATH)

    # CRITICAL: This allows us to access columns by name (e.g., row['salt'])
    conn.row_factory = sqlite3.Row

    cursor = conn.cursor()
    cursor.execute("SELECT * FROM vault_config WHERE id = 1")
    result = cursor.fetchone()

    conn.close()
    return result