
from dataclasses import dataclass
from app.services.recommendation_engine import generate_recommendations


@dataclass(frozen=True)
class FatigueWeights:
    workload: float = 0.35
    work_duration: float = 0.30
    interruptions: float = 0.20
    insufficient_breaks: float = 0.15


DEFAULT_WEIGHTS = FatigueWeights()


def _clamp(
    value: float,
    minimum: float = 0,
    maximum: float = 100,
) -> float:
    return max(minimum, min(value, maximum))


def _validate_inputs(
    pending_task_minutes: int,
    work_minutes: int,
    break_minutes: int,
    interruption_count: int,
) -> None:
    values = {
        "pending_task_minutes": pending_task_minutes,
        "work_minutes": work_minutes,
        "break_minutes": break_minutes,
        "interruption_count": interruption_count,
    }

    for name, value in values.items():
        if isinstance(value, bool) or not isinstance(value, int):
            raise ValueError(f"{name} must be an integer")

        if value < 0:
            raise ValueError(f"{name} cannot be negative")


def _validate_weights(weights: FatigueWeights) -> None:
    weight_values = (
        weights.workload,
        weights.work_duration,
        weights.interruptions,
        weights.insufficient_breaks,
    )

    if any(
        isinstance(weight, bool)
        or not isinstance(weight, (int, float))
        for weight in weight_values
    ):
        raise ValueError("Weights must be numeric")

    if any(
        weight < 0 or weight > 1
        for weight in weight_values
    ):
        raise ValueError("Each weight must be between 0 and 1")

    if not abs(sum(weight_values) - 1.0) < 1e-9:
        raise ValueError("Weights must sum to 1")


def _calculate_factors(
    pending_task_minutes: int,
    work_minutes: int,
    break_minutes: int,
    interruption_count: int,
) -> dict:
    # Eight hours of pending work maps to 100.
    workload_score = _clamp(
        pending_task_minutes / 480 * 100
    )

    # Eight hours of recorded work maps to 100.
    duration_score = _clamp(
        work_minutes / 480 * 100
    )

    # Ten or more interruptions maps to 100.
    interruption_score = _clamp(
        interruption_count / 10 * 100
    )

    # Prototype target: five break minutes per work hour.
    expected_break_minutes = (work_minutes / 60) * 5

    if expected_break_minutes == 0:
        break_deficit_score = 0.0
    else:
        break_deficit_score = _clamp(
            (
                expected_break_minutes - break_minutes
            ) / expected_break_minutes * 100
        )

    return {
        "workload": round(workload_score, 2),
        "work_duration": round(duration_score, 2),
        "interruptions": round(interruption_score, 2),
        "insufficient_breaks": round(break_deficit_score, 2),
    }


def _get_level(score: float) -> str:
    if score < 34:
        return "low"
    if score < 67:
        return "moderate"
    return "high"


def _get_recommendations(factors: dict) -> list[dict]:
    recommendations = []

    if factors["workload"] >= 50:
        recommendations.append({
            "factor": "workload",
            "title": "Reduce your pending workload",
            "message": (
                "Review pending tasks, prioritise the most important "
                "ones, and divide large tasks into smaller steps."
            ),
        })

    if factors["work_duration"] >= 50:
        recommendations.append({
            "factor": "work_duration",
            "title": "Take a recovery break",
            "message": (
                "Consider pausing between demanding tasks and "
                "spreading lengthy work across manageable intervals."
            ),
        })

    if factors["interruptions"] >= 40:
        recommendations.append({
            "factor": "interruptions",
            "title": "Reduce interruptions",
            "message": (
                "Try a notification-free focus period and group "
                "messages or other distractions into designated times."
            ),
        })

    if factors["insufficient_breaks"] >= 40:
        recommendations.append({
            "factor": "insufficient_breaks",
            "title": "Make room for breaks",
            "message": (
                "Consider scheduling short breaks during work "
                "and adjusting them to your needs."
            ),
        })

    if not recommendations:
        recommendations.append({
            "factor": "general",
            "title": "Maintain a balanced routine",
            "message": (
                "Your recorded workload indicators are relatively low. "
                "Continue monitoring your work patterns and take breaks "
                "whenever you need them."
            ),
        })

    return recommendations


