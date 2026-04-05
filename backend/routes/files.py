from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db, limiter
from models.user import User
from models.file import File, AuditLog
from utils.encryption import (
    encrypt_file, decrypt_file,
    compute_sha256, verify_file_integrity,
    encode_bytes, decode_bytes
)
from utils.audit_logger import log_action
import os
import io
import secrets
import mimetypes
from flask import Response, stream_with_context
from werkzeug.utils import secure_filename

files_bp = Blueprint("files", __name__)

BLOCKED_EXTENSIONS = {
    "exe", "bat", "cmd", "com", "scr", "pif", "msi", "msp",
    "ps1", "vbs", "vbe", "js", "jse", "wsf", "wsh", "hta",
    "sh", "bash", "zsh", "fish", "csh",
    "php", "asp", "aspx", "jsp", "cgi", "pl",
    "dll", "sys", "drv", "ocx", "reg",
    "app", "dmg", "pkg",
    "jar", "py", "rb", "go"
}

def allowed_file(filename: str) -> bool:
    if "." not in filename:
        return False
    ext = filename.rsplit(".", 1)[1].lower()
    return ext not in BLOCKED_EXTENSIONS

MAGIC_BYTES = {
    b"\x25\x50\x44\x46": "pdf",
    b"\x89\x50\x4e\x47": "png",
    b"\xff\xd8\xff":     "jpg",
    b"\x50\x4b\x03\x04": "zip",
}

def validate_magic_bytes(file_bytes: bytes) -> bool:
    for magic, _ in MAGIC_BYTES.items():
        if file_bytes.startswith(magic):
            return True
    return False


def sanitize_filename(filename: str) -> str:
    filename = secure_filename(filename)
    name, ext = os.path.splitext(filename)
    name = name.replace(".", "_")
    return f"{name}{ext}"


def get_file_or_404(file_id: int, user_id: int):
    return File.query.filter_by(
        id=file_id,
        user_id=user_id,
        is_deleted=False
    ).first()

from flask_jwt_extended import create_access_token
from datetime import timedelta

@files_bp.route("/upload/extend-session", methods=["POST"])
@jwt_required()
def extend_session():
    user_id = get_jwt_identity()
    new_token = create_access_token(
        identity=str(user_id),
        expires_delta=timedelta(hours=2)
    )
    return jsonify({"access_token": new_token}), 200

