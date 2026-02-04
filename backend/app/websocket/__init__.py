"""
WebSocket module for real-time communication.
"""

from app.websocket.manager import manager, ConnectionManager
from app.websocket.general_chat import router

__all__ = ["manager", "ConnectionManager", "router"]
