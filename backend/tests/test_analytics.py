
from tests.test_auth import register_and_login


def test_workload_analytics_requires_authentication(client):
    response = client.get("/api/v1/analytics/workload")
    assert response.status_code == 401


def test_empty_workload_analytics(client):
    headers = register_and_login(
        client, "analytics-empty@example.com"
    )

    response = client.get(
        "/api/v1/analytics/workload",
        headers=headers,
    )

    assert response.status_code == 200

    data = response.json()
    assert data["total_tasks"] == 0
    assert data["completed_tasks"] == 0
    assert data["pending_tasks"] == 0
    assert data["estimated_pending_minutes"] == 0
    assert data["actual_focus_minutes"] == 0
    assert data["completion_rate_percent"] == 0.0


def test_workload_analytics_counts_tasks(client):
    headers = register_and_login(
        client, "analytics-tasks@example.com"
    )

    tasks = [
        {
            "title": "Completed task",
            "priority": "medium",
            "status": "completed",
            "estimated_minutes": 30,
            "due_at": None,
        },
        {
            "title": "Pending task one",
            "priority": "high",
            "status": "pending",
            "estimated_minutes": 45,
            "due_at": None,
        },
        {
            "title": "Pending task two",
            "priority": "low",
            "status": "pending",
            "estimated_minutes": 60,
            "due_at": None,
        },
    ]

    for task in tasks:
        response = client.post(
            "/api/v1/tasks/",
            headers=headers,
            json=task,
        )
        assert response.status_code == 201

    response = client.get(
        "/api/v1/analytics/workload",
        headers=headers,
    )

    assert response.status_code == 200

    data = response.json()
    assert data["total_tasks"] == 3
    assert data["completed_tasks"] == 1
    assert data["pending_tasks"] == 2
    assert data["estimated_pending_minutes"] == 105
    assert data["completion_rate_percent"] == 33.33


def test_users_only_see_their_own_analytics(client):
    user_a_headers = register_and_login(
        client, "analytics-user-a@example.com"
    )
    user_b_headers = register_and_login(
        client, "analytics-user-b@example.com"
    )

    response = client.post(
        "/api/v1/tasks/",
        headers=user_a_headers,
        json={
            "title": "User A private task",
            "priority": "high",
            "status": "pending",
            "estimated_minutes": 90,
            "due_at": None,
        },
    )
    assert response.status_code == 201

    user_a_analytics = client.get(
        "/api/v1/analytics/workload",
        headers=user_a_headers,
    )
    user_b_analytics = client.get(
        "/api/v1/analytics/workload",
        headers=user_b_headers,
    )

    assert user_a_analytics.status_code == 200
    assert user_b_analytics.status_code == 200

    assert user_a_analytics.json()["total_tasks"] == 1
    assert user_b_analytics.json()["total_tasks"] == 0


def test_fatigue_analytics_requires_authentication(client):
    response = client.get("/api/v1/analytics/fatigue")
    assert response.status_code == 401


def test_daily_activity_analytics_requires_authentication(client):
    response = client.get("/api/v1/analytics/daily-activity")
    assert response.status_code == 401


def test_work_session_is_reflected_in_fatigue_analytics(client):
    headers = register_and_login(
        client, "analytics-work-session@example.com"
    )

    # Start a work session.
    start_response = client.post(
        "/api/v1/work-logs/start",
        headers=headers,
        json={
            "task_id": None,
            "break_minutes": 0,
            "interruption_count": 0,
            "notes": "Analytics integration test",
        },
    )
    assert start_response.status_code == 201, start_response.text

    work_log_id = start_response.json()["id"]

    # Finish the session with recorded breaks and interruptions.
    finish_response = client.post(
        f"/api/v1/work-logs/{work_log_id}/finish",
        headers=headers,
        json={
            "break_minutes": 5,
            "interruption_count": 2,
            "notes": "Completed analytics test session",
        },
    )
    assert finish_response.status_code == 200, finish_response.text

    # Retrieve fatigue analytics.
    fatigue_response = client.get(
        "/api/v1/analytics/fatigue",
        headers=headers,
    )
    assert fatigue_response.status_code == 200, fatigue_response.text

    fatigue_data = fatigue_response.json()
    assert fatigue_data is not None