@files_bp.route("/upload", methods=["POST"])
@jwt_required()
@limiter.limit("20 per hour",exempt_when=lambda: request.form.get("instant_encrypt") == "true")
def upload_file():
    try:
        user_id = int(get_jwt_identity())
        user = db.session.get(User, user_id)

        print("FILES:", request.files)        # ← ADD
        print("FORM:", request.form)          # ← ADD
        print("FILENAME:", request.files.get("file"))  # ← ADD

        if not user or not getattr(user, "is_active", True):
            return jsonify({"error": "User not found or inactive"}), 404

        if "file" not in request.files:
            return jsonify({"error": "No file provided"}), 400

        uploaded_file = request.files["file"]
        is_instant = request.form.get("instant_encrypt") == "true"
        selected_algo = request.form.get("algo", "AES-256-GCM")

        if not uploaded_file.filename or not allowed_file(uploaded_file.filename):
            return jsonify({"error": "Invalid file type"}), 400

        # --- BRANCH 1: INSTANT ENCRYPT (Direct Streaming) ---
        if is_instant:
            log_action(user_id, "INSTANT_ENCRYPT_START", resource=uploaded_file.filename, status="success")
            
            original_name = uploaded_file.filename
            password      = request.form.get("password", "")
            
            if not password:
                return jsonify({"error": "Password required for self-decrypting file"}), 400

            salt = os.urandom(16)
            iv   = os.urandom(12)
            
            from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
            from cryptography.hazmat.primitives import hashes
            from cryptography.hazmat.backends import default_backend
            from cryptography.hazmat.primitives.ciphers.aead import AESGCM, ChaCha20Poly1305
            from cryptography.fernet import Fernet
            import base64, struct, zipfile, io as _io

            kdf = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=600000, backend=default_backend())
            key = kdf.derive(password.encode())

            # Check file size without loading into RAM
            # ADD these lines:
            file_stream = uploaded_file.stream
            file_size = request.content_length
            if not file_size:
                file_stream.seek(0, 2)
                file_size = file_stream.tell()
                file_stream.seek(0)
            else:
                file_stream.seek(0)

            print(f"File size: {file_size / 1024 / 1024:.1f} MB")
            print(f"Is large file: {file_size > 200 * 1024 * 1024}")

            if file_size > 200 * 1024 * 1024:
                CHUNK = 64 * 1024 * 1024

                if selected_algo == "AES-256-GCM":
                    cipher = AESGCM(key)
                elif selected_algo == "ChaCha20":
                    cipher = ChaCha20Poly1305(key)

                # Write directly to temp file — never build in memory
                import tempfile
                tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".enc")

                tmp.write(salt)
                tmp.write(iv)
                chunk_count_pos = tmp.tell()
                tmp.write(struct.pack(">I", 0))  # placeholder

                counter    = 1
                num_chunks = 0
                while True:
                    chunk = file_stream.read(CHUNK)
                    if not chunk:
                        break
                    if selected_algo == "Fernet":
                        f = Fernet(base64.urlsafe_b64encode(key))
                        enc_chunk = f.encrypt(chunk)
                    else:
                        chunk_nonce = (int.from_bytes(iv, 'big') + counter).to_bytes(12, 'big')
                        enc_chunk   = cipher.encrypt(chunk_nonce, chunk, None)
                    tmp.write(struct.pack(">I", len(enc_chunk)))
                    tmp.write(enc_chunk)
                    counter    += 1
                    num_chunks += 1

                # Write real chunk count
                tmp.seek(chunk_count_pos)
                tmp.write(struct.pack(">I", num_chunks))
                tmp.close()

                decryptor_script = f'''#!/usr/bin/env python3
                """
                Self-contained decryptor — run with: python decrypt.py
                Algorithm: {selected_algo}
                """
                import sys, os, struct, subprocess, getpass

                try:
                    from cryptography.hazmat.primitives.ciphers.aead import AESGCM, ChaCha20Poly1305
                    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
                    from cryptography.hazmat.primitives import hashes
                    from cryptography.hazmat.backends import default_backend
                    from cryptography.fernet import Fernet
                except ImportError:
                    print("Installing required library...")
                    subprocess.check_call([sys.executable, "-m", "pip", "install", "cryptography"])
                    from cryptography.hazmat.primitives.ciphers.aead import AESGCM, ChaCha20Poly1305
                    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
                    from cryptography.hazmat.primitives import hashes
                    from cryptography.hazmat.backends import default_backend
                    from cryptography.fernet import Fernet

                ALGO = "{selected_algo}"

                def derive_key(password, salt):
                    kdf = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=600000, backend=default_backend())
                    return kdf.derive(password.encode())

                def decrypt_file(enc_path, password, output_path):
                    with open(enc_path, "rb") as f:
                        data = f.read()

                    salt       = data[:16]
                    iv         = data[16:28]
                    num_chunks = struct.unpack(">I", data[28:32])[0]
                    key        = derive_key(password, salt)

                    if ALGO == "AES-256-GCM":
                        cipher = AESGCM(key)
                    elif ALGO == "ChaCha20":
                        cipher = ChaCha20Poly1305(key)

                    pos = 32
                    with open(output_path, "wb") as out:
                        for i in range(num_chunks):
                            chunk_len  = struct.unpack(">I", data[pos:pos+4])[0]
                            pos       += 4
                            chunk_data = data[pos:pos+chunk_len]
                            pos       += chunk_len
                            chunk_nonce = (int.from_bytes(iv, "big") + i + 1).to_bytes(12, "big")
                            if ALGO == "Fernet":
                                import base64
                                f = Fernet(base64.urlsafe_b64encode(key))
                                decrypted_chunk = f.decrypt(chunk_data)
                            else:
                                decrypted_chunk = cipher.decrypt(chunk_nonce, chunk_data, None)
                            out.write(decrypted_chunk)

                    print(f"Decrypted successfully -> {{output_path}}")

                if __name__ == "__main__":
                    script_dir = os.path.dirname(os.path.abspath(__file__))
                    enc_files  = [f for f in os.listdir(script_dir) if f.endswith(".enc")]

                    if not enc_files:
                        enc_path = input("Enter path to .enc file: ").strip()
                    else:
                        enc_path = os.path.join(script_dir, enc_files[0])
                        print(f"Found: {{enc_path}}")

                    if not os.path.exists(enc_path):
                        print(f"File not found: {{enc_path}}")
                        sys.exit(1)

                    password    = getpass.getpass("Enter decryption password: ")
                    output_name = os.path.basename(enc_path).replace(".enc", "")
                    output_path = os.path.join(script_dir, output_name)

                    print("Decrypting...")
                    decrypt_file(enc_path, password, output_path)
                '''
                readme = f"""# Encrypted File: {original_name}

                    ## How to Decrypt

                    1. Extract this zip file
                    2. Make sure Python 3.6+ is installed (https://python.org)
                    3. Place the .enc file and decrypt.py in the same folder
                    4. Run: python decrypt.py
                    5. Enter your decryption password when prompted
                    6. The decrypted file will appear in the same folder

                    ## Algorithm
                    {selected_algo}

                    ## Notes
                    - The decrypt.py script will auto-install the required 'cryptography' library if not present
                    - Keep your password safe — there is no way to recover the file without it
                    - This file was encrypted with zero-knowledge encryption — the server never stored your file
                """
                # Stream zip without loading into RAM
                tmp_name = tmp.name
                def generate_zip():
                    try:
                        zip_tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".zip")
                        zip_tmp.close()
                        with zipfile.ZipFile(zip_tmp.name, "w", zipfile.ZIP_STORED) as zf:
                            zf.writestr("README.md", readme)
                            zf.writestr("decrypt.py", decryptor_script)
                            zf.write(tmp_name, f"{original_name}.enc")
                        with open(zip_tmp.name, "rb") as f:
                            while True:
                                chunk = f.read(1024 * 1024)
                                if not chunk:
                                    break
                                yield chunk
                    finally:
                        os.unlink(tmp_name)
                        os.unlink(zip_tmp.name)

                response = Response(
                    stream_with_context(generate_zip()),
                    mimetype="application/zip"
                )
                response.headers["Content-Disposition"] = f"attachment; filename=\"{original_name}_encrypted.zip\""
                print("RETURNING ZIP")
                return response
            else:
                # ── SMALL FILE (<=200MB): self-decrypting HTML ───────────────
                file_bytes = file_stream.read()
                print("RETURNING HTML")

                if selected_algo == "AES-256-GCM":
                    encrypted = AESGCM(key).encrypt(iv, file_bytes, None)
                elif selected_algo == "ChaCha20":
                    encrypted = ChaCha20Poly1305(key).encrypt(iv, file_bytes, None)
                elif selected_algo == "Fernet":
                    f         = Fernet(base64.urlsafe_b64encode(key))
                    encrypted = f.encrypt(file_bytes)
                    iv        = b"fernet_internal"

                enc_b64  = base64.b64encode(encrypted).decode()
                salt_b64 = base64.b64encode(salt).decode()
                iv_b64   = base64.b64encode(iv).decode()

                html = f"""<!DOCTYPE html>
                    <html lang="en">
                    <head>
                    <meta charset="UTF-8">
                    <title>Decrypt: {original_name}</title>
                    <style>
                    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
                    body {{
                        font-family: system-ui, sans-serif;
                        background: #0f0f0f;
                        color: #e0e0e0;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        min-height: 100vh;
                    }}
                    .card {{
                        background: #1a1a1a;
                        border: 1px solid #2a2a2a;
                        border-radius: 12px;
                        padding: 2rem;
                        width: 100%;
                        max-width: 420px;
                        box-shadow: 0 8px 32px rgba(0,0,0,0.4);
                    }}
                    h2 {{ font-size: 1.2rem; margin-bottom: 0.4rem; color: #fff; }}
                    p.sub {{ font-size: 0.85rem; color: #888; margin-bottom: 1.5rem; }}
                    input {{
                        width: 100%;
                        padding: 0.75rem 1rem;
                        border-radius: 8px;
                        border: 1px solid #333;
                        background: #111;
                        color: #fff;
                        font-size: 1rem;
                        margin-bottom: 1rem;
                        outline: none;
                    }}
                    input:focus {{ border-color: #555; }}
                    .algo-badge {{
                        display: inline-block;
                        padding: 0.25rem 0.75rem;
                        border-radius: 999px;
                        font-size: 0.75rem;
                        font-weight: 600;
                        margin-bottom: 1.5rem;
                        background: #2a2a2a;
                        color: #aaa;
                        border: 1px solid #333;
                    }}
                    button {{
                        width: 100%;
                        padding: 0.75rem;
                        border-radius: 8px;
                        border: none;
                        background: #fff;
                        color: #000;
                        font-size: 1rem;
                        font-weight: 600;
                        cursor: pointer;
                        transition: opacity 0.2s;
                    }}
                    button:hover {{ opacity: 0.85; }}
                    button:disabled {{ opacity: 0.4; cursor: not-allowed; }}
                    .status {{
                        margin-top: 1rem;
                        font-size: 0.85rem;
                        text-align: center;
                        min-height: 1.2rem;
                        color: #888;
                    }}
                    .error {{ color: #ff6b6b; }}
                    .success {{ color: #6bffb8; }}
                    .filename {{
                        font-size: 0.8rem;
                        color: #555;
                        margin-bottom: 1rem;
                        word-break: break-all;
                    }}
                    </style>
                    </head>
                    <body>
                    <div class="card">
                    <h2>🔐 Encrypted File</h2>
                    <p class="sub">Self-decrypting. No internet required.</p>
                    <div class="filename">📄 {original_name}</div>
                    <div class="algo-badge">🔒 {selected_algo}</div>
                    <input type="password" id="pwd" placeholder="Enter decryption password" />
                    <button id="btn" onclick="decrypt()">Decrypt & Download</button>
                    <div class="status" id="status"></div>
                    </div>

                    <script>
                    const ALGO      = "{selected_algo}";
                    const ENC_B64   = "{enc_b64}";
                    const SALT_B64  = "{salt_b64}";
                    const IV_B64    = "{iv_b64}";
                    const FILENAME  = "{original_name}";
                    const ITERS     = 600000;

                    function b64ToBytes(b64) {{
                    const bin = atob(b64);
                    const arr = new Uint8Array(bin.length);
                    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
                    return arr;
                    }}

                    function bytesToB64url(bytes) {{
                    let bin = "";
                    for (const b of bytes) bin += String.fromCharCode(b);
                    return btoa(bin).replace(/\\+/g, "-").replace(/\\//g, "_").replace(/=/g, "");
                    }}

                    async function deriveKey(password, salt) {{
                    const pwdKey = await crypto.subtle.importKey(
                        "raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]
                    );
                    const bits = await crypto.subtle.deriveBits(
                        {{ name: "PBKDF2", salt, iterations: ITERS, hash: "SHA-256" }},
                        pwdKey, 256
                    );
                    return new Uint8Array(bits);
                    }}

                    async function decryptAES(keyBytes, iv, enc) {{
                    const key = await crypto.subtle.importKey("raw", keyBytes, {{ name: "AES-GCM" }}, false, ["decrypt"]);
                    const dec = await crypto.subtle.decrypt({{ name: "AES-GCM", iv }}, key, enc);
                    return new Uint8Array(dec);
                    }}

                    function rotl(a, b) {{ return (a << b) | (a >>> (32 - b)); }}
                    function quarterRound(x, a, b, c, d) {{
                    x[a] ^= rotl(x[b] + x[d] | 0, 7);  x[c] ^= rotl(x[d] + x[a] | 0, 9);
                    x[b] ^= rotl(x[a] + x[c] | 0, 13); x[d] ^= rotl(x[c] + x[b] | 0, 18);
                    }}
                    function chacha20Block(key, counter, nonce) {{
                    const c = new Uint32Array([
                        0x61707865, 0x3320646e, 0x79622d32, 0x6b206574,
                        ...Array.from({{length:8}}, (_,i) => (key[i*4]|(key[i*4+1]<<8)|(key[i*4+2]<<16)|(key[i*4+3]<<24))>>>0),
                        counter >>> 0,
                        ...[0,4,8].map(i => (nonce[i]|(nonce[i+1]<<8)|(nonce[i+2]<<16)|(nonce[i+3]<<24))>>>0)
                    ]);
                    const x = new Uint32Array(c);
                    for (let i = 0; i < 10; i++) {{
                        quarterRound(x,0,4,8,12);  quarterRound(x,1,5,9,13);
                        quarterRound(x,2,6,10,14); quarterRound(x,3,7,11,15);
                        quarterRound(x,0,5,10,15); quarterRound(x,1,6,11,12);
                        quarterRound(x,2,7,8,13);  quarterRound(x,3,4,9,14);
                    }}
                    const out = new Uint8Array(64);
                    for (let i = 0; i < 16; i++) {{
                        const v = (x[i] + c[i]) >>> 0;
                        out[i*4]   =  v        & 0xff;
                        out[i*4+1] = (v >>  8) & 0xff;
                        out[i*4+2] = (v >> 16) & 0xff;
                        out[i*4+3] = (v >> 24) & 0xff;
                    }}
                    return out;
                    }}

                    function poly1305(key, msg) {{
                    const r = new Uint8Array(key.slice(0,16));
                    const s = new Uint8Array(key.slice(16,32));
                    r[3]&=15;r[7]&=15;r[11]&=15;r[15]&=15;
                    r[4]&=252;r[8]&=252;r[12]&=252;
                    let h0=0,h1=0,h2=0,h3=0,h4=0;
                    const rr0=(r[0]|(r[1]<<8)|(r[2]<<16)|(r[3]<<24))>>>0;
                    const rr1=(r[4]|(r[5]<<8)|(r[6]<<16)|(r[7]<<24))>>>0;
                    const rr2=(r[8]|(r[9]<<8)|(r[10]<<16)|(r[11]<<24))>>>0;
                    const rr3=(r[12]|(r[13]<<8)|(r[14]<<16)|(r[15]<<24))>>>0;
                    for(let i=0;i<msg.length;i+=16){{
                        const chunk=msg.slice(i,i+16);
                        const n=new Uint8Array(17);n.set(chunk);n[chunk.length]=1;
                        h0+=( n[0]|(n[1]<<8)|(n[2]<<16)|(n[3]<<24))>>>0;
                        h1+=((n[4]|(n[5]<<8)|(n[6]<<16)|(n[7]<<24))>>>0);
                        h2+=((n[8]|(n[9]<<8)|(n[10]<<16)|(n[11]<<24))>>>0);
                        h3+=((n[12]|(n[13]<<8)|(n[14]<<16)|(n[15]<<24))>>>0);
                        h4+=n[16];
                        const d0=Math.imul(h0,rr0)+Math.imul(h1*5,rr3)+Math.imul(h2*5,rr2)+Math.imul(h3*5,rr1)+Math.imul(h4*5,rr0);
                        h0=d0>>>0; h4+=(d0/0x100000000)|0;
                    }}
                    let f=(h4>>>2)*5; h4&=3; h0=(h0+f)>>>0;
                    const ss0=(s[0]|(s[1]<<8)|(s[2]<<16)|(s[3]<<24))>>>0;
                    const ss1=(s[4]|(s[5]<<8)|(s[6]<<16)|(s[7]<<24))>>>0;
                    const ss2=(s[8]|(s[9]<<8)|(s[10]<<16)|(s[11]<<24))>>>0;
                    const ss3=(s[12]|(s[13]<<8)|(s[14]<<16)|(s[15]<<24))>>>0;
                    h0=(h0+ss0)>>>0; h1=(h1+ss1)>>>0; h2=(h2+ss2)>>>0; h3=(h3+ss3)>>>0;
                    const tag=new Uint8Array(16);
                    tag[0]=h0;tag[1]=h0>>8;tag[2]=h0>>16;tag[3]=h0>>24;
                    tag[4]=h1;tag[5]=h1>>8;tag[6]=h1>>16;tag[7]=h1>>24;
                    tag[8]=h2;tag[9]=h2>>8;tag[10]=h2>>16;tag[11]=h2>>24;
                    tag[12]=h3;tag[13]=h3>>8;tag[14]=h3>>16;tag[15]=h3>>24;
                    return tag;
                    }}

                    async function decryptChaCha(keyBytes, iv, enc) {{
                    const ciphertext = enc.slice(0, enc.length - 16);
                    const tag        = enc.slice(enc.length - 16);
                    const polyBlock  = chacha20Block(keyBytes, 0, iv);
                    const polyKey    = polyBlock.slice(0, 32);
                    const expectedTag = poly1305(polyKey, ciphertext);
                    let tagOk = true;
                    for (let i = 0; i < 16; i++) if (tag[i] !== expectedTag[i]) {{ tagOk = false; break; }}
                    if (!tagOk) throw new Error("Tag mismatch — wrong password or corrupted.");
                    const out = new Uint8Array(ciphertext.length);
                    for (let i = 0; i < ciphertext.length; i += 64) {{
                        const block = chacha20Block(keyBytes, 1 + (i / 64 | 0), iv);
                        const chunk = ciphertext.slice(i, i + 64);
                        for (let j = 0; j < chunk.length; j++) out[i + j] = chunk[j] ^ block[j];
                    }}
                    return out;
                    }}

                    async function decryptFernet(keyBytes, encB64url) {{
                    function b64urlToBytes(s) {{
                        s = s.replace(/-/g,"+").replace(/_/g,"/");
                        while(s.length%4) s+="=";
                        return b64ToBytes(s);
                    }}
                    const signingKey = keyBytes.slice(0, 16);
                    const encKey     = keyBytes.slice(16, 32);
                    const token      = b64urlToBytes(encB64url);
                    const iv         = token.slice(9, 25);
                    const cipher     = token.slice(25, token.length - 32);
                    const hmac       = token.slice(token.length - 32);
                    const msgToSign  = token.slice(0, token.length - 32);
                    const hmacKey    = await crypto.subtle.importKey("raw", signingKey, {{name:"HMAC",hash:"SHA-256"}}, false, ["verify"]);
                    const valid      = await crypto.subtle.verify("HMAC", hmacKey, hmac, msgToSign);
                    if (!valid) throw new Error("HMAC mismatch — wrong password or corrupted.");
                    const aesKey     = await crypto.subtle.importKey("raw", encKey, {{name:"AES-CBC"}}, false, ["decrypt"]);
                    const dec        = await crypto.subtle.decrypt({{name:"AES-CBC", iv}}, aesKey, cipher);
                    return new Uint8Array(dec);
                    }}

                    async function decrypt() {{
                    const btn    = document.getElementById("btn");
                    const status = document.getElementById("status");
                    const pwd    = document.getElementById("pwd").value;
                    if (!pwd) {{ status.innerHTML = '<span class="error">Enter a password.</span>'; return; }}
                    btn.disabled = true;
                    status.textContent = "Deriving key...";
                    try {{
                        const enc      = b64ToBytes(ENC_B64);
                        const salt     = b64ToBytes(SALT_B64);
                        const iv       = b64ToBytes(IV_B64);
                        status.textContent = "Decrypting...";
                        const keyBytes = await deriveKey(pwd, salt);
                        let decrypted;
                        if (ALGO === "AES-256-GCM") {{
                        decrypted = await decryptAES(keyBytes, iv, enc);
                        }} else if (ALGO === "ChaCha20") {{
                        decrypted = await decryptChaCha(keyBytes, iv, enc);
                        }} else if (ALGO === "Fernet") {{
                        decrypted = await decryptFernet(keyBytes, ENC_B64);
                        }}
                        const blob = new Blob([decrypted]);
                        const a    = document.createElement("a");
                        a.href     = URL.createObjectURL(blob);
                        a.download = FILENAME;
                        a.click();
                        URL.revokeObjectURL(a.href);
                        status.innerHTML = '<span class="success">✓ Decrypted & downloaded!</span>';
                    }} catch(e) {{
                        console.error(e);
                        status.innerHTML = '<span class="error">✗ Wrong password or corrupted file.</span>';
                    }} finally {{
                        btn.disabled = false;
                    }}
                    }}

                    document.getElementById("pwd").addEventListener("keydown", e => {{
                    if (e.key === "Enter") decrypt();
                    }});
                    </script>
                    </body>
                    </html>"""

                response = Response(html, mimetype="text/html")
                response.headers["Content-Disposition"] = f"attachment; filename=\"{original_name}.html\""
                return response
    
        # --- BRANCH 2: CLOUD STORAGE ---
        file_bytes = uploaded_file.read()
        if len(file_bytes) > 100 * 1024 * 1024:
            return jsonify({"error": "Cloud storage limit 100MB"}), 413

        if not validate_magic_bytes(file_bytes):
            return jsonify({"error": "File content does not match its extension"}), 400
        
        encrypted_data, nonce, salt = encrypt_file(file_bytes, user_id, algo=selected_algo)
        sha256_hash = compute_sha256(file_bytes)
        
        unique_key = secrets.token_urlsafe(32)
        upload_dir = os.path.join(os.path.dirname(__file__), "..", "uploads")
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, f"{unique_key}.enc")

        with open(file_path, "wb") as f:
            f.write(encrypted_data)

        new_file = File(
            user_id=user_id,
            original_name=uploaded_file.filename,
            safe_name=sanitize_filename(uploaded_file.filename),
            file_size=len(file_bytes),
            mime_type=mimetypes.guess_type(uploaded_file.filename)[0] or "application/octet-stream",
            extension=uploaded_file.filename.rsplit(".", 1)[1].lower(),
            s3_key=f"users/{user_id}/files/{unique_key}.enc",
            encryption_algo=selected_algo,
            sha256_hash=sha256_hash,
            encryption_iv=encode_bytes(nonce) + ":" + encode_bytes(salt)
        )

        db.session.add(new_file)
        db.session.commit()
        return jsonify({"message": "Success", "data": new_file.to_dict()}), 201

    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    
    