def estimate_fatigue(
    pending_task_minutes: int,
    work_minutes: int,
    break_minutes: int,
    interruption_count: int,
    weights: FatigueWeights = DEFAULT_WEIGHTS,
) -> dict:
    """
    Calculate an experimental workload-related score from 0 to 100.

    This heuristic is not a clinically validated measure of fatigue.
    """
    _validate_inputs(
        pending_task_minutes,
        work_minutes,
        break_minutes,
        interruption_count,
    )
    _validate_weights(weights)

    factors = _calculate_factors(
        pending_task_minutes,
        work_minutes,
        break_minutes,
        interruption_count,
    )

    weighted_contributions = {
        "workload": factors["workload"] * weights.workload,
        "work_duration": (
            factors["work_duration"] * weights.work_duration
        ),
        "interruptions": (
            factors["interruptions"] * weights.interruptions
        ),
        "insufficient_breaks": (
            factors["insufficient_breaks"]
            * weights.insufficient_breaks
        ),
    }

    score = round(
        _clamp(sum(weighted_contributions.values())),
        2,
    )

    return {
        "score": score,
        "level": _get_level(score),
        "factors": factors,
        "weighted_contributions": {
            key: round(value, 2)
            for key, value in weighted_contributions.items()
        },
        "weights": {
            "workload": weights.workload,
            "work_duration": weights.work_duration,
            "interruptions": weights.interruptions,
            "insufficient_breaks": weights.insufficient_breaks,
        },
        "recommendations": generate_recommendations(
            factors=factors,
            weighted_contributions=weighted_contributions,
            limit=3,
        ),
        "input_summary": {
            "pending_task_minutes": pending_task_minutes,
            "work_minutes": work_minutes,
            "break_minutes": break_minutes,
            "interruption_count": interruption_count,
        },
        "disclaimer": (
            "Experimental workload-related estimate; not a clinical "
            "measurement or diagnosis. The scoring thresholds and "
            "weights have not been clinically validated."
        ),
    }


def simulate_fatigue(
    pending_task_minutes: int,
    work_minutes: int,
    break_minutes: int,
    interruption_count: int,
    reduce_pending_minutes: int = 0,
    reduce_work_minutes: int = 0,
    reduce_interruptions: int = 0,
    add_break_minutes: int = 0,
) -> dict:
    """
    Compare the current heuristic score with a hypothetical scenario.

    Scenario adjustments cannot produce negative input values.
    """
    _validate_inputs(
        pending_task_minutes,
        work_minutes,
        break_minutes,
        interruption_count,
    )

    adjustments = {
        "reduce_pending_minutes": reduce_pending_minutes,
        "reduce_work_minutes": reduce_work_minutes,
        "reduce_interruptions": reduce_interruptions,
        "add_break_minutes": add_break_minutes,
    }

    for name, value in adjustments.items():
        if isinstance(value, bool) or not isinstance(value, int):
            raise ValueError(f"{name} must be an integer")
        if value < 0:
            raise ValueError(f"{name} cannot be negative")

    scenario = {
        "pending_task_minutes": max(
            0, pending_task_minutes - reduce_pending_minutes
        ),
        "work_minutes": max(
            0, work_minutes - reduce_work_minutes
        ),
        "break_minutes": break_minutes + add_break_minutes,
        "interruption_count": max(
            0, interruption_count - reduce_interruptions
        ),
    }

    current = estimate_fatigue(
        pending_task_minutes=pending_task_minutes,
        work_minutes=work_minutes,
        break_minutes=break_minutes,
        interruption_count=interruption_count,
    )

    projected = estimate_fatigue(**scenario)

    return {
        "current_score": current["score"],
        "projected_score": projected["score"],
        "score_difference": round(
            projected["score"] - current["score"], 2
        ),
        "current_level": current["level"],
        "projected_level": projected["level"],
        "current_factors": current["factors"],
        "projected_factors": projected["factors"],
        "current_weighted_contributions": current["weighted_contributions"],
        "projected_weighted_contributions": projected["weighted_contributions"],
        "weights": current["weights"],
        "scenario_inputs": scenario,
        "recommendations": projected["recommendations"],
        "disclaimer": current["disclaimer"],
    }
