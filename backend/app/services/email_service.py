"""
Email service: password reset and notifications. Uses SMTP from config.
"""

import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import get_settings

settings = get_settings()


async def send_password_reset_email(to_email: str, reset_token: str) -> None:
    """Send password reset link. Link uses frontend_base_url (Tor-friendly)."""
    if not settings.smtp_host:
        # Dev: log only
        print(f"[DEV] Password reset for {to_email}: token={reset_token[:8]}...")
        return
    base = settings.frontend_base_url.rstrip("/")
    link = f"{base}/reset-password?token={reset_token}"
    subject = "TalkaNova – Reset your password"
    body = f"""Hello,

You requested a password reset for TalkaNova.

Click here to set a new password: {link}

This link expires in {settings.password_reset_expire_minutes} minutes.
If you did not request this, ignore this email.

— TalkaNova"""
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from
    msg["To"] = to_email
    msg.attach(MIMEText(body, "plain"))
    await aiosmtplib.send(
        msg,
        hostname=settings.smtp_host,
        port=settings.smtp_port,
        username=settings.smtp_user or None,
        password=settings.smtp_password or None,
        start_tls=True,  # Use STARTTLS for port 587
    )


async def send_help_email(from_name: str, from_email: str, subject: str, message: str) -> None:
    """Send help/support email to admin."""
    support_email = "imadzakxy@gmail.com"
    
    if not settings.smtp_host:
        # Dev: log only
        print(f"[DEV] Help email from {from_name} <{from_email}>: {subject}")
        print(f"[DEV] Message: {message}")
        return
    
    body = f"""New help request from TalkaNova:

From: {from_name} <{from_email}>
Subject: {subject}

Message:
{message}

---
TalkaNova Help System
"""
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"[TalkaNova Help] {subject}"
    msg["From"] = settings.smtp_from
    msg["To"] = support_email
    msg["Reply-To"] = from_email
    msg.attach(MIMEText(body, "plain"))
    
    await aiosmtplib.send(
        msg,
        hostname=settings.smtp_host,
        port=settings.smtp_port,
        username=settings.smtp_user or None,
        password=settings.smtp_password or None,
        start_tls=True,  # Use STARTTLS for port 587
    )
