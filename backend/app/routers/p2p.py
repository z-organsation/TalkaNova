"""
P2P Signaling Router (NO AUTH).
Facilitates NAT Traversal / Direct Connection via Tailscale IP exchange.
User identity from request body or X-User-ID header.
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/p2p", tags=["p2p"])


# --- Schemas ---

class P2PRequest(BaseModel):
    target_user_id: str
    user_id: Optional[str] = None  # Initiator ID
    user_name: Optional[str] = None


class P2PAccept(BaseModel):
    session_id: str
    tailscale_ip: str
    user_id: Optional[str] = None


class P2PExchange(BaseModel):
    session_id: str
    tailscale_ip: str
    user_id: Optional[str] = None


class P2PSessionResponse(BaseModel):
    session_id: str
    initiator_id: str
    target_id: str
    status: str
    created_at: datetime
    initiator_name: Optional[str] = None
    target_name: Optional[str] = None
    peer_ip: Optional[str] = None
    sdp_offer: Optional[dict] = None
    sdp_answer: Optional[dict] = None


# --- In-Memory Store ---

class Session:
    def __init__(self, id: str, initiator: str, target: str, initiator_name: str = "Unknown"):
        self.id = id
        self.initiator_id = initiator
        self.target_id = target
        self.initiator_name = initiator_name
        self.target_name = "Unknown"
        self.status = "pending"
        self.initiator_ip: str | None = None
        self.target_ip: str | None = None
        self.sdp_offer: dict | None = None
        self.sdp_answer: dict | None = None
        self.ice_candidates: list = []
        self.created_at = datetime.utcnow()
        self.expires = datetime.utcnow() + timedelta(minutes=30)


_sessions: Dict[str, Session] = {}
_session_counter = 0


def create_session_id():
    global _session_counter
    _session_counter += 1
    return f"p2p-{_session_counter}"


def cleanup_sessions():
    now = datetime.utcnow()
    expired = [k for k, v in _sessions.items() if v.expires < now]
    for k in expired:
        del _sessions[k]


def get_user_id(header: Optional[str], body_id: Optional[str]) -> str:
    if body_id:
        return body_id
    if header:
        return header
    import uuid
    return str(uuid.uuid4())


# --- Endpoints ---

@router.post("/request", response_model=P2PSessionResponse)
async def request_session(
    data: P2PRequest,
    x_user_id: Optional[str] = Header(None),
):
    cleanup_sessions()
    
    user_id = get_user_id(x_user_id, data.user_id)
    
    if data.target_user_id == user_id:
        raise HTTPException(400, "Cannot chat with self")
    
    sid = create_session_id()
    session = Session(sid, user_id, data.target_user_id, data.user_name or "Unknown")
    _sessions[sid] = session
    
    logger.info(f"P2P Session {sid} requested by {user_id} -> {data.target_user_id}")
    
    return P2PSessionResponse(
        session_id=session.id,
        initiator_id=session.initiator_id,
        target_id=session.target_id,
        status=session.status,
        created_at=session.created_at,
        initiator_name=session.initiator_name
    )


@router.get("/pending", response_model=List[P2PSessionResponse])
async def get_pending(
    x_user_id: Optional[str] = Header(None),
):
    """List incoming pending requests."""
    cleanup_sessions()
    
    if not x_user_id:
        return []
    
    pending = []
    target_sessions = [s for s in _sessions.values() if s.target_id == x_user_id and s.status == "pending"]
    
    for s in target_sessions:
        pending.append(P2PSessionResponse(
            session_id=s.id,
            initiator_id=s.initiator_id,
            target_id=s.target_id,
            status=s.status,
            created_at=s.created_at,
            initiator_name=s.initiator_name
        ))
    
    return pending


@router.post("/accept")
async def accept_session(
    data: P2PAccept,
    x_user_id: Optional[str] = Header(None),
):
    user_id = get_user_id(x_user_id, data.user_id)
    
    session = _sessions.get(data.session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    
    if session.target_id != user_id:
        raise HTTPException(403, "Not allowed")
    
    if session.status != "pending":
        raise HTTPException(400, f"Status is {session.status}")
    
    session.status = "connecting"
    session.target_ip = data.tailscale_ip
    
    return {"message": "Accepted", "session_id": session.id}


@router.post("/exchange-ip")
async def exchange_ip(
    data: P2PExchange,
    x_user_id: Optional[str] = Header(None),
):
    user_id = get_user_id(x_user_id, data.user_id)
    
    session = _sessions.get(data.session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    
    if user_id == session.initiator_id:
        session.initiator_ip = data.tailscale_ip
        peer_ip = session.target_ip
    elif user_id == session.target_id:
        session.target_ip = data.tailscale_ip
        peer_ip = session.initiator_ip
    else:
        raise HTTPException(403, "Not a participant")
    
    return {"status": session.status, "peer_ip": peer_ip}


@router.get("/session/{session_id}")
async def get_session_status(
    session_id: str,
    x_user_id: Optional[str] = Header(None),
):
    session = _sessions.get(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    
    user_id = x_user_id or ""
    
    # Determine peer IP for this user
    peer_ip = None
    if user_id == session.initiator_id:
        peer_ip = session.target_ip
    elif user_id == session.target_id:
        peer_ip = session.initiator_ip
    
    return P2PSessionResponse(
        session_id=session.id,
        initiator_id=session.initiator_id,
        target_id=session.target_id,
        status=session.status,
        created_at=session.created_at,
        initiator_name=session.initiator_name,
        peer_ip=peer_ip,
        sdp_offer=session.sdp_offer,
        sdp_answer=session.sdp_answer,
    )


# --- WebRTC Signaling ---

class SignalOffer(BaseModel):
    session_id: str
    sdp: str
    type: str = "offer"


class SignalAnswer(BaseModel):
    session_id: str
    sdp: str
    type: str = "answer"


class SignalICE(BaseModel):
    session_id: str
    candidate: str
    sdp_mid: Optional[str] = None
    sdp_m_line_index: Optional[int] = None


@router.post("/signal/offer")
async def signal_offer(data: SignalOffer):
    session = _sessions.get(data.session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    session.sdp_offer = {"sdp": data.sdp, "type": data.type}
    return {"status": "ok"}


@router.post("/signal/answer")
async def signal_answer(data: SignalAnswer):
    session = _sessions.get(data.session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    session.sdp_answer = {"sdp": data.sdp, "type": data.type}
    session.status = "connected"
    return {"status": "ok"}


@router.post("/signal/ice")
async def signal_ice(data: SignalICE):
    session = _sessions.get(data.session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    session.ice_candidates.append({
        "candidate": data.candidate,
        "sdpMid": data.sdp_mid,
        "sdpMLineIndex": data.sdp_m_line_index
    })
    return {"status": "ok"}


@router.post("/close/{session_id}")
async def close_session(session_id: str):
    if session_id in _sessions:
        _sessions[session_id].status = "closed"
    return {"status": "closed"}
