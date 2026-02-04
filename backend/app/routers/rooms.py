"""
Rooms: list and create (NO AUTH).
Open access for anonymous users.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional
import uuid as uuid_lib

from app.database import get_db
from app.models import Room

router = APIRouter(prefix="/rooms", tags=["rooms"])


class RoomCreate(BaseModel):
    name: str
    code: str = ""


class RoomResponse(BaseModel):
    id: str
    name: str
    code: str
    is_dm: bool
    created_at: str

    class Config:
        from_attributes = True


@router.get("", response_model=list[RoomResponse])
async def list_rooms(
    db: AsyncSession = Depends(get_db),
):
    """List all rooms (open access)."""
    result = await db.execute(select(Room).order_by(Room.name))
    rooms = result.scalars().all()
    return [
        RoomResponse(
            id=r.id,
            name=r.name,
            code=r.code or "",
            is_dm=r.is_dm,
            created_at=r.created_at.isoformat() if r.created_at else "",
        )
        for r in rooms
    ]


@router.post("", response_model=RoomResponse)
async def create_room(
    data: RoomCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new room (open access)."""
    room = Room(
        id=str(uuid_lib.uuid4()),
        name=data.name,
        code=data.code,
        is_dm=False,
    )
    db.add(room)
    await db.commit()
    await db.refresh(room)
    
    return RoomResponse(
        id=room.id,
        name=room.name,
        code=room.code or "",
        is_dm=room.is_dm,
        created_at=room.created_at.isoformat() if room.created_at else "",
    )


@router.post("/{room_id}/join")
async def join_room(
    room_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Join a room (no-op in no-auth mode, just verify room exists)."""
    result = await db.execute(select(Room).where(Room.id == room_id))
    room = result.scalars().one_or_none()
    
    if not room:
        raise HTTPException(404, "Room not found")
    
    return {"message": "Joined room", "room_id": room_id}
