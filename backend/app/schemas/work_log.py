
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class WorkLogCreate(BaseModel):
    task_id: int | None = Field(default=None, gt=0)
    break_minutes: int = Field(default=0, ge=0)
    interruption_count: int = Field(default=0, ge=0)
    notes: str | None = None


class WorkLogFinish(BaseModel):
    break_minutes: int | None = Field(default=None, ge=0)
    interruption_count: int | None = Field(default=None, ge=0)
    notes: str | None = None


class WorkLogResponse(BaseModel):
    id: int
    user_id: int
    task_id: int | None
    started_at: datetime
    ended_at: datetime | None
    break_minutes: int
    interruption_count: int
    notes: str | None
    created_at: datetime
    status: Literal["active", "completed"]
    actual_work_minutes: int | None

    model_config = ConfigDict(from_attributes=True)
