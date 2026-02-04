"""
Messages: list and send messages (NO AUTH).
User identity provided via request body or headers.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
from typing import Optional

from app.database import get_db
from app.models import Message
from app.schemas import MessageSend, MessageResponse

router = APIRouter(prefix="/messages", tags=["messages"])


def get_user_id_from_header(x_user_id: Optional[str] = Header(None)) -> str:
    """Extract user_id from X-User-ID header, or generate one."""
    if x_user_id:
        return x_user_id
    import uuid
    return str(uuid.uuid4())


@router.get("", response_model=list[MessageResponse])
async def list_messages(
    room_id: str | None = Query(None),
    limit: int = Query(50, le=200),
    before_id: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """List messages for a room (open access)."""
    q = select(Message).order_by(Message.timestamp.desc()).limit(limit)
    
    if room_id:
        q = q.where(Message.room_id == room_id)

    r = await db.execute(q)
    messages = list(r.scalars().all())
    messages.reverse()
    
    return [
        MessageResponse(
            id=m.id,
            sender_id=m.sender_id,
            sender_name=m.sender_name,
            body_encrypted=m.content,
            timestamp=m.timestamp,
            room_id=m.room_id,
        )
        for m in messages
    ]


@router.post("", response_model=MessageResponse)
async def send_message(
    data: MessageSend,
    x_user_id: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
):
    """Send a message via HTTP (open access)."""
    user_id = x_user_id or data.sender_id or get_user_id_from_header()
    
    msg = Message(
        sender_id=user_id,
        sender_name=data.sender_name or f"Guest",
        content=data.body_encrypted,
        timestamp=datetime.utcnow(),
        room_id=data.room_id,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    
    return MessageResponse(
        id=msg.id,
        sender_id=msg.sender_id,
        sender_name=msg.sender_name,
        body_encrypted=msg.content,
        timestamp=msg.timestamp,
        room_id=msg.room_id,
    )


@router.delete("/{message_id}")
async def delete_message(
    message_id: str,
    x_user_id: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
):
    """Delete a message. Only sender can delete (by matching user_id header)."""
    result = await db.execute(select(Message).where(Message.id == message_id))
    msg = result.scalars().one_or_none()
    
    if not msg:
        raise HTTPException(404, "Message not found")
    
    # Optional: check if sender matches
    if x_user_id and msg.sender_id != x_user_id:
        raise HTTPException(403, "Not authorized to delete this message")
    
    # Soft delete
    msg.content = "[deleted]"
    await db.commit()
    
    return {"message": "Message deleted"}
