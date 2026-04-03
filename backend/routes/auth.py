from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity,
    get_jwt
)
from extensions import db, limiter
from models.user import User
from utils.audit_logger import log_action
import qrcode
import io
import base64
import re

auth_bp = Blueprint("auth", __name__)


# ── Helpers ──────────────────────────────────────────────

def validate_email(email: str) -> bool:
    pattern = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
    return re.match(pattern, email) is not None


def validate_username(username: str) -> bool:
    # Only alphanumeric and underscore, 3-30 chars
    pattern = r'^[a-zA-Z0-9_]{3,30}$'
    return re.match(pattern, username) is not None


# ── Register ─────────────────────────────────────────────

@auth_bp.route("/register", methods=["POST"])
@limiter.limit("5 per minute")
def register():
    try:
        data = request.get_json()

        # Input presence check
        if not data:
            return jsonify({"error": "No data provided", "code": "NO_DATA"}), 400

        username = data.get("username", "").strip()
        email    = data.get("email", "").strip().lower()
        password = data.get("password", "")

        # Input validation
        if not username or not email or not password:
            return jsonify({
                "error": "Username, email and password are required",
                "code": "MISSING_FIELDS"
            }), 400

        if not validate_username(username):
            return jsonify({
                "error": "Username must be 3-30 characters, alphanumeric and underscore only",
                "code": "INVALID_USERNAME"
            }), 400

        if not validate_email(email):
            return jsonify({
                "error": "Invalid email address",
                "code": "INVALID_EMAIL"
            }), 400

        # Check duplicates
        if User.query.filter_by(username=username).first():
            return jsonify({
                "error": "Username already taken",
                "code": "USERNAME_TAKEN"
            }), 409

        if User.query.filter_by(email=email).first():
            return jsonify({
                "error": "Email already registered",
                "code": "EMAIL_TAKEN"
            }), 409

        # Create user
        user = User(username=username, email=email)
        user.set_password(password)  # validates strength + hashes

        db.session.add(user)
        db.session.commit()

        log_action(
            user_id=user.id,
            action="REGISTER",
            resource=f"user:{user.id}",
            status="success",
            details=f"New user registered: {username}"
        )

        access_token = create_access_token(identity=str(user.id))
        
        return jsonify({
            "message": "Account created successfully",
            "data": {
                "access_token": access_token, # Send token to frontend
                "user": user.to_dict()
            }
        }), 201

    except ValueError as e:
        # Password strength validation error
        return jsonify({"error": str(e), "code": "WEAK_PASSWORD"}), 400

    except Exception as e:
        db.session.rollback()
        print(f"REGISTER ERROR: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e), "code": "SERVER_ERROR"}), 500


# ── Login ────────────────────────────────────────────────

@auth_bp.route("/login", methods=["POST"])
# @limiter.limit("10 per minute")
def login():
    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "No data provided", "code": "NO_DATA"}), 400

        email    = data.get("email", "").strip().lower()
        password = data.get("password", "")
        mfa_token = data.get("mfa_token", None)

        if not email or not password:
            return jsonify({
                "error": "Email and password are required",
                "code": "MISSING_FIELDS"
            }), 400

        # Find user
        user = User.query.filter_by(email=email).first()

        # Generic error to prevent user enumeration
        if not user:
            log_action(
                user_id=None,
                action="LOGIN_FAILED",
                resource=f"email:{email}",
                status="failure",
                details="User not found"
            )
            return jsonify({
                "error": "Invalid email or password",
                "code": "INVALID_CREDENTIALS"
            }), 401

        # Check if account is locked
        if user.is_locked():
            log_action(
                user_id=user.id,
                action="LOGIN_BLOCKED",
                resource=f"user:{user.id}",
                status="failure",
                details="Account locked due to failed attempts"
            )
            return jsonify({
                "error": "Account temporarily locked. Try again in 15 minutes.",
                "code": "ACCOUNT_LOCKED"
            }), 423

        # Check if account is active
        if not user.is_active:
            return jsonify({
                "error": "Account is deactivated",
                "code": "ACCOUNT_INACTIVE"
            }), 403

        # Verify password
        if not user.check_password(password):
            user.increment_failed_login()
            log_action(
                user_id=user.id,
                action="LOGIN_FAILED",
                resource=f"user:{user.id}",
                status="failure",
                details=f"Wrong password. Attempt {user.failed_login_attempts}"
            )
            return jsonify({
                "error": "Invalid email or password",
                "code": "INVALID_CREDENTIALS"
            }), 401

        # MFA check
        if user.mfa_enabled:
            if not mfa_token:
                return jsonify({
                    "error": "MFA token required",
                    "code": "MFA_REQUIRED"
                }), 200  # 200 so frontend knows to show MFA input

            if not user.verify_mfa_token(mfa_token):
                log_action(
                    user_id=user.id,
                    action="LOGIN_MFA_FAILED",
                    resource=f"user:{user.id}",
                    status="failure",
                    details="Invalid MFA token"
                )
                return jsonify({
                    "error": "Invalid MFA token",
                    "code": "INVALID_MFA"
                }), 401

        # Success — reset failed attempts
        user.reset_failed_login()

        # Generate tokens
        access_token  = create_access_token(identity=str(user.id))
        refresh_token = create_refresh_token(identity=str(user.id))

        log_action(
            user_id=user.id,
            action="LOGIN_SUCCESS",
            resource=f"user:{user.id}",
            status="success",
            details="User logged in successfully"
        )

        return jsonify({
            "message": "Login successful",
            "data": {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "user": user.to_dict()
            }
        }), 200

    except Exception as e:
        return jsonify({"error": "Login failed", "code": "SERVER_ERROR"}), 500


