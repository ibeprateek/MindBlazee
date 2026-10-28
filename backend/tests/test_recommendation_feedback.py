
from app.models import User



def register_and_login(client, email: str):
    password = "TestPassword123!"

    register_response = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": password,
        },
    )

    assert register_response.status_code in (200, 201), (
        register_response.text
    )

    # Your login endpoint expects JSON, not form data.
    login_response = client.post(
        "/api/v1/auth/login",
        json={
            "email": email,
            "password": password,
        },
    )

    assert login_response.status_code == 200, login_response.text

    token = login_response.json()["access_token"]

    return {"Authorization": f"Bearer {token}"}



def test_submit_feedback(client):
    headers = register_and_login(
        client,
        "feedback_submit@example.com",
    )

    response = client.post(
        "/api/v1/recommendation-feedback/",
        headers=headers,
        json={
            "recommendation_factor": "workload",
            "recommendation_title": "Prioritize and split tasks",
            "feedback_type": "helpful",
        },
    )

    assert response.status_code == 201, response.text

    body = response.json()
    assert body["recommendation_factor"] == "workload"
    assert body["recommendation_title"] == "Prioritize and split tasks"
    assert body["feedback_type"] == "helpful"
    assert "id" in body
    assert "created_at" in body


def test_reject_invalid_feedback_type(client):
    headers = register_and_login(
        client,
        "feedback_invalid@example.com",
    )

    response = client.post(
        "/api/v1/recommendation-feedback/",
        headers=headers,
        json={
            "recommendation_factor": "workload",
            "recommendation_title": "Prioritize and split tasks",
            "feedback_type": "excellent",
        },
    )

    assert response.status_code == 422


def test_feedback_requires_authentication(client):
    response = client.post(
        "/api/v1/recommendation-feedback/",
        json={
            "recommendation_factor": "workload",
            "recommendation_title": "Prioritize and split tasks",
            "feedback_type": "helpful",
        },
    )

    assert response.status_code in (401, 403)


def test_feedback_analytics_counts(client):
    headers = register_and_login(
        client,
        "feedback_analytics@example.com",
    )

    feedback_items = [
        ("workload", "Split tasks", "helpful"),
        ("workload", "Split tasks", "helpful"),
        ("interruptions", "Schedule focus time", "not_helpful"),
        ("work_duration", "Take a break", "will_try"),
    ]

    for factor, title, feedback_type in feedback_items:
        response = client.post(
            "/api/v1/recommendation-feedback/",
            headers=headers,
            json={
                "recommendation_factor": factor,
                "recommendation_title": title,
                "feedback_type": feedback_type,
            },
        )

        assert response.status_code == 201, response.text

    response = client.get(
        "/api/v1/recommendation-feedback/analytics",
        headers=headers,
    )

    assert response.status_code == 200, response.text

    body = response.json()
    assert body["total_feedback"] == 4
    assert body["helpful_count"] == 2
    assert body["not_helpful_count"] == 1
    assert body["will_try_count"] == 1
    assert body["helpfulness_percentage"] == 50.0

    breakdown = {
        item["title"]: item
        for item in body["recommendation_breakdown"]
    }

    assert breakdown["Split tasks"]["helpful"] == 2
    assert breakdown["Split tasks"]["total"] == 2
    assert breakdown["Schedule focus time"]["not_helpful"] == 1
    assert breakdown["Take a break"]["will_try"] == 1


def test_users_only_see_their_own_feedback(client):
    first_headers = register_and_login(
        client,
        "feedback_owner1@example.com",
    )
    second_headers = register_and_login(
        client,
        "feedback_owner2@example.com",
    )

    create_response = client.post(
        "/api/v1/recommendation-feedback/",
        headers=first_headers,
        json={
            "recommendation_factor": "workload",
            "recommendation_title": "Split tasks",
            "feedback_type": "helpful",
        },
    )

    assert create_response.status_code == 201, create_response.text

    first_list = client.get(
        "/api/v1/recommendation-feedback/",
        headers=first_headers,
    )
    second_list = client.get(
        "/api/v1/recommendation-feedback/",
        headers=second_headers,
    )

    assert first_list.status_code == 200
    assert len(first_list.json()) == 1

    assert second_list.status_code == 200
    assert second_list.json() == []

    second_analytics = client.get(
        "/api/v1/recommendation-feedback/analytics",
        headers=second_headers,
    )

    assert second_analytics.status_code == 200
    assert second_analytics.json()["total_feedback"] == 0


def test_feedback_rejects_missing_required_fields(client):
    headers = register_and_login(
        client, "feedback-missing-fields@example.com"
    )

    response = client.post(
        "/api/v1/recommendation-feedback/",
        headers=headers,
        json={
            "recommendation_factor": "workload",
        },
    )

    assert response.status_code == 422, response.text


def test_feedback_rejects_empty_recommendation_title(client):
    headers = register_and_login(
        client, "feedback-empty-title@example.com"
    )

    response = client.post(
        "/api/v1/recommendation-feedback/",
        headers=headers,
        json={
            "recommendation_factor": "workload",
            "recommendation_title": "",
            "feedback_type": "helpful",
        },
    )

    assert response.status_code in (400, 422), response.text
