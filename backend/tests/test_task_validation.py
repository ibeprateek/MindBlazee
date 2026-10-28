
from tests.test_auth import register_and_login


def test_task_creation_rejects_missing_title(client):
    headers = register_and_login(
        client, "validation-missing-title@example.com"
    )

    response = client.post(
        "/api/v1/tasks/",
        headers=headers,
        json={
            "priority": "medium",
            "status": "pending",
            "estimated_minutes": 30,
            "due_at": None,
        },
    )

    assert response.status_code == 422, response.text


def test_task_creation_rejects_negative_estimated_minutes(client):
    headers = register_and_login(
        client, "validation-negative-minutes@example.com"
    )

    response = client.post(
        "/api/v1/tasks/",
        headers=headers,
        json={
            "title": "Invalid duration task",
            "priority": "medium",
            "status": "pending",
            "estimated_minutes": -10,
            "due_at": None,
        },
    )

    assert response.status_code in (400, 422), response.text


def test_task_creation_rejects_invalid_priority(client):
    headers = register_and_login(
        client, "validation-invalid-priority@example.com"
    )

    response = client.post(
        "/api/v1/tasks/",
        headers=headers,
        json={
            "title": "Invalid priority task",
            "priority": "urgent_invalid",
            "status": "pending",
            "estimated_minutes": 30,
            "due_at": None,
        },
    )

    assert response.status_code == 422, response.text


def test_task_creation_rejects_invalid_status(client):
    headers = register_and_login(
        client, "validation-invalid-status@example.com"
    )

    response = client.post(
        "/api/v1/tasks/",
        headers=headers,
        json={
            "title": "Invalid status task",
            "priority": "medium",
            "status": "unknown_status",
            "estimated_minutes": 30,
            "due_at": None,
        },
    )

    assert response.status_code == 422, response.text