# ── Refresh Token ─────────────────────────────────────────

@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id))

        if not user or not user.is_active:
            return jsonify({"error": "User not found", "code": "USER_NOT_FOUND"}), 404

        access_token = create_access_token(identity=str(user_id))

        log_action(
            user_id=user.id,
            action="TOKEN_REFRESH",
            resource=f"user:{user.id}",
            status="success"
        )

        return jsonify({
            "message": "Token refreshed",
            "data": {"access_token": access_token}
        }), 200

    except Exception as e:
        return jsonify({"error": "Token refresh failed", "code": "SERVER_ERROR"}), 500


# ── Logout ────────────────────────────────────────────────

@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    try:
        user_id = get_jwt_identity()

        log_action(
            user_id=int(user_id),
            action="LOGOUT",
            resource=f"user:{user_id}",
            status="success"
        )

        # JWT is stateless — client must delete token
        # For production add token to blocklist (Redis)
        return jsonify({"message": "Logged out successfully"}), 200

    except Exception as e:
        return jsonify({"error": "Logout failed", "code": "SERVER_ERROR"}), 500


# ── Get Current User ──────────────────────────────────────

@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id))

        if not user:
            return jsonify({"error": "User not found", "code": "USER_NOT_FOUND"}), 404

        return jsonify({"data": user.to_dict()}), 200

    except Exception as e:
        return jsonify({"error": "Failed to get user", "code": "SERVER_ERROR"}), 500


# ── MFA Setup ─────────────────────────────────────────────

@auth_bp.route("/mfa/setup", methods=["POST"])
@jwt_required()
def mfa_setup():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id))

        if not user:
            return jsonify({"error": "User not found", "code": "USER_NOT_FOUND"}), 404

        if user.mfa_enabled:
            return jsonify({
                "error": "MFA is already enabled",
                "code": "MFA_ALREADY_ENABLED"
            }), 400

        # Generate secret
        secret = user.generate_mfa_secret()
        uri    = user.get_mfa_uri()

        # Generate QR code
        qr = qrcode.make(uri)
        buffer = io.BytesIO()
        qr.save(buffer, format="PNG")
        qr_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

        log_action(
            user_id=user.id,
            action="MFA_SETUP_INITIATED",
            resource=f"user:{user.id}",
            status="success"
        )

        return jsonify({
            "message": "Scan the QR code with your authenticator app",
            "data": {
                "secret": secret,
                "qr_code": f"data:image/png;base64,{qr_base64}"
            }
        }), 200

    except Exception as e:
        return jsonify({"error": "MFA setup failed", "code": "SERVER_ERROR"}), 500


# ── MFA Verify & Enable ───────────────────────────────────

@auth_bp.route("/mfa/verify", methods=["POST"])
@jwt_required()
def mfa_verify():
    try:
        user_id = get_jwt_identity()
        user    = User.query.get(int(user_id))

        if not user:
            return jsonify({"error": "User not found", "code": "USER_NOT_FOUND"}), 404

        data  = request.get_json()
        token = data.get("token", "")

        if not token:
            return jsonify({"error": "Token is required", "code": "MISSING_TOKEN"}), 400

        if not user.verify_mfa_token(token):
            log_action(
                user_id=user.id,
                action="MFA_VERIFY_FAILED",
                resource=f"user:{user.id}",
                status="failure"
            )
            return jsonify({"error": "Invalid token", "code": "INVALID_MFA"}), 401

        # Enable MFA
        user.mfa_enabled = True
        db.session.commit()

        log_action(
            user_id=user.id,
            action="MFA_ENABLED",
            resource=f"user:{user.id}",
            status="success"
        )

        return jsonify({"message": "MFA enabled successfully"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "MFA verification failed", "code": "SERVER_ERROR"}), 500


# ── MFA Disable ───────────────────────────────────────────
@auth_bp.route("/mfa/disable", methods=["POST"])
@jwt_required()
def mfa_disable():
    try:
        user_id  = get_jwt_identity()
        user     = User.query.get(int(user_id))
        data     = request.get_json()
        password = data.get("password", "")

        if not user:
            return jsonify({"error": "User not found", "code": "USER_NOT_FOUND"}), 404

        if not user.check_password(password):
            return jsonify({"error": "Invalid password", "code": "INVALID_PASSWORD"}), 401

        user.mfa_enabled = False
        user.mfa_secret  = None
        db.session.commit()

        log_action(
            user_id=user.id,
            action="MFA_DISABLED",
            resource=f"user:{user.id}",
            status="success"
        )

        return jsonify({"message": "MFA disabled successfully"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to disable MFA", "code": "SERVER_ERROR"}), 500