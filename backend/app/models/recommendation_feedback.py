
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class RecommendationFeedback(Base):
    __tablename__ = "recommendation_feedback"

    __table_args__ = (
        CheckConstraint(
            "feedback_type IN ('helpful', 'not_helpful', 'will_try')",
            name="ck_recommendation_feedback_type",
        ),
        Index(
            "ix_recommendation_feedback_user_created",
            "user_id",
            "created_at",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    recommendation_factor: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    recommendation_title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    feedback_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    user: Mapped["User"] = relationship()
