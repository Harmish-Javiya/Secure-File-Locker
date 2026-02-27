from datetime import datetime, timezone
from extensions import db
from sqlalchemy import event
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
import pyotp
import secrets

ph = PasswordHasher(
    time_cost=3,
    memory_cost=65536,
    parallelism=2,
    hash_len=32,
    salt_len=16
)


class User(db.Model):
    __tablename__ = "users"

    id            = db.Column(db.Integer, primary_key=True)
    username      = db.Column(db.String(80), unique=True, nullable=False)
    email         = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.Text, nullable=False)

    # MFA
    mfa_secret    = db.Column(db.String(32), nullable=True)
    mfa_enabled   = db.Column(db.Boolean, default=False)

    # Account status
    is_active     = db.Column(db.Boolean, default=True)
    is_admin      = db.Column(db.Boolean, default=False)
    failed_login_attempts = db.Column(db.Integer, default=0)
    locked_until  = db.Column(db.DateTime, nullable=True)

    # Timestamps
    created_at    = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at    = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                              onupdate=lambda: datetime.now(timezone.utc))
    last_login    = db.Column(db.DateTime, nullable=True)

    # Relationships
    files = db.relationship("File", backref="owner", lazy="dynamic",
                        cascade="all, delete-orphan", foreign_keys="File.user_id")
    audit_logs = db.relationship("AuditLog", backref="user", lazy="dynamic",
                             foreign_keys="AuditLog.user_id")

    def set_password(self, password: str):
        """Hash and store password using Argon2."""
        self._validate_password_strength(password)
        self.password_hash = ph.hash(password)

    def check_password(self, password: str) -> bool:
        """Verify password and handle rehashing if needed."""
        try:
            ph.verify(self.password_hash, password)
            # Rehash if parameters have changed
            if ph.check_needs_rehash(self.password_hash):
                self.password_hash = ph.hash(password)
                db.session.commit()
            return True
        except VerifyMismatchError:
            return False

    def is_locked(self) -> bool:
        """Check if account is locked due to failed attempts."""
        if self.locked_until and datetime.now(timezone.utc) < self.locked_until:
            return True
        return False

    def increment_failed_login(self):
        """Increment failed login counter and lock if threshold reached."""
        self.failed_login_attempts += 1
        if self.failed_login_attempts >= 5:
            from datetime import timedelta
            self.locked_until = datetime.now(timezone.utc) + timedelta(minutes=15)
        db.session.commit()

    def reset_failed_login(self):
        """Reset failed login counter on successful login."""
        self.failed_login_attempts = 0
        self.locked_until = None
        self.last_login = datetime.now(timezone.utc)
        db.session.commit()

    def generate_mfa_secret(self) -> str:
        """Generate a new MFA secret for TOTP."""
        self.mfa_secret = pyotp.random_base32()
        db.session.commit()
        return self.mfa_secret

    def get_mfa_uri(self) -> str:
        """Get the OTP auth URI for QR code generation."""
        return pyotp.totp.TOTP(self.mfa_secret).provisioning_uri(
            name=self.email,
            issuer_name="SecureFileLocker"
        )

    def verify_mfa_token(self, token: str) -> bool:
        """Verify a TOTP token."""
        if not self.mfa_secret:
            return False
        totp = pyotp.TOTP(self.mfa_secret)
        return totp.verify(token, valid_window=1)

    @staticmethod
    def _validate_password_strength(password: str):
        """Enforce strong password policy."""
        errors = []
        if len(password) < 12:
            errors.append("Password must be at least 12 characters.")
        if not any(c.isupper() for c in password):
            errors.append("Password must contain an uppercase letter.")
        if not any(c.islower() for c in password):
            errors.append("Password must contain a lowercase letter.")
        if not any(c.isdigit() for c in password):
            errors.append("Password must contain a digit.")
        if not any(c in "!@#$%^&*()_+-=[]{}|;':\",./<>?" for c in password):
            errors.append("Password must contain a special character.")
        if errors:
            raise ValueError(" ".join(errors))

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "mfa_enabled": self.mfa_enabled,
            "is_active": self.is_active,
            "is_admin": self.is_admin,
            "created_at": self.created_at.isoformat(),
            "last_login": self.last_login.isoformat() if self.last_login else None
        }