@files_bp.route("/", methods=["GET"])
@jwt_required()
def list_files():
    try:
        user_id = int(get_jwt_identity())
        # Make sure this query matches your model
        files = File.query.filter_by(user_id=user_id, is_deleted=False).order_by(File.created_at.desc()).all()
        
        return jsonify({
            "message": "Files retrieved successfully",
            "data": [f.to_dict() for f in files]
        }), 200
    except Exception as e:
        print(f"Error in list_files: {str(e)}") # This will show in your terminal
        return jsonify({"error": "Internal Server Error", "details": str(e)}), 500


@files_bp.route("/download/<int:file_id>", methods=["GET"])
@jwt_required()
def download_file(file_id):
    try:
        user_id = int(get_jwt_identity())
        file    = get_file_or_404(file_id, user_id)

        if not file:
            log_action(user_id=user_id, action="FILE_DOWNLOAD_FAILED",
                       resource=f"file:{file_id}", status="failure",
                       details="File not found or access denied")
            return jsonify({"error": "File not found", "code": "FILE_NOT_FOUND"}), 404

        unique_key = file.s3_key.split("/")[-1].replace(".enc", "")
        upload_dir = os.path.join(os.path.dirname(__file__), "..", "uploads")
        file_path  = os.path.join(upload_dir, f"{unique_key}.enc")

        if not os.path.exists(file_path):
            return jsonify({"error": "File not found on disk", "code": "FILE_MISSING"}), 404

        with open(file_path, "rb") as f:
            encrypted_data = f.read()

        iv_parts       = file.encryption_iv.split(":")
        nonce          = decode_bytes(iv_parts[0])
        salt           = decode_bytes(iv_parts[1])
        
        # USE THE ALGO STORED IN THE DATABASE FOR DECRYPTION
        decrypted_data = decrypt_file(encrypted_data, nonce, salt, user_id, algo=file.encryption_algo)

        if not verify_file_integrity(decrypted_data, file.sha256_hash):
            log_action(user_id=user_id, action="FILE_INTEGRITY_FAILED",
                       resource=f"file:{file_id}", status="failure",
                       details="SHA-256 hash mismatch — file may be tampered")
            return jsonify({"error": "File integrity check failed",
                            "code": "INTEGRITY_ERROR"}), 500

        log_action(user_id=user_id, action="FILE_DOWNLOAD",
                   resource=f"file:{file_id}", status="success",
                   details=f"Downloaded: {file.original_name}")

        return send_file(
            io.BytesIO(decrypted_data),
            mimetype      = file.mime_type,
            as_attachment = True,
            download_name = file.original_name
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Download failed", "code": "SERVER_ERROR"}), 500


@files_bp.route("/delete/<int:file_id>", methods=["DELETE"])
@jwt_required()
def delete_file(file_id):
    try:
        user_id = int(get_jwt_identity())
        file    = get_file_or_404(file_id, user_id)

        if not file:
            return jsonify({"error": "File not found", "code": "FILE_NOT_FOUND"}), 404

        file.soft_delete()

        log_action(user_id=user_id, action="FILE_DELETE",
                   resource=f"file:{file_id}", status="success",
                   details=f"Deleted: {file.original_name}")

        return jsonify({"message": "File deleted successfully"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Delete failed", "code": "SERVER_ERROR"}), 500


@files_bp.route("/share/<int:file_id>", methods=["POST"])
@jwt_required()
def share_file(file_id):
    try:
        user_id          = int(get_jwt_identity())
        data             = request.get_json(silent=True) or {}
        expires_in_hours = data.get("expires_in_hours", 24)

        if not isinstance(expires_in_hours, int) or not (1 <= expires_in_hours <= 168):
            return jsonify({"error": "expires_in_hours must be between 1 and 168",
                            "code": "INVALID_EXPIRY"}), 400

        file = get_file_or_404(file_id, user_id)
        if not file:
            return jsonify({"error": "File not found", "code": "FILE_NOT_FOUND"}), 404

        share_token = file.generate_share_token(expires_in_hours)

        log_action(user_id=user_id, action="FILE_SHARE",
                   resource=f"file:{file_id}", status="success",
                   details=f"Shared for {expires_in_hours} hours")

        return jsonify({
            "message": "Share link generated",
            "data": {
                "share_token": share_token,
                "share_url"  : f"/api/files/shared/{share_token}",
                "expires_in" : f"{expires_in_hours} hours"
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Share failed", "details": str(e), "code": "SERVER_ERROR"}), 500

@files_bp.route("/shared/<string:token>", methods=["GET"])
def access_shared_file(token):
    try:
        file = File.query.filter_by(share_token=token, is_deleted=False).first()

        if not file or not file.is_share_valid():
            return jsonify({"error": "Share link invalid or expired",
                            "code": "INVALID_SHARE"}), 404

        unique_key = file.s3_key.split("/")[-1].replace(".enc", "")
        upload_dir = os.path.join(os.path.dirname(__file__), "..", "uploads")
        file_path  = os.path.join(upload_dir, f"{unique_key}.enc")

        with open(file_path, "rb") as f:
            encrypted_data = f.read()

        iv_parts       = file.encryption_iv.split(":")
        nonce          = decode_bytes(iv_parts[0])
        salt           = decode_bytes(iv_parts[1])
        
        # USE STORED ALGO FOR SHARED ACCESS AS WELL
        decrypted_data = decrypt_file(encrypted_data, nonce, salt, file.user_id, algo=file.encryption_algo)

        log_action(user_id=None, action="FILE_SHARED_ACCESS",
                   resource=f"file:{file.id}", status="success",
                   details=f"Shared file accessed: {file.original_name}")

        return send_file(
            io.BytesIO(decrypted_data),
            mimetype      = file.mime_type,
            as_attachment = True,
            download_name = file.original_name
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Failed to access shared file", "code": "SERVER_ERROR"}), 500


@files_bp.route("/<int:file_id>", methods=["GET"])
@jwt_required()
def file_info(file_id):
    try:
        user_id = int(get_jwt_identity())
        file    = get_file_or_404(file_id, user_id)

        if not file:
            return jsonify({"error": "File not found", "code": "FILE_NOT_FOUND"}), 404

        return jsonify({"data": file.to_dict()}), 200

    except Exception as e:
        return jsonify({"error": "Failed to get file info", "code": "SERVER_ERROR"}), 500