"""
WebSocket Connection Manager for real-time chat.
Handles room-based connections and message broadcasting.
"""

import json
import logging
from typing import Dict, Set, Tuple, Optional
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Manages WebSocket connections for real-time chat.
    Supports room-based messaging with user presence tracking.
    """
    
    def __init__(self):
        # room_id -> set of (websocket, user_id, user_name, pfp_url)
        self._rooms: Dict[str, Set[Tuple[WebSocket, str, str, Optional[str]]]] = {}
        # user_id -> set of websockets (user can be in multiple rooms)
        self._user_connections: Dict[str, Set[WebSocket]] = {}
    
    async def connect(
        self,
        websocket: WebSocket,
        room_id: str,
        user_id: str,
        user_name: str,
        pfp_url: Optional[str] = None
    ):
        """Add a connection to a room."""
        await websocket.accept()
        
        if room_id not in self._rooms:
            self._rooms[room_id] = set()
        
        self._rooms[room_id].add((websocket, user_id, user_name, pfp_url))
        
        if user_id not in self._user_connections:
            self._user_connections[user_id] = set()
        self._user_connections[user_id].add(websocket)
        
        # Notify others in the room
        await self.broadcast_presence(room_id, "join", user_id, user_name, pfp_url, exclude_ws=websocket)
        
        logger.info(f"User {user_name} ({user_id}) joined room {room_id}")
    
    def disconnect(
        self,
        websocket: WebSocket,
        room_id: str,
        user_id: str,
        user_name: str,
        pfp_url: Optional[str] = None
    ):
        """Remove a connection from a room."""
        if room_id in self._rooms:
            self._rooms[room_id].discard((websocket, user_id, user_name, pfp_url))
            if not self._rooms[room_id]:
                del self._rooms[room_id]
        
        if user_id in self._user_connections:
            self._user_connections[user_id].discard(websocket)
            if not self._user_connections[user_id]:
                del self._user_connections[user_id]
        
        logger.info(f"User {user_name} ({user_id}) left room {room_id}")
    
    async def broadcast_presence(
        self,
        room_id: str,
        event: str,
        user_id: str,
        user_name: str,
        pfp_url: Optional[str],
        exclude_ws: Optional[WebSocket] = None
    ):
        """Broadcast presence event (join/leave) to room."""
        if room_id not in self._rooms:
            return
        
        message = {
            "type": "presence",
            "event": event,
            "user_id": user_id,
            "user_name": user_name,
            "pfp_url": pfp_url,
        }
        
        for conn, _, _, _ in list(self._rooms[room_id]):
            if conn != exclude_ws:
                try:
                    await conn.send_json(message)
                except Exception:
                    pass
    
    async def broadcast_message(
        self,
        room_id: str,
        sender_id: str,
        sender_name: str,
        sender_avatar: Optional[str],
        body_encrypted: str,
        key_id: Optional[str],
        timestamp: str,
        message_id: str
    ):
        """Broadcast a message to all users in a room."""
        if room_id not in self._rooms:
            return
        
        payload = {
            "type": "message",
            "id": message_id,
            "sender_id": sender_id,
            "user_name": sender_name,
            "avatar": sender_avatar,
            "body_encrypted": body_encrypted,
            "key_id": key_id,
            "timestamp": timestamp,
        }
        
        for conn, _, _, _ in list(self._rooms[room_id]):
            try:
                await conn.send_json(payload)
            except Exception:
                pass
    
    async def send_to_user(self, user_id: str, message: dict):
        """Send a message to all connections of a specific user."""
        if user_id not in self._user_connections:
            return False
        
        for ws in list(self._user_connections[user_id]):
            try:
                await ws.send_json(message)
            except Exception:
                pass
        return True
    
    def get_room_users(self, room_id: str) -> list:
        """Get list of users currently in a room."""
        if room_id not in self._rooms:
            return []
        
        return [
            {"user_id": uid, "user_name": uname, "pfp_url": pfp}
            for _, uid, uname, pfp in self._rooms[room_id]
        ]
    
    def is_user_online(self, user_id: str) -> bool:
        """Check if a user has any active connections."""
        return user_id in self._user_connections and len(self._user_connections[user_id]) > 0


# Global manager instance
manager = ConnectionManager()
