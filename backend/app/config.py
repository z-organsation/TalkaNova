"""
Application configuration. Load from environment; no secrets in code.
"""

import os
from pathlib import Path
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Central config; validates env vars."""

    # App
    app_name: str = "TalkaNova"
    debug: bool = Field(default=False, description="Enable debug mode")
    api_prefix: str = "/api/v1"

    # Security (default only for dev; set SECRET_KEY in prod)
    secret_key: str = Field(default="dev-secret-change-me-min-32-characters-long", description="JWT & session secret (min 32 chars)")
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 7
    password_reset_expire_minutes: int = 30
    bcrypt_rounds: int = 12

    # CORS (comma-separated origins; * for dev only)
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001"

    # Database
    database_url: str = Field(
        default="sqlite+aiosqlite:///./talkanova.db",
        description="Async SQLAlchemy URL",
    )

    # Google OAuth
    google_client_id: str = Field(default="", description="Google OAuth client ID")
    google_client_secret: str = Field(default="", description="Google OAuth secret")
    google_redirect_uri: str = Field(
        default="http://localhost:3000/auth/callback",
        description="Frontend callback URL",
    )

    # Email (SMTP)
    smtp_host: str = Field(default="", description="SMTP host for password reset")
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "noreply@talkanova.local"
    frontend_base_url: str = Field(
        default="http://localhost:3000",
        description="Base URL for reset links (Tor-friendly: use relative or env)",
    )

    # Rate limiting
    rate_limit_per_minute: int = 60

    # Tor / deployment
    # When behind Tor, set frontend_base_url to onion or use relative paths in emails
    allow_tor: bool = True

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


def get_settings() -> Settings:
    """Load settings; prefer .env in backend root."""
    env_path = Path(__file__).resolve().parent.parent / ".env"
    return Settings(_env_file=env_path if env_path.exists() else None)
