"""
Message reporting.
No-Auth: Reports are logged only (no database persistence for reports).
"""

from fastapi import APIRouter
import logging

from app.schemas import ReportCreate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("")
async def report_message(data: ReportCreate):
    """Report a message. Logged for admin review."""
    logger.info(f"REPORT: Message {data.message_id} reported. Reason: {data.reason}")
    return {"message": "Report submitted"}

