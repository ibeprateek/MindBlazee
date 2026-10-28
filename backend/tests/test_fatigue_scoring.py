
import pytest

from app.services.fatigue_scoring import estimate_fatigue


def test_score_is_between_zero_and_one_hundred():
    result = estimate_fatigue(
        pending_task_minutes=180,
        work_minutes=240,
        break_minutes=15,
        interruption_count=3,
    )

    assert 0 <= result["score"] <= 100
    assert result["level"] in {"low", "moderate", "high"}


def test_zero_workload_and_no_work_returns_zero():
    result = estimate_fatigue(
        pending_task_minutes=0,
        work_minutes=0,
        break_minutes=0,
        interruption_count=0,
    )

    assert result["score"] == 0
    assert result["level"] == "low"


def test_more_interruptions_increase_score():
    common = {
        "pending_task_minutes": 120,
        "work_minutes": 120,
        "break_minutes": 10,
    }

    fewer = estimate_fatigue(
        **common, interruption_count=1
    )
    more = estimate_fatigue(
        **common, interruption_count=8
    )

    assert more["score"] > fewer["score"]


def test_negative_inputs_are_rejected():
    with pytest.raises(ValueError):
        estimate_fatigue(
            pending_task_minutes=-10,
            work_minutes=60,
            break_minutes=5,
            interruption_count=1,
        )


def test_weights_must_sum_to_one():
    from app.services.fatigue_scoring import FatigueWeights

    with pytest.raises(ValueError):
        estimate_fatigue(
            pending_task_minutes=60,
            work_minutes=60,
            break_minutes=5,
            interruption_count=1,
            weights=FatigueWeights(
                workload=0.5,
                work_duration=0.5,
                interruptions=0.5,
                insufficient_breaks=0.5,
            ),
        )
