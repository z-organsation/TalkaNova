"""
SQLAlchemy Models for TalkaNova Security-First Architecture.
"""

from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.database import Base
import uuid

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True) # Nullable for OAuth-only users
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    profile = relationship("Profile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    keys = relationship("KeyBundle", back_populates="user", uselist=False, cascade="all, delete-orphan")

class Profile(Base):
    __tablename__ = "profiles"

    id = Column(String, ForeignKey("users.id"), primary_key=True)
    display_name = Column(String, index=True)
    avatar_url = Column(String, nullable=True)
    bio = Column(String, nullable=True)
    
    user = relationship("User", back_populates="profile")

class KeyBundle(Base):
    """
    Stores Public Keys for X3DH (Extended Triple Diffie-Hellman).
    Server acts as a directory service only.
    """
    __tablename__ = "key_bundles"

    user_id = Column(String, ForeignKey("users.id"), primary_key=True)
    
    identity_key = Column(String, nullable=False)   # IK_B (Public Ed25519)
    signed_pre_key = Column(String, nullable=False) # SPK_B (Public X25519)
    pre_key_sig = Column(String, nullable=False)    # Sig(IK_B, SPK_B)
    
    # JSON list of One-Time Prekeys (OPK_B)
    # { "key_id": "public_key_base64" }
    one_time_pre_keys = Column(JSON, default=list) 
    
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", back_populates="keys")

class MessageBlob(Base):
    """
    Stores Encrypted Message Blobs.
    Server CANNOT read content.
    """
    __tablename__ = "message_blobs"

    id = Column(String, primary_key=True, default=generate_uuid)
    
    sender_id = Column(String, index=True, nullable=False)
    recipient_id = Column(String, index=True, nullable=True) # Null for Room messages
    room_id = Column(String, index=True, nullable=True)      # Null for DM
    
    # Encrypted Content (ChaCha20-Poly1305 / AES-GCM)
    content_blob = Column(Text, nullable=False)
    
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Delivery status (for DMs)
    delivered = Column(Boolean, default=False)

class GlobalMessage(Base):
    """
    Server-based General Chat History.
    No FK to users - supports anonymous mode.
    """
    __tablename__ = "global_messages"

    id = Column(String, primary_key=True, default=generate_uuid)
    sender_id = Column(String, index=True)  # Anonymous user ID
    sender_name = Column(String)  # Display name
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)


class Room(Base):
    """
    Chat Rooms (Public or Private via Code).
    """
    __tablename__ = "rooms"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    code = Column(String, nullable=True)
    is_dm = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    messages = relationship("Message", back_populates="room", cascade="all, delete-orphan")


class Message(Base):
    """
    Encrypted Messages in Rooms.
    """
    __tablename__ = "messages"

    id = Column(String, primary_key=True, default=generate_uuid)
    sender_id = Column(String, index=True)
    sender_name = Column(String)
    content = Column(Text, nullable=False) # Encrypted
    timestamp = Column(DateTime, default=datetime.utcnow)
    room_id = Column(String, ForeignKey("rooms.id"), index=True)
    deleted = Column(Boolean, default=False)

    room = relationship("Room", back_populates="messages")

