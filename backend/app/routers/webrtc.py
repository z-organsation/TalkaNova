"""
WebRTC signaling (demo): offer/answer/ICE. State in-memory; not for production scale.
No authentication required.
"""

from fastapi import APIRouter
from typing import Any
from app.schemas import SignalingOffer, SignalingAnswer, IceCandidate

router = APIRouter(prefix="/webrtc", tags=["webrtc"])

# Fixed guest user ID
GUEST_USER_ID = "guest-user"

# In-memory signaling store (demo only). Key: (caller_id, callee_id) sorted. Value: last offer/answer/ice.
_signaling: dict[tuple[str, str], dict[str, Any]] = {}


def _key(a: str, b: str) -> tuple[str, str]:
    return (min(a, b), max(a, b))


@router.post("/offer")
async def webrtc_offer(
    data: SignalingOffer,
):
    """Store SDP offer for target user (demo: in-memory)."""
    key = _key(GUEST_USER_ID, data.target_user_id)
    if key not in _signaling:
        _signaling[key] = {}
    _signaling[key]["offer"] = {"sdp": data.sdp, "type": data.type, "from": GUEST_USER_ID}
    return {"ok": True}


@router.post("/answer")
async def webrtc_answer(
    data: SignalingAnswer,
):
    """Store SDP answer (demo: in-memory)."""
    key = _key(GUEST_USER_ID, data.target_user_id)
    if key not in _signaling:
        _signaling[key] = {}
    _signaling[key]["answer"] = {"sdp": data.sdp, "type": data.type, "from": GUEST_USER_ID}
    return {"ok": True}


@router.post("/ice")
async def webrtc_ice(
    data: IceCandidate,
):
    """Store ICE candidate (demo: append list)."""
    key = _key(GUEST_USER_ID, data.target_user_id)
    if key not in _signaling:
        _signaling[key] = {}
    if "ice" not in _signaling[key]:
        _signaling[key]["ice"] = []
    _signaling[key]["ice"].append({"candidate": data.candidate, "from": GUEST_USER_ID})
    return {"ok": True}


@router.get("/signaling/{target_user_id}")
async def get_signaling(
    target_user_id: str,
):
    """Get offer/answer/ICE for a peer (demo: one-shot read)."""
    key = _key(GUEST_USER_ID, target_user_id)
    data = _signaling.get(key, {})
    return data
