
from cmath import log
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.dependencies import get_db
from app.models.user import User
from app.models.task import Task
from app.models.work_log import WorkLog
from app.schemas.work_log import (
    WorkLogCreate,
    WorkLogFinish,
    WorkLogResponse,
)

router = APIRouter(
    prefix="/work-logs",
    tags=["Work Logs"],
)


def normalize_utc(value: datetime) -> datetime:
    """Normalize a datetime to timezone-aware UTC."""
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)

    return value.astimezone(timezone.utc)


def serialize_work_log(log: WorkLog) -> dict:
    actual_work_minutes = None

    if log.ended_at is not None:
        started_at = normalize_utc(log.started_at)
        ended_at = normalize_utc(log.ended_at)

        elapsed_seconds = (
            ended_at - started_at
        ).total_seconds()

        elapsed_minutes = int(elapsed_seconds // 60)

        actual_work_minutes = max(
            0,
            elapsed_minutes - log.break_minutes,
        )

    return {
        "id": log.id,
        "user_id": log.user_id,
        "task_id": log.task_id,
        "started_at": log.started_at,
        "ended_at": log.ended_at,
        "break_minutes": log.break_minutes,
        "interruption_count": log.interruption_count,
        "notes": log.notes,
        "created_at": log.created_at,
        "status": (
            "completed" if log.ended_at is not None else "active"
        ),
        "actual_work_minutes": actual_work_minutes,
    }


@router.post(
    "/start",
    response_model=WorkLogResponse,
    status_code=status.HTTP_201_CREATED,
)
def start_work_log(
    payload: WorkLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # If a task is supplied, verify that it belongs to this user.
    if payload.task_id is not None:
        task = (
            db.query(Task)
            .filter(
                Task.id == payload.task_id,
                Task.user_id == current_user.id,
            )
            .first()
        )

        if task is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found",
            )

    log = WorkLog(
        user_id=current_user.id,
        task_id=payload.task_id,
        started_at=datetime.now(timezone.utc),
        break_minutes=payload.break_minutes,
        interruption_count=payload.interruption_count,
        notes=payload.notes,
    )

    db.add(log)
    db.commit()
    db.refresh(log)

    return serialize_work_log(log)


@router.post(
    "/{log_id}/finish",
    response_model=WorkLogResponse,
)
def finish_work_log(
    log_id: int,
    payload: WorkLogFinish,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    log = (
        db.query(WorkLog)
        .filter(
            WorkLog.id == log_id,
            WorkLog.user_id == current_user.id,
        )
        .first()
    )

    if log is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Work log not found",
        )

    if log.ended_at is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Work log is already completed",
        )

    # Update optional values provided when finishing the work period.
    if payload.break_minutes is not None:
        log.break_minutes = payload.break_minutes

    if payload.interruption_count is not None:
        log.interruption_count = payload.interruption_count

    if payload.notes is not None:
        log.notes = payload.notes

    now = datetime.now(timezone.utc)
    log.ended_at = now

    db.commit()
    db.refresh(log)

    return serialize_work_log(log)


@router.get(
    "/",
    response_model=list[WorkLogResponse],
)
def list_work_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    logs = (
        db.query(WorkLog)
        .filter(WorkLog.user_id == current_user.id)
        .order_by(WorkLog.started_at.desc())
        .all()
    )

    return [serialize_work_log(log) for log in logs]
