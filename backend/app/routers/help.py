"""
Help Router - Contact form and email support
Sends emails to support address
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
import logging

from app.services.email_service import send_help_email
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/help", tags=["help"])


class HelpRequest(BaseModel):
    name: str
    email: EmailStr
    subject: str
    message: str


class HelpResponse(BaseModel):
    success: bool
    message: str


@router.post("", response_model=HelpResponse)
async def submit_help_request(data: HelpRequest):
    """
    Submit a help request. Sends email to support.
    """
    try:
        await send_help_email(
            from_name=data.name,
            from_email=data.email,
            subject=data.subject,
            message=data.message,
        )
        logger.info(f"Help request from {data.email}: {data.subject}")
        return HelpResponse(success=True, message="Help request submitted successfully")
    except Exception as e:
        logger.error(f"Failed to send help email: {e}")
        raise HTTPException(status_code=500, detail="Failed to send help request")
