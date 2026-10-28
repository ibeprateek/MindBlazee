
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class RecommendationFeedbackCreate(BaseModel):
    recommendation_factor: str = Field(min_length=1, max_length=100)
    recommendation_title: str = Field(min_length=1, max_length=255)
    feedback_type: Literal["helpful", "not_helpful", "will_try"]


class RecommendationFeedbackResponse(BaseModel):
    id: int
    recommendation_factor: str
    recommendation_title: str
    feedback_type: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
