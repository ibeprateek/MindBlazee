
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class FocusSessionStart(BaseModel):
    task_id: int | None = Field(default=None, gt=0)


class FocusSessionResponse(BaseModel):
    id: int
    user_id: int
    task_id: int | None
    started_at: datetime
    ended_at: datetime | None
    status: Literal["active", "completed"]

    model_config = ConfigDict(from_attributes=True)
