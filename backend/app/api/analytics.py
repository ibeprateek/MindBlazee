from datetime import date, datetime, time, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.services.recommendation_engine import generate_recommendations
from app.db.dependencies import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.task import Task
from app.models.focus_session import FocusSession
from app.models.work_log import WorkLog
from app.services.fatigue_scoring import estimate_fatigue

from pydantic import BaseModel, Field

from fastapi import HTTPException
from pydantic import BaseModel, Field
from app.services.ml_fatigue_service import predict_fatigue



router = APIRouter(
    prefix="/analytics",
    tags=["Workload Analytics"]
)


@router.get("/workload")
def get_workload_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tasks = (
        db.query(Task)
        .filter(Task.user_id == current_user.id)
        .all()
    )

    total_tasks = len(tasks)
    completed_tasks = sum(1 for task in tasks if task.status == "completed")
    pending_tasks = sum(1 for task in tasks if task.status != "completed")

    estimated_pending_minutes = sum(
        task.estimated_minutes or 0
        for task in tasks
        if task.status != "completed"
    )

    completed_sessions = (
        db.query(FocusSession)
        .filter(
            FocusSession.user_id == current_user.id,
            FocusSession.status == "completed",
            FocusSession.ended_at.isnot(None),
        )
        .all()
    )

    actual_focus_minutes = sum(
        max(
            0,
            int((session.ended_at - session.started_at).total_seconds() // 60),
        )
        for session in completed_sessions
    )

    completion_rate = (
        round((completed_tasks / total_tasks) * 100, 2)
        if total_tasks else 0.0
    )

    return {
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "pending_tasks": pending_tasks,
        "estimated_pending_minutes": estimated_pending_minutes,
        "actual_focus_minutes": actual_focus_minutes,
        "completion_rate_percent": completion_rate,
    }


@router.get("/fatigue")
def get_fatigue_estimate(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tasks = (
        db.query(Task)
        .filter(Task.user_id == current_user.id)
        .all()
    )

    pending_task_minutes = sum(
        task.estimated_minutes or 0
        for task in tasks
        if task.status != "completed"
    )

    work_logs = (
        db.query(WorkLog)
        .filter(
            WorkLog.user_id == current_user.id,
            WorkLog.ended_at.isnot(None),
        )
        .all()
    )

    work_minutes = 0
    total_break_minutes = 0
    total_interruptions = 0

    for log in work_logs:
        start = log.started_at
        end = log.ended_at

        # Normalize naive datetimes to UTC before subtracting.
        if start.tzinfo is None:
            start = start.replace(tzinfo=timezone.utc)
        if end.tzinfo is None:
            end = end.replace(tzinfo=timezone.utc)

        elapsed_minutes = max(
            0,
            int((end - start).total_seconds() // 60),
        )

        work_minutes += max(
            0, elapsed_minutes - log.break_minutes
        )
        total_break_minutes += log.break_minutes
        total_interruptions += log.interruption_count

    result = estimate_fatigue(
        pending_task_minutes=pending_task_minutes,
        work_minutes=work_minutes,
        break_minutes=total_break_minutes,
        interruption_count=total_interruptions,
    )

    return result


from datetime import date, datetime, time, timedelta


@router.get("/daily-activity")
def get_daily_activity(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = date.today()
    start_date = today - timedelta(days=6)
    start_datetime = datetime.combine(start_date, time.min)

    logs = (
        db.query(WorkLog)
        .filter(
            WorkLog.user_id == current_user.id,
            WorkLog.started_at >= start_datetime,
        )
        .order_by(WorkLog.started_at.asc())
        .all()
    )

    daily_data = {}

    for day_offset in range(7):
        day = start_date + timedelta(days=day_offset)
        daily_data[day.isoformat()] = {
            "date": day.isoformat(),
            "work_minutes": 0,
            "break_minutes": 0,
            "interruptions": 0,
            "sessions": 0,
        }

    for log in logs:
        day_key = log.started_at.date().isoformat()

        if day_key not in daily_data:
            continue

        work_minutes = 0

        if log.ended_at is not None:
            start = log.started_at
            end = log.ended_at

            # Handle timezone-aware and timezone-naive timestamps.
            if start.tzinfo is not None and end.tzinfo is None:
                end = end.replace(tzinfo=start.tzinfo)
            elif end.tzinfo is not None and start.tzinfo is None:
                start = start.replace(tzinfo=end.tzinfo)

            elapsed_minutes = max(
                0,
                int((end - start).total_seconds() // 60),
            )

            work_minutes = max(
                0,
                elapsed_minutes - (log.break_minutes or 0),
            )

        daily_data[day_key]["work_minutes"] += work_minutes
        daily_data[day_key]["break_minutes"] += log.break_minutes or 0
        daily_data[day_key]["interruptions"] += log.interruption_count or 0
        daily_data[day_key]["sessions"] += 1

    return {
        "period": "last_7_days",
        "daily_activity": list(daily_data.values()),
    }





class FatigueSimulationRequest(BaseModel):
    reduce_pending_minutes: int = Field(default=0, ge=0)
    reduce_work_minutes: int = Field(default=0, ge=0)
    reduce_interruptions: int = Field(default=0, ge=0)
    add_break_minutes: int = Field(default=0, ge=0)


@router.post("/fatigue/simulate")
def simulate_fatigue_endpoint(
    payload: FatigueSimulationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tasks = (
        db.query(Task)
        .filter(Task.user_id == current_user.id)
        .all()
    )

    pending_task_minutes = sum(
        task.estimated_minutes or 0
        for task in tasks
        if task.status != "completed"
    )

    logs = (
        db.query(WorkLog)
        .filter(
            WorkLog.user_id == current_user.id,
            WorkLog.ended_at.isnot(None),
        )
        .all()
    )

    work_minutes = 0
    break_minutes = 0
    interruptions = 0

    for log in logs:
        start = log.started_at
        end = log.ended_at

        if start.tzinfo is None:
            start = start.replace(tzinfo=timezone.utc)
        if end.tzinfo is None:
            end = end.replace(tzinfo=timezone.utc)

        elapsed = max(
            0,
            int((end - start).total_seconds() // 60),
        )

        work_minutes += max(
            0, elapsed - (log.break_minutes or 0)
        )
        break_minutes += log.break_minutes or 0
        interruptions += log.interruption_count or 0

    from app.services.fatigue_scoring import simulate_fatigue

    return simulate_fatigue(
        pending_task_minutes=pending_task_minutes,
        work_minutes=work_minutes,
        break_minutes=break_minutes,
        interruption_count=interruptions,
        reduce_pending_minutes=payload.reduce_pending_minutes,
        reduce_work_minutes=payload.reduce_work_minutes,
        reduce_interruptions=payload.reduce_interruptions,
        add_break_minutes=payload.add_break_minutes,
    )

@router.get("/recommendations")
def get_personalized_recommendations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.services.fatigue_scoring import estimate_fatigue

    tasks = (
        db.query(Task)
        .filter(Task.user_id == current_user.id)
        .all()
    )

    pending_task_minutes = sum(
        task.estimated_minutes or 0
        for task in tasks
        if task.status != "completed"
    )

    logs = (
        db.query(WorkLog)
        .filter(
            WorkLog.user_id == current_user.id,
            WorkLog.ended_at.isnot(None),
        )
        .all()
    )

    work_minutes = 0
    break_minutes = 0
    interruption_count = 0

    for log in logs:
        start = log.started_at
        end = log.ended_at

        if start.tzinfo is None:
            start = start.replace(tzinfo=timezone.utc)
        if end.tzinfo is None:
            end = end.replace(tzinfo=timezone.utc)

        elapsed = max(0, int((end - start).total_seconds() // 60))
        recorded_breaks = log.break_minutes or 0

        work_minutes += max(0, elapsed - recorded_breaks)
        break_minutes += recorded_breaks
        interruption_count += log.interruption_count or 0

    estimate = estimate_fatigue(
        pending_task_minutes=pending_task_minutes,
        work_minutes=work_minutes,
        break_minutes=break_minutes,
        interruption_count=interruption_count,
    )

    return {
        "fatigue_score": estimate["score"],
        "fatigue_level": estimate["level"],
        "recommendations": generate_recommendations(
            factors=estimate["factors"],
            weighted_contributions=estimate["weighted_contributions"],
            limit=3,
        ),
        "disclaimer": estimate["disclaimer"],
    }


class MLFatiguePredictionRequest(BaseModel):
    work_hours: float = Field(ge=0, le=24)
    interruption_count: int = Field(ge=0)
    pending_task_minutes: float = Field(ge=0)
    task_difficulty_1_to_5: int = Field(ge=1, le=5)
    sleep_hours: float | None = Field(default=None, ge=0, le=24)
    activity_type: str = Field(min_length=1, max_length=100)


@router.post("/fatigue/ml-predict")
def predict_fatigue_endpoint(
    payload: MLFatiguePredictionRequest,
    current_user: User = Depends(get_current_user),
):
    try:
        return predict_fatigue(
            work_hours=payload.work_hours,
            interruption_count=payload.interruption_count,
            pending_task_minutes=payload.pending_task_minutes,
            task_difficulty_1_to_5=payload.task_difficulty_1_to_5,
            sleep_hours=payload.sleep_hours,
            activity_type=payload.activity_type,
        )
    except FileNotFoundError:
        raise HTTPException(
            status_code=503,
            detail="The trained fatigue model is not available.",
        )
