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
from werkzeug.utils import secure_filename

files_bp = Blueprint("files", __name__)

ALLOWED_EXTENSIONS = {
    "pdf", "txt", "png", "jpg", "jpeg",
    "docx", "xlsx", "zip", "csv"
}

MAGIC_BYTES = {
    b"\x25\x50\x44\x46": "pdf",
    b"\x89\x50\x4e\x47": "png",
    b"\xff\xd8\xff":     "jpg",
    b"\x50\x4b\x03\x04": "zip",
}


def allowed_file(filename: str) -> bool:
    return "." in filename and \
        filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def validate_magic_bytes(file_bytes: bytes) -> bool:
    for magic, _ in MAGIC_BYTES.items():
        if file_bytes.startswith(magic):
            return True
    return True


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


@files_bp.route("/upload", methods=["POST"])
@jwt_required()
@limiter.limit("20 per hour")
def upload_file():
    try:
        user_id = int(get_jwt_identity())
        # FIX 1: Use db.session.get instead of User.query.get
        user = db.session.get(User, user_id)

        # FIX 2: Safely check is_active just in case it doesn't exist on the model
        if not user or not getattr(user, "is_active", True):
            return jsonify({"error": "User not found or inactive", "code": "USER_NOT_FOUND"}), 404

        if "file" not in request.files:
            return jsonify({"error": "No file provided", "code": "NO_FILE"}), 400

        uploaded_file = request.files["file"]

        if not uploaded_file.filename:
            return jsonify({"error": "Empty filename", "code": "EMPTY_FILENAME"}), 400

        if not allowed_file(uploaded_file.filename):
            return jsonify({
                "error": f"File type not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
                "code": "INVALID_FILE_TYPE"
            }), 400

        file_bytes = uploaded_file.read()

        if len(file_bytes) > 100 * 1024 * 1024:
            return jsonify({"error": "File too large. Max 100MB", "code": "FILE_TOO_LARGE"}), 413

        original_name = uploaded_file.filename
        safe_name     = sanitize_filename(original_name)
        extension     = safe_name.rsplit(".", 1)[1].lower()
        mime_type     = mimetypes.guess_type(safe_name)[0] or "application/octet-stream"
        sha256_hash   = compute_sha256(file_bytes)

        encrypted_data, nonce, salt = encrypt_file(file_bytes, user_id)

        unique_key = secrets.token_urlsafe(32)
        s3_key     = f"users/{user_id}/files/{unique_key}.enc"

        upload_dir = os.path.join(os.path.dirname(__file__), "..", "uploads")
        os.makedirs(upload_dir, exist_ok=True)
        file_path  = os.path.join(upload_dir, f"{unique_key}.enc")

        with open(file_path, "wb") as f:
            f.write(encrypted_data)

        new_file = File(
            user_id       = user_id,
            original_name = original_name,
            safe_name     = safe_name,
            file_size     = len(file_bytes),
            mime_type     = mime_type,
            extension     = extension,
            s3_key        = s3_key,
            is_encrypted  = True,
            sha256_hash   = sha256_hash,
            encryption_iv = encode_bytes(nonce) + ":" + encode_bytes(salt)
        )

        db.session.add(new_file)
        db.session.commit()
        
        # FIX 3: Refresh the object so created_at and updated_at are populated for to_dict()
        db.session.refresh(new_file)

        log_action(
            user_id  = user_id,
            action   = "FILE_UPLOAD",
            resource = f"file:{new_file.id}",
            status   = "success",
            details  = f"Uploaded: {original_name} ({len(file_bytes)} bytes)"
        )

        return jsonify({
            "message": "File uploaded and encrypted successfully",
            "data": new_file.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        # EXPOSE THE ERROR FOR DEBUGGING:
        return jsonify({"error": "Upload failed", "details": str(e), "code": "SERVER_ERROR"}), 500
    

@files_bp.route("/", methods=["GET"])
@jwt_required()
def list_files():
    try:
        user_id = int(get_jwt_identity())
        files   = File.query.filter_by(
            user_id=user_id, is_deleted=False
        ).order_by(File.created_at.desc()).all()

        log_action(user_id=user_id, action="FILE_LIST",
                   resource=f"user:{user_id}", status="success")

        return jsonify({
            "message": "Files retrieved successfully",
            "data": [f.to_dict() for f in files]
        }), 200

    except Exception as e:
        return jsonify({"error": "Failed to retrieve files", "code": "SERVER_ERROR"}), 500


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
        decrypted_data = decrypt_file(encrypted_data, nonce, salt, user_id)

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
        
        # FIX 1: Add silent=True to safely handle missing Postman headers
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
        # FIX 2: Expose the error to Postman
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
        decrypted_data = decrypt_file(encrypted_data, nonce, salt, file.user_id)

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