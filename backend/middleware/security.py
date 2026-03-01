from flask import request, g
from functools import wraps
import re
import os


def apply_security_headers(response):
    """
    Apply security headers to every response.
    Network Security + Application Security domain.
    """
    # Prevent clickjacking
    response.headers["X-Frame-Options"] = "DENY"

    # Prevent MIME type sniffing
    response.headers["X-Content-Type-Options"] = "nosniff"

    # Force HTTPS in production
    response.headers["Strict-Transport-Security"] = (
        "max-age=31536000; includeSubDomains; preload"
    )

    # XSS Protection (legacy browsers)
    response.headers["X-XSS-Protection"] = "1; mode=block"

    # Content Security Policy
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: blob:; "
        "font-src 'self'; "
        "connect-src 'self'; "
        "frame-ancestors 'none';"
    )

    # Referrer Policy
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

    # Permissions Policy — disable sensitive browser features
    response.headers["Permissions-Policy"] = (
        "geolocation=(), "
        "microphone=(), "
        "camera=(), "
        "payment=(), "
        "usb=()"
    )

    # Remove server fingerprinting headers
    response.headers.pop("Server", None)
    response.headers.pop("X-Powered-By", None)

    return response


def configure_cors(app):
    """
    Configure CORS — only allow requests from React frontend.
    Network Security domain.
    """
    allowed_origins = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:3000"
    ).split(",")

    @app.after_request
    def add_cors_headers(response):
        origin = request.headers.get("Origin", "")

        if origin in allowed_origins:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = (
                "GET, POST, PUT, DELETE, OPTIONS"
            )
            response.headers["Access-Control-Allow-Headers"] = (
                "Content-Type, Authorization, X-Requested-With"
            )
            response.headers["Access-Control-Max-Age"] = "86400"

        # Handle preflight OPTIONS requests
        if request.method == "OPTIONS":
            response.status_code = 204
            return response

        return response

    return app


def sanitize_string(value: str, max_length: int = 500) -> str:
    """
    Sanitize string input — remove dangerous characters.
    Secure Software Development domain.
    """
    if not isinstance(value, str):
        return ""

    # Remove null bytes
    value = value.replace("\x00", "")

    # Remove control characters
    value = re.sub(r"[\x01-\x1f\x7f]", "", value)

    # Truncate to max length
    value = value[:max_length]

    return value.strip()


def sanitize_request_data(data: dict) -> dict:
    """
    Sanitize all string values in a request dictionary.
    """
    if not isinstance(data, dict):
        return {}

    sanitized = {}
    for key, value in data.items():
        if isinstance(value, str):
            sanitized[key] = sanitize_string(value)
        elif isinstance(value, dict):
            sanitized[key] = sanitize_request_data(value)
        elif isinstance(value, list):
            sanitized[key] = [
                sanitize_string(v) if isinstance(v, str) else v
                for v in value
            ]
        else:
            sanitized[key] = value

    return sanitized


def validate_content_type(allowed_types: list):
    """
    Decorator — validates request Content-Type header.
    Application Security domain.
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if request.method in ["POST", "PUT", "PATCH"]:
                content_type = request.content_type or ""
                if not any(t in content_type for t in allowed_types):
                    from flask import jsonify
                    return jsonify({
                        "error": "Invalid content type",
                        "code": "INVALID_CONTENT_TYPE"
                    }), 415
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def block_suspicious_requests(app):
    """
    Block requests with suspicious patterns.
    Network Security + Application Security domain.
    """
    # Common attack patterns
    SUSPICIOUS_PATTERNS = [
        r"(\.\./){2,}",           # Path traversal
        r"<script.*?>",            # XSS attempts
        r"(union|select|insert|update|delete|drop)\s+",  # SQL injection
        r"(/etc/passwd)",          # Linux file access
        r"(cmd\.exe|powershell)",  # Windows shell
        r"(\||\;|\`)",            # Command injection
    ]

    compiled_patterns = [
        re.compile(p, re.IGNORECASE)
        for p in SUSPICIOUS_PATTERNS
    ]

    @app.before_request
    def check_suspicious():
        # Check URL
        url = request.url or ""
        for pattern in compiled_patterns:
            if pattern.search(url):
                from flask import jsonify
                from utils.audit_logger import log_action
                log_action(
                    user_id=None,
                    action="SUSPICIOUS_REQUEST_BLOCKED",
                    resource=url[:200],
                    status="failure",
                    details=f"Suspicious pattern in URL from {request.remote_addr}"
                )
                return jsonify({
                    "error": "Request blocked",
                    "code": "BLOCKED"
                }), 400

        # Check query parameters
        for key, value in request.args.items():
            for pattern in compiled_patterns:
                if pattern.search(str(value)):
                    from flask import jsonify
                    return jsonify({
                        "error": "Request blocked",
                        "code": "BLOCKED"
                    }), 400

    return app


def require_https(app):
    """
    Redirect HTTP to HTTPS in production.
    Network Security domain.
    """
    @app.before_request
    def enforce_https():
        if os.getenv("FLASK_ENV") == "production":
            if not request.is_secure:
                from flask import redirect
                url = request.url.replace("http://", "https://", 1)
                return redirect(url, code=301)

    return app


def init_security(app):
    """
    Master function — call this in app.py to apply all security.
    Wires everything together.
    """
    # Apply security headers to every response
    app.after_request(apply_security_headers)

    # Configure CORS
    configure_cors(app)

    # Block suspicious requests
    block_suspicious_requests(app)

    # Enforce HTTPS in production
    require_https(app)

    return app