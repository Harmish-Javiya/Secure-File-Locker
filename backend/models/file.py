from datetime import datetime, timezone
from extensions import db
import secrets


class File(db.Model):
    __tablename__ = "files"

    id              = db.Column(db.Integer, primary_key=True)
    user_id         = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    original_name   = db.Column(db.String(255), nullable=False)
    safe_name       = db.Column(db.String(255), nullable=False)
    file_size       = db.Column(db.BigInteger, nullable=False)
    mime_type       = db.Column(db.String(100), nullable=False)
    extension       = db.Column(db.String(20), nullable=False)
    s3_key          = db.Column(db.String(500), nullable=False, unique=True)
    is_encrypted    = db.Column(db.Boolean, default=True)
    
    # NEW: Stores 'AES-256-GCM', 'ChaCha20', or 'Fernet'
    encryption_algo = db.Column(db.String(50), default="AES-256-GCM", nullable=False)
    
    sha256_hash     = db.Column(db.String(64), nullable=False)
    encryption_iv   = db.Column(db.String(500), nullable=False)
    is_shared       = db.Column(db.Boolean, default=False)
    share_token     = db.Column(db.String(64), unique=True, nullable=True)
    share_expires   = db.Column(db.DateTime, nullable=True)
    is_deleted      = db.Column(db.Boolean, default=False)
    deleted_at      = db.Column(db.DateTime, nullable=True)
    created_at      = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at      = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                                onupdate=lambda: datetime.now(timezone.utc))

    def soft_delete(self):
        self.is_deleted = True
        self.deleted_at = datetime.now(timezone.utc)
        db.session.commit()

    def generate_share_token(self, expires_in_hours: int = 24) -> str:
        from datetime import timedelta
        self.share_token = secrets.token_urlsafe(48)
        self.share_expires = datetime.now(timezone.utc) + timedelta(hours=expires_in_hours)
        self.is_shared = True
        db.session.commit()
        return self.share_token

    def is_share_valid(self) -> bool:
        if not self.is_shared or not self.share_token:
            return False
        if self.share_expires and datetime.now(timezone.utc) > self.share_expires:
            return False
        return True

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "original_name": self.original_name,
            "file_size": self.file_size,
            "mime_type": self.mime_type,
            "extension": self.extension,
            "is_encrypted": self.is_encrypted,
            "encryption_algo": self.encryption_algo or "AES-256-GCM", # Updated to include algo
            "is_shared": self.is_shared,
            "sha256_hash": self.sha256_hash,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }


class AuditLog(db.Model):
    __tablename__ = "audit_logs"

    id          = db.Column(db.Integer, primary_key=True)
    user_id     = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    action      = db.Column(db.String(100), nullable=False)
    resource    = db.Column(db.String(200), nullable=True)
    ip_address  = db.Column(db.String(45), nullable=True)
    user_agent  = db.Column(db.Text, nullable=True)
    status      = db.Column(db.String(20), nullable=False)
    details     = db.Column(db.Text, nullable=True)
    timestamp   = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "action": self.action,
            "resource": self.resource,
            "ip_address": self.ip_address,
            "status": self.status,
            "details": self.details,
            "timestamp": self.timestamp.isoformat() 
        }