import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from core.database import engine, Base
from api.routes import manager, admin, generic

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create Database tables (using SQLite directly without migrations for simplicity right now)
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Hospital Workflow API starting up…")
    yield
    logger.info("Shutting down.")

app = FastAPI(
    title="Hospital Workflow API",
    description="Buzz-integrated hospital operations workflow backend - Manager Feedback Focused",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to Vercel URL
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure uploads directory exists
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Include Routers
app.include_router(manager.router, prefix="/api", tags=["Manager Workflows"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin Simulation"])
app.include_router(generic.router, prefix="/api", tags=["Generic"])

@app.get("/", summary="Root endpoint")
async def root():
    return {
        "service": "Buzz-VIT Hospital Workflow API",
        "status": "online",
        "docs": "/docs",
        "health": "/api/health"
    }

@app.get("/api/health", summary="Health check")
async def health():
    return {"status": "ok"}
