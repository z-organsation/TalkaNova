"""
Pydantic Schemas for No-Auth Architecture.
"""

from typing import List, Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime

# ----- Common -----

class UserProfile(BaseModel):
    id: str
    user_name: str
    email: str | None = None
    pfp_url: str | None = None
    created_at: datetime

# ----- Messages -----

class MessageSend(BaseModel):
    body_encrypted: str
    sender_name: str | None = None
    sender_id: str | None = None
    room_id: str | None = None
    conversation_id: str | None = None # Legacy/P2P context

class MessageResponse(BaseModel):
    id: str
    sender_id: str
    sender_name: str | None
    body_encrypted: str
    timestamp: datetime
    room_id: str | None = None
    deleted: bool = False

    class Config:
        from_attributes = True

# ----- Help -----

class HelpRequest(BaseModel):
    email: EmailStr
    subject: str
    message: str
    name: str = "Anonymous"

class HelpResponse(BaseModel):
    success: bool
    message: str

# ----- Auth (Legacy/Guest) -----

class Token(BaseModel):
    access_token: str
    token_type: str

class GuestLogin(BaseModel):
    display_name: str | None = None


class ReportCreate(BaseModel):
    message_id: str
    reason: str
