from fastapi import Depends, HTTPException, Security
from fastapi.security.api_key import APIKeyHeader
from sqlalchemy.orm import Session

from core.config import settings
from core.database import SessionLocal

API_KEY_NAME = "X-Admin-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_admin_api_key(api_key_header: str = Security(api_key_header)):
    if api_key_header == settings.ADMIN_API_KEY:
        return api_key_header
    raise HTTPException(
        status_code=403, 
        detail="Could not validate Admin API Key"
    )
