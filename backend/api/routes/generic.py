import os
import uuid
import base64
import logging
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException

from core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

class PhotoUploadRequest(BaseModel):
    base64_data: str  # Format: "data:image/jpeg;base64,/9j/4AAQSkZJRg..."

@router.post("/upload-photo", summary="Upload a base64 encoded photo")
async def upload_photo(body: PhotoUploadRequest):
    try:
        if "," in body.base64_data:
            header, b64_str = body.base64_data.split(",", 1)
        else:
            b64_str = body.base64_data
            
        file_bytes = base64.b64decode(b64_str)
        filename = f"{uuid.uuid4()}.jpg"
        os.makedirs("uploads", exist_ok=True)
        filepath = os.path.join("uploads", filename)
        
        with open(filepath, "wb") as f:
            f.write(file_bytes)
            
        return {"photo_url": f"{settings.API_BASE_URL}/uploads/{filename}"}
    except Exception as e:
        logger.error(f"Failed to upload photo: {e}")
        raise HTTPException(status_code=400, detail="Invalid photo data")
