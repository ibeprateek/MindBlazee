
import logging
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, HTTPException
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from app.api.auth import router as auth_router
from app.core.config import settings
from app.db.session import engine
from app.api.tasks import router as tasks_router
from app.api.focus_sessions import router as focus_sessions_router
from app.api.analytics import router as analytics_router
from app.api.work_logs import router as work_logs_router
from app.api import recommendation_feedback


# Configure application logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("mindblaze")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting MindBlaze API")

    try:
        # Verify the database connection during startup
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

        logger.info("MySQL database connection successful")

    except SQLAlchemyError:
        logger.exception("MySQL database connection failed")
        engine.dispose()
        raise

    yield

    engine.dispose()
    logger.info("MindBlaze API stopped")


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description=(
        "MindBlaze API for workload management, "
        "mental fatigue estimation, and personalized recommendations."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    tasks_router,
    prefix=settings.api_v1_prefix,
)

app.include_router(
    auth_router,
    prefix=settings.api_v1_prefix,
)

app.include_router(
    focus_sessions_router,
    prefix=settings.api_v1_prefix,
)

app.include_router(
    analytics_router,
    prefix=settings.api_v1_prefix,
)

app.include_router(
    work_logs_router,
    prefix=settings.api_v1_prefix,
)

app.include_router(
    recommendation_feedback.router,
    prefix="/api/v1",
)

@app.get("/", tags=["General"])
def root():
    return {
        "message": "Welcome to MindBlaze API",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "ok",
        "service": "mindblaze-api",
    }


@app.get("/health/db", tags=["Health"])
def database_health_check():
    try:
        with engine.connect() as connection:
            result = connection.execute(
                text("SELECT DATABASE(), CURRENT_USER()")
            ).one()

        return {
            "status": "ok",
            "database": "connected",
            "database_name": result[0],
            "database_user": result[1],
        }

    except SQLAlchemyError as exc:
        logger.exception("Database health check failed")

        raise HTTPException(
            status_code=503,
            detail="Database connection unavailable. Check server logs.",
        ) from exc


@app.get("/api/v1/health", tags=["Health"])
def versioned_health_check():
    return {
        "status": "ok",
        "api_version": "v1",
        "service": "mindblaze-api",
    }
