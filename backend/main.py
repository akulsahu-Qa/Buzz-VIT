import asyncio
import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
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

from services.rounds_scheduler import start_rounds_scheduler, stop_rounds_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Hospital Workflow API starting up…")
    ensure_schema_migrations()
    scheduler_task = asyncio.create_task(start_rounds_scheduler())
    yield
    logger.info("Shutting down hospital workflow API…")
    stop_rounds_scheduler()
    scheduler_task.cancel()

app = FastAPI(
    title="Hospital Workflow API",
    description="Buzz-integrated hospital operations workflow backend - Manager Feedback Focused",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS for all local development and production origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://buzz-vit.vercel.app",
        "*",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {exc}", exc_info=True)
    origin = request.headers.get("origin") or "*"
    response = JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}"}
    )
    response.headers["Access-Control-Allow-Origin"] = origin
    return response

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
