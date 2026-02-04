"""
File Upload Router - NO AUTH version
Uses X-User-ID header for ownership tracking
"""

import os
import uuid
import aiofiles
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Header
from fastapi.responses import FileResponse

router = APIRouter(prefix="/files", tags=["files"])

# File storage directory
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Allowed file types
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf", ".txt", ".doc", ".docx"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

# In-memory file metadata store
_file_metadata: dict[str, dict] = {}


@router.post("")
async def upload_file(
    file: UploadFile = File(...),
    x_user_id: Optional[str] = Header(None),
):
    """Upload a file (open access)."""
    user_id = x_user_id or str(uuid.uuid4())
    
    # Validate extension
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"File type {ext} not allowed")
    
    content = await file.read()
    
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(400, f"File too large. Max: {MAX_FILE_SIZE // 1024 // 1024}MB")
    
    file_id = str(uuid.uuid4())
    stored_filename = f"{file_id}{ext}"
    file_path = os.path.join(UPLOAD_DIR, stored_filename)
    
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)
    
    metadata = {
        "id": file_id,
        "original_filename": file.filename,
        "stored_filename": stored_filename,
        "size": len(content),
        "content_type": file.content_type or "application/octet-stream",
        "uploaded_by": user_id,
        "uploaded_at": datetime.utcnow().isoformat(),
    }
    _file_metadata[file_id] = metadata
    
    return {
        "id": file_id,
        "filename": file.filename,
        "size": len(content),
        "content_type": metadata["content_type"],
        "uploaded_at": metadata["uploaded_at"],
    }


@router.get("/{file_id}")
async def download_file(file_id: str):
    """Download a file by ID (open access)."""
    metadata = _file_metadata.get(file_id)
    if not metadata:
        raise HTTPException(404, "File not found")
    
    file_path = os.path.join(UPLOAD_DIR, metadata["stored_filename"])
    if not os.path.exists(file_path):
        raise HTTPException(404, "File not found on disk")
    
    return FileResponse(
        file_path,
        filename=metadata["original_filename"],
        media_type=metadata["content_type"],
    )


@router.delete("/{file_id}")
async def delete_file(
    file_id: str,
    x_user_id: Optional[str] = Header(None),
):
    """Delete a file (open access, optional ownership check)."""
    metadata = _file_metadata.get(file_id)
    if not metadata:
        raise HTTPException(404, "File not found")
    
    # Optional ownership check
    if x_user_id and metadata["uploaded_by"] != x_user_id:
        raise HTTPException(403, "Not authorized")
    
    file_path = os.path.join(UPLOAD_DIR, metadata["stored_filename"])
    if os.path.exists(file_path):
        os.remove(file_path)
    
    del _file_metadata[file_id]
    
    return {"message": "File deleted"}
