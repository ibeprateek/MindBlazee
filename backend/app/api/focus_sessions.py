
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.dependencies import get_db
from app.models.focus_session import FocusSession
from app.models.task import Task
from app.models.user import User
from app.schemas.focus_session import (
    FocusSessionResponse,
    FocusSessionStart,
)

router = APIRouter(prefix="/focus-sessions", tags=["Focus Sessions"])

DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.post(
    "/start",
    response_model=FocusSessionResponse,
    status_code=status.HTTP_201_CREATED,
)
def start_focus_session(
    session_data: FocusSessionStart,
    db: DbSession,
    current_user: CurrentUser,
):
    # Allow at most one active focus session per user.
    active_session = db.scalar(
        select(FocusSession).where(
            FocusSession.user_id == current_user.id,
            FocusSession.status == "active",
        )
    )

    if active_session:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already have an active focus session",
        )

    # If a task is supplied, ensure it belongs to this user.
    if session_data.task_id is not None:
        task = db.scalar(
            select(Task).where(
                Task.id == session_data.task_id,
                Task.user_id == current_user.id,
            )
        )

        if task is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found",
            )

    focus_session = FocusSession(
        user_id=current_user.id,
        task_id=session_data.task_id,
        started_at=datetime.now(timezone.utc),
        status="active",
    )

    db.add(focus_session)
    db.commit()
    db.refresh(focus_session)

    return focus_session


@router.post(
    "/{session_id}/finish",
    response_model=FocusSessionResponse,
)
def finish_focus_session(
    session_id: int,
    db: DbSession,
    current_user: CurrentUser,
):
    focus_session = db.scalar(
        select(FocusSession).where(
            FocusSession.id == session_id,
            FocusSession.user_id == current_user.id,
        )
    )

    if focus_session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Focus session not found",
        )

    if focus_session.status != "active":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Focus session is already finished",
        )

    focus_session.ended_at = datetime.now(timezone.utc)
    focus_session.status = "completed"

    db.commit()
    db.refresh(focus_session)

    return focus_session


@router.get("/", response_model=list[FocusSessionResponse])
def list_focus_sessions(
    db: DbSession,
    current_user: CurrentUser,
):
    statement = (
        select(FocusSession)
        .where(FocusSession.user_id == current_user.id)
        .order_by(FocusSession.started_at.desc())
    )

    return db.scalars(statement).all()
