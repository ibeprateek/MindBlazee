
import pytest

from app.services.recommendation_engine import generate_recommendations


def test_returns_highest_weighted_contributions_first():
    factors = {
        "workload": 80,
        "work_duration": 75,
        "interruptions": 60,
        "insufficient_breaks": 55,
    }

    contributions = {
        "workload": 20,
        "work_duration": 30,
        "interruptions": 12,
        "insufficient_breaks": 8,
    }

    result = generate_recommendations(
        factors=factors,
        weighted_contributions=contributions,
        limit=3,
    )

    assert len(result) == 3
    assert [item["factor"] for item in result] == [
        "work_duration",
        "workload",
        "interruptions",
    ]
    assert [item["priority"] for item in result] == [1, 2, 3]


def test_respects_factor_thresholds():
    factors = {
        "workload": 49,
        "work_duration": 50,
        "interruptions": 39,
        "insufficient_breaks": 40,
    }

    result = generate_recommendations(factors)

    assert {item["factor"] for item in result} == {
        "work_duration",
        "insufficient_breaks",
    }


def test_returns_general_fallback_when_no_threshold_is_met():
    result = generate_recommendations(
        factors={
            "workload": 10,
            "work_duration": 20,
            "interruptions": 15,
            "insufficient_breaks": 5,
        }
    )

    assert len(result) == 1
    assert result[0]["factor"] == "general"
    assert result[0]["action"] == "maintain_routine_and_reassess"
    assert result[0]["factor_score"] is None
    assert result[0]["weighted_contribution"] is None
    assert result[0]["priority"] == 1


def test_missing_factors_use_zero_and_fallback():
    result = generate_recommendations(factors={})

    assert len(result) == 1
    assert result[0]["factor"] == "general"


def test_limit_is_respected():
    factors = {
        "workload": 90,
        "work_duration": 80,
        "interruptions": 70,
        "insufficient_breaks": 60,
    }

    result = generate_recommendations(factors, limit=2)

    assert len(result) == 2
    assert [item["priority"] for item in result] == [1, 2]


@pytest.mark.parametrize("limit", [0, -1, -5])
def test_rejects_invalid_limit(limit):
    with pytest.raises(ValueError, match="limit must be at least 1"):
        generate_recommendations(
            factors={"workload": 90},
            limit=limit,
        )


def test_each_recommendation_contains_expected_fields():
    result = generate_recommendations(
        factors={"workload": 80},
    )

    recommendation = result[0]

    assert {
        "factor",
        "title",
        "message",
        "action",
        "factor_score",
        "weighted_contribution",
        "priority",
    }.issubset(recommendation.keys())


def test_factor_score_is_used_when_contribution_is_missing():
    result = generate_recommendations(
        factors={"workload": 70},
        weighted_contributions={},
    )

    assert result[0]["factor"] == "workload"
    assert result[0]["factor_score"] == 70
    assert result[0]["weighted_contribution"] == 70


def test_unknown_factors_do_not_create_recommendations():
    result = generate_recommendations(
        factors={"unknown_factor": 100},
    )

    assert len(result) == 1
    assert result[0]["factor"] == "general"
