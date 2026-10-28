
from typing import Any


RECOMMENDATION_RULES = {
    "workload": {
        "threshold": 50,
        "title": "Prioritize your pending tasks",
        "message": (
            "Review your pending tasks, complete the most important "
            "ones first, and divide large tasks into smaller steps."
        ),
        "action": "prioritize_and_split_tasks",
    },
    "work_duration": {
        "threshold": 50,
        "title": "Plan a recovery break",
        "message": (
            "Consider taking a pause between demanding tasks and "
            "spreading lengthy work across manageable intervals."
        ),
        "action": "plan_recovery_pause",
    },
    "interruptions": {
        "threshold": 40,
        "title": "Create a focused work period",
        "message": (
            "Try silencing non-essential notifications and grouping "
            "messages into designated times."
        ),
        "action": "schedule_focus_block",
    },
    "insufficient_breaks": {
        "threshold": 40,
        "title": "Make room for breaks",
        "message": (
            "Consider scheduling short breaks during work and "
            "adjusting them to your needs."
        ),
        "action": "schedule_short_breaks",
    },
}


def generate_recommendations(
    factors: dict[str, float],
    weighted_contributions: dict[str, float] | None = None,
    limit: int = 3,
) -> list[dict[str, Any]]:
    """
    Generate prioritized recommendations from MindBlaze factor scores.

    Factor scores and weighted contributions come from the existing
    fatigue-scoring engine. This is a transparent rule-based prototype,
    not a trained or clinically validated recommendation model.
    """
    if limit < 1:
        raise ValueError("limit must be at least 1")

    candidates = []

    for factor, rule in RECOMMENDATION_RULES.items():
        score = float(factors.get(factor, 0))

        if score >= rule["threshold"]:
            contribution = float(
                (weighted_contributions or {}).get(factor, score)
            )

            candidates.append({
                "factor": factor,
                "title": rule["title"],
                "message": rule["message"],
                "action": rule["action"],
                "factor_score": round(score, 2),
                "weighted_contribution": round(contribution, 2),
                "priority": 0,
            })

    # Address the largest weighted contributors first.
    candidates.sort(
        key=lambda item: item["weighted_contribution"],
        reverse=True,
    )

    recommendations = candidates[:limit]

    for index, recommendation in enumerate(recommendations, start=1):
        recommendation["priority"] = index

    if not recommendations:
        return [{
            "factor": "general",
            "title": "Maintain a balanced routine",
            "message": (
                "Your recorded workload indicators are below the "
                "recommendation thresholds. Continue monitoring your "
                "work patterns and take breaks when needed."
            ),
            "action": "maintain_routine_and_reassess",
            "factor_score": None,
            "weighted_contribution": None,
            "priority": 1,
        }]

    return recommendations
