"""
General Chat WebSocket endpoint.
Server-based real-time messaging with message persistence.
No-Auth: Uses token (session ID) and name (nickname) from query params.
"""

import json
import logging
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.models import Message, Room
from app.websocket.manager import manager

logger = logging.getLogger(__name__)

router = APIRouter(tags=["websocket"])


async def get_room(db, room_id: str) -> Room | None:
    """Get room by ID. If not exists, create one (Global Chat)."""
    r = await db.execute(select(Room).where(Room.id == room_id))
    room = r.scalars().one_or_none()
    if not room and room_id == "general":
        # Auto-create general room if missing
        room = Room(id="general", name="General Chat", code="general", is_dm=False)
        db.add(room)
        await db.commit()
    return room


@router.websocket("/ws/general")
async def websocket_general_chat(
    ws: WebSocket,
    token: str = Query(...),   # Guest ID
    name: str = Query("Guest"), # Nickname
    room_id: str = Query("general"),
):
    """
    WebSocket endpoint for general (server-based) chat.
    
    Query params:
    - token: Guest Session ID (uuid)
    - name: User's nickname
    - room_id: Room to join (default: general)
    """
    user_id = token
    user_name = name
    pfp_url = None # Guests don't have avatars yet
    
    # Ensure room exists
    async with AsyncSessionLocal() as db:
        room = await get_room(db, room_id)
        if not room:
            # If strictly requiring rooms
             # await ws.close(code=4004, reason="Room not found")
             # return
             pass # For now, let's assume 'general' exists or was created
    
    # Connect
    await manager.connect(ws, room_id, user_id, user_name, pfp_url)
    
    # Send current room users
    room_users = manager.get_room_users(room_id)
    try:
        await ws.send_json({
            "type": "room_users",
            "users": room_users
        })
    except Exception:
        pass
    
    try:
        while True:
            raw = await ws.receive_text()
            data = json.loads(raw)
            
            if data.get("type") == "message":
                body_encrypted = data.get("body_encrypted", "")
                content_preview = data.get("content", "Encrypted Message")
                key_id = data.get("key_id")
                timestamp = datetime.utcnow().isoformat()
                
                # Store message in database
                async with AsyncSessionLocal() as db:
                    msg = Message(
                        room_id=room_id,
                        sender_id=user_id,
                        sender_name=user_name,
                        content=body_encrypted, # Storing ciphertext as content
                        timestamp=datetime.utcnow()
                    )
                    db.add(msg)
                    await db.commit()
                    await db.refresh(msg)
                    message_id = msg.id
                
                # Broadcast
                await manager.broadcast_message(
                    room_id=room_id,
                    sender_id=user_id,
                    sender_name=user_name,
                    sender_avatar=pfp_url,
                    body_encrypted=body_encrypted,
                    key_id=key_id,
                    timestamp=timestamp,
                    message_id=message_id
                )
                
            elif data.get("type") == "typing":
                # Only broadcast to others
                for conn, uid, _, _ in list(manager._rooms.get(room_id, [])):
                    if conn != ws:
                        try:
                            await conn.send_json({
                                "type": "typing",
                                "user_id": user_id,
                                "user_name": user_name,
                            })
                        except Exception:
                            pass
                            
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.warning(f"WebSocket error: {e}")
    finally:
        manager.disconnect(ws, room_id, user_id, user_name, pfp_url)
        await manager.broadcast_presence(room_id, "leave", user_id, user_name, pfp_url)

