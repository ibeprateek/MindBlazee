
from tests.test_recommendation_feedback import register_and_login


def test_recommendation_feedback_end_to_end(client):
    headers = register_and_login(
        client,
        "recommendation-workflow@example.com",
    )

    # 1. Retrieve personalized recommendations.
    recommendations_response = client.get(
        "/api/v1/analytics/recommendations",
        headers=headers,
    )

    assert recommendations_response.status_code == 200, (
        recommendations_response.text
    )

    recommendations_data = recommendations_response.json()

    # Support either a list response or an object containing recommendations.
    if isinstance(recommendations_data, dict):
        recommendations = recommendations_data.get(
            "recommendations", []
        )
    else:
        recommendations = recommendations_data

    assert isinstance(recommendations, list)
    assert len(recommendations) > 0

    # 2. Submit feedback on the first recommendation.
    recommendation = recommendations[0]

    factor = recommendation.get(
        "factor", recommendation.get("recommendation_factor")
    )
    title = recommendation.get(
        "title", recommendation.get("recommendation_title")
    )

    assert factor is not None
    assert title is not None

    feedback_response = client.post(
        "/api/v1/recommendation-feedback/",
        headers=headers,
        json={
            "recommendation_factor": factor,
            "recommendation_title": title,
            "feedback_type": "helpful",
        },
    )

    assert feedback_response.status_code == 201, (
        feedback_response.text
    )

    # 3. Verify the saved feedback appears in analytics.
    analytics_response = client.get(
        "/api/v1/recommendation-feedback/analytics",
        headers=headers,
    )

    assert analytics_response.status_code == 200, (
        analytics_response.text
    )

    analytics = analytics_response.json()
    assert analytics["total_feedback"] == 1
    assert analytics["helpful_count"] == 1
    assert analytics["helpfulness_percentage"] == 100.0
