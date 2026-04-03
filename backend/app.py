from flask import Flask, jsonify
from flask_cors import CORS  # Import remains at the top
from config import config
from extensions import db, jwt, limiter
from middleware.security import init_security
import os

# REMOVED: The extra app = Flask(__name__) and CORS(app) that were out here

def create_app(env=None):
    app = Flask(__name__)

    # --- 1. CONFIGURE CORS HERE ---
    # This allows your React app on 5173 to communicate with this Flask app
    CORS(app, resources={r"/api/*": {"origins": "http://localhost:5173"}}, supports_credentials=True)

    # Load config
    env = env or os.getenv("FLASK_ENV", "development")
    app.config.from_object(config[env])

    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    limiter.init_app(app)

    # Import models first
    from models.user import User
    from models.file import File, AuditLog

    # Register blueprints
    from routes.auth import auth_bp
    from routes.files import files_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(files_bp, url_prefix="/api/files")

    # JWT error handlers
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({"error": "Token has expired", "code": "TOKEN_EXPIRED"}), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({"error": "Invalid token", "code": "INVALID_TOKEN"}), 401

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({"error": "Authorization token required", "code": "MISSING_TOKEN"}), 401

    # Global error handlers
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Resource not found"}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({"error": "Method not allowed"}), 405

    @app.errorhandler(413)
    def file_too_large(e):
        return jsonify({"error": "File too large. Maximum size is 100MB"}), 413

    @app.errorhandler(429)
    def rate_limit_exceeded(e):
        return jsonify({"error": "Too many requests. Please slow down."}), 429

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({"error": "Internal server error"}), 500

    # Health check
    @app.route("/api/health")
    def health():
        return jsonify({"status": "ok", "env": env}), 200

    # Apply all security middleware
    # NOTE: If CORS still fails after this, check security.py for header conflicts
    init_security(app)

    return app


if __name__ == "__main__":
    app = create_app()
    # Create tables
    with app.app_context():
        db.create_all()
    # Ensure port 5000 is used
    app.run(host="0.0.0.0", port=5000, debug=app.config.get("DEBUG", True))