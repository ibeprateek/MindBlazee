
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.security import get_current_user
from app.db.dependencies import get_db
from app.models.user import User
from app.models.recommendation_feedback import RecommendationFeedback
from app.schemas.recommendation_feedback import (
    RecommendationFeedbackCreate,
    RecommendationFeedbackResponse,
)

router = APIRouter(
    prefix="/recommendation-feedback",
    tags=["Recommendation Feedback"],
)


@router.post(
    "/",
    response_model=RecommendationFeedbackResponse,
    status_code=status.HTTP_201_CREATED,
)
def submit_recommendation_feedback(
    payload: RecommendationFeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    feedback = RecommendationFeedback(
        user_id=current_user.id,
        recommendation_factor=payload.recommendation_factor.strip(),
        recommendation_title=payload.recommendation_title.strip(),
        feedback_type=payload.feedback_type,
    )

    if not feedback.recommendation_factor or not feedback.recommendation_title:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Recommendation factor and title cannot be blank.",
        )

    try:
        db.add(feedback)
        db.commit()
        db.refresh(feedback)
        return feedback
    except Exception:
        db.rollback()
        raise


@router.get(
    "/",
    response_model=list[RecommendationFeedbackResponse],
)
def get_my_recommendation_feedback(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(RecommendationFeedback)
        .filter(
            RecommendationFeedback.user_id == current_user.id
        )
        .order_by(RecommendationFeedback.created_at.desc())
        .all()
    )


@router.get("/analytics")
def get_my_feedback_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Count feedback responses by type for the current user.
    type_rows = (
        db.query(
            RecommendationFeedback.feedback_type,
            func.count(RecommendationFeedback.id),
        )
        .filter(
            RecommendationFeedback.user_id == current_user.id
        )
        .group_by(RecommendationFeedback.feedback_type)
        .all()
    )

    counts = {
        "helpful": 0,
        "not_helpful": 0,
        "will_try": 0,
    }

    for feedback_type, count in type_rows:
        if feedback_type in counts:
            counts[feedback_type] = count

    total = sum(counts.values())

    helpfulness_percentage = (
        round(counts["helpful"] / total * 100, 2)
        if total > 0
        else 0.0
    )

    # Group responses by recommendation.
    recommendation_rows = (
        db.query(
            RecommendationFeedback.recommendation_factor,
            RecommendationFeedback.recommendation_title,
            RecommendationFeedback.feedback_type,
            func.count(RecommendationFeedback.id),
        )
        .filter(
            RecommendationFeedback.user_id == current_user.id
        )
        .group_by(
            RecommendationFeedback.recommendation_factor,
            RecommendationFeedback.recommendation_title,
            RecommendationFeedback.feedback_type,
        )
        .all()
    )

    recommendation_map = {}

    for factor, title, feedback_type, count in recommendation_rows:
        key = (factor, title)

        if key not in recommendation_map:
            recommendation_map[key] = {
                "factor": factor,
                "title": title,
                "helpful": 0,
                "not_helpful": 0,
                "will_try": 0,
                "total": 0,
            }

        recommendation_map[key][feedback_type] = count
        recommendation_map[key]["total"] += count

    return {
        "total_feedback": total,
        "helpful_count": counts["helpful"],
        "not_helpful_count": counts["not_helpful"],
        "will_try_count": counts["will_try"],
        "helpfulness_percentage": helpfulness_percentage,
        "recommendation_breakdown": list(
            recommendation_map.values()
        ),
        "note": (
            "Helpfulness percentage is the share of submitted feedback "
            "marked Helpful; it does not measure clinical effectiveness."
        ),
    }
