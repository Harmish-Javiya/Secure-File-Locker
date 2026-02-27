from datetime import datetime, timezone
from flask import request


def log_action(user_id, action: str, resource: str = None,
               status: str = "success", details: str = None):
    """
    Write an audit log entry to the database.
    Call this after every important action.
    """
    from extensions import db
    from models.file import AuditLog

    try:
        # Safely get IP address
        ip_address = request.headers.get("X-Forwarded-For", request.remote_addr)
        if ip_address and "," in ip_address:
            ip_address = ip_address.split(",")[0].strip()

        user_agent = request.headers.get("User-Agent", "unknown")[:500]

        log = AuditLog(
            user_id=user_id,
            action=action,
            resource=resource,
            ip_address=ip_address,
            user_agent=user_agent,
            status=status,
            details=details,
            timestamp=datetime.now(timezone.utc)
        )
        db.session.add(log)
        db.session.commit()

    except Exception as e:
        # Never let logging failure crash the app
        db.session.rollback()
        print(f"[AUDIT LOG ERROR] {e}")