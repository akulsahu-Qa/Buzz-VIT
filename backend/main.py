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

# Create Database tables
Base.metadata.create_all(bind=engine)

def ensure_schema_migrations():
    """Ensure newly added columns exist in database tables across SQLite and PostgreSQL."""
    try:
        from sqlalchemy import inspect, text
        inspector = inspect(engine)
        if "patient_rounds" in inspector.get_table_names():
            existing_cols = {c["name"] for c in inspector.get_columns("patient_rounds")}
            if "gown_and_linens_changed" not in existing_cols:
                logger.info("Migrating patient_rounds: adding gown_and_linens_changed column")
                with engine.begin() as conn:
                    conn.execute(text("ALTER TABLE patient_rounds ADD COLUMN gown_and_linens_changed BOOLEAN"))
                logger.info("Successfully added gown_and_linens_changed column")
    except Exception as exc:
        logger.error(f"Error during schema migration check: {exc}")

ensure_schema_migrations()

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Hospital Workflow API starting up…")
    ensure_schema_migrations()
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
