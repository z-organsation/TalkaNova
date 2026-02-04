"""
General Chat WebSocket Router (NO AUTH).
Handles Global Broadcasts with Persistence.
User identity from query params (user_id, name).
"""

import logging
import json
from datetime import datetime
from typing import List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.models import GlobalMessage

logger = logging.getLogger(__name__)

router = APIRouter(tags=["websocket"])


class BroadcastManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections[:]:
            try:
                await connection.send_json(message)
            except Exception:
                pass


manager = BroadcastManager()


@router.websocket("/ws/general")
async def general_chat_endpoint(
    websocket: WebSocket,
    user_id: str = Query("anonymous"),
    name: str = Query("Guest"),
    room_id: str = Query("general"),
):
    """
    Open WebSocket for general chat.
    No auth required - user_id and name come from query params.
    """
    await manager.connect(websocket)
    
    username = name or f"Guest-{user_id[:4]}"
    
    logger.info(f"WS Connected: {user_id} ({username})")

    try:
        while True:
            data_text = await websocket.receive_text()
            data = json.loads(data_text)
            
            if data.get("type") == "chat":
                content = data.get("content")
                if not content:
                    continue
                
                # Persist message
                async with AsyncSessionLocal() as db:
                    msg = GlobalMessage(
                        sender_id=user_id,
                        sender_name=username,
                        content=content
                    )
                    db.add(msg)
                    await db.commit()
                    await db.refresh(msg)
                    
                    # Broadcast to all
                    out_msg = {
                        "type": "message",
                        "id": msg.id,
                        "sender_id": user_id,
                        "user_name": username,
                        "content": content,
                        "timestamp": str(msg.timestamp)
                    }
                    
                    await manager.broadcast(out_msg)

    except WebSocketDisconnect:
        manager.disconnect(websocket)
        logger.info(f"WS Disconnected: {user_id}")
    except Exception as e:
        logger.error(f"General WS Error: {e}")
        manager.disconnect(websocket)
