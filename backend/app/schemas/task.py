
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


TaskPriority = Literal["low", "medium", "high"]
TaskStatus = Literal["pending", "in_progress", "completed", "cancelled"]


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    priority: TaskPriority = "medium"
    status: TaskStatus = "pending"
    estimated_minutes: int | None = Field(default=None, gt=0)
    due_at: datetime | None = None


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    priority: TaskPriority | None = None
    status: TaskStatus | None = None
    estimated_minutes: int | None = Field(default=None, gt=0)
    due_at: datetime | None = None


class TaskResponse(BaseModel):
    id: int
    user_id: int
    title: str
    description: str | None
    priority: str
    status: str
    estimated_minutes: int | None
    due_at: datetime | None
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
