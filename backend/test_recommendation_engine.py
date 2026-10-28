
from app.services.recommendation_engine import generate_recommendations


def test_prioritizes_highest_weighted_contribution():
    factors = {
        "workload": 80,
        "work_duration": 70,
        "interruptions": 50,
        "insufficient_breaks": 20,
    }

    contributions = {
        "workload": 28,
        "work_duration": 21,
        "interruptions": 10,
        "insufficient_breaks": 3,
    }

    result = generate_recommendations(factors, contributions)

    assert len(result) == 3
    assert result[0]["factor"] == "workload"
    assert result[0]["priority"] == 1
    assert result[1]["factor"] == "work_duration"
    assert result[2]["factor"] == "interruptions"


def test_returns_general_recommendation_when_no_threshold_is_met():
    factors = {
        "workload": 10,
        "work_duration": 20,
        "interruptions": 10,
        "insufficient_breaks": 15,
    }

    result = generate_recommendations(factors)

    assert len(result) == 1
    assert result[0]["factor"] == "general"


def test_respects_recommendation_limit():
    factors = {
        "workload": 90,
        "work_duration": 90,
        "interruptions": 80,
        "insufficient_breaks": 80,
    }

    result = generate_recommendations(factors, limit=2)

    assert len(result) == 2
