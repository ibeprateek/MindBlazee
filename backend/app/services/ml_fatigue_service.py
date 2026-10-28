
from pathlib import Path

import joblib
import pandas as pd

BACKEND_DIR = Path(__file__).resolve().parents[2]
MODEL_PATH = BACKEND_DIR / "ml" / "artifacts" / "fatigue_model.joblib"

_model = None


def get_model():
    global _model

    if _model is None:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                f"Trained fatigue model not found: {MODEL_PATH}"
            )
        _model = joblib.load(MODEL_PATH)

    return _model


def predict_fatigue(
    work_hours: float,
    interruption_count: int,
    pending_task_minutes: float,
    task_difficulty_1_to_5: int,
    sleep_hours: float | None,
    activity_type: str,
) -> dict:
    if not 0 <= work_hours <= 24:
        raise ValueError("work_hours must be between 0 and 24")

    if interruption_count < 0:
        raise ValueError("interruption_count cannot be negative")

    if pending_task_minutes < 0:
        raise ValueError("pending_task_minutes cannot be negative")

    if not 1 <= task_difficulty_1_to_5 <= 5:
        raise ValueError("task_difficulty_1_to_5 must be between 1 and 5")

    if sleep_hours is not None and not 0 <= sleep_hours <= 24:
        raise ValueError("sleep_hours must be between 0 and 24")

    if not activity_type.strip():
        raise ValueError("activity_type cannot be empty")

    features = pd.DataFrame([{
        "work_hours": work_hours,
        "interruption_count": interruption_count,
        "pending_task_minutes": pending_task_minutes,
        "task_difficulty_1_to_5": task_difficulty_1_to_5,
        "sleep_hours": sleep_hours,
        "activity_type": activity_type.strip(),
    }])

    prediction = float(get_model().predict(features)[0])

    # Fatigue rating is defined on a 0–10 scale.
    prediction = max(0.0, min(10.0, prediction))

    return {
        "predicted_fatigue_rating": round(prediction, 2),
        "scale": "0-10",
        "model": "Ridge Regression",
        "disclaimer": (
            "Experimental prediction based on a small survey dataset. "
            "It is not a clinical measurement or diagnosis."
        ),
    }
