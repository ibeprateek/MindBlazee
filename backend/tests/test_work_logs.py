
from tests.test_auth import register_and_login


def test_work_logs_require_authentication(client):
    response = client.get("/api/v1/work-logs/")
    assert response.status_code == 401


def test_start_list_and_finish_work_log(client):
    headers = register_and_login(
        client, "worklog-lifecycle@example.com"
    )

    start_response = client.post(
        "/api/v1/work-logs/start",
        headers=headers,
        json={
            "task_id": None,
            "break_minutes": 0,
            "interruption_count": 0,
            "notes": "Test work session",
        },
    )

    assert start_response.status_code == 201
    started = start_response.json()
    assert started["status"] == "active"
    assert started["ended_at"] is None
    assert started["actual_work_minutes"] is None

    log_id = started["id"]

    list_response = client.get(
        "/api/v1/work-logs/",
        headers=headers,
    )
    assert list_response.status_code == 200
    assert any(log["id"] == log_id for log in list_response.json())

    finish_response = client.post(
        f"/api/v1/work-logs/{log_id}/finish",
        headers=headers,
        json={
            "break_minutes": 5,
            "interruption_count": 2,
            "notes": "Finished work session",
        },
    )

    assert finish_response.status_code == 200
    finished = finish_response.json()
    assert finished["status"] == "completed"
    assert finished["ended_at"] is not None
    assert finished["break_minutes"] == 5
    assert finished["interruption_count"] == 2
    assert finished["actual_work_minutes"] >= 0


def test_user_cannot_finish_another_users_work_log(client):
    user_a_headers = register_and_login(
        client, "worklog-owner@example.com"
    )
    user_b_headers = register_and_login(
        client, "worklog-other@example.com"
    )

    start_response = client.post(
        "/api/v1/work-logs/start",
        headers=user_a_headers,
        json={"task_id": None},
    )
    assert start_response.status_code == 201

    log_id = start_response.json()["id"]

    finish_response = client.post(
        f"/api/v1/work-logs/{log_id}/finish",
        headers=user_b_headers,
        json={},
    )
    assert finish_response.status_code == 404


def test_cannot_finish_work_log_twice(client):
    headers = register_and_login(
        client, "worklog-double-finish@example.com"
    )

    start_response = client.post(
        "/api/v1/work-logs/start",
        headers=headers,
        json={"task_id": None},
    )
    assert start_response.status_code == 201

    log_id = start_response.json()["id"]

    first_finish = client.post(
        f"/api/v1/work-logs/{log_id}/finish",
        headers=headers,
        json={},
    )
    assert first_finish.status_code == 200

    second_finish = client.post(
        f"/api/v1/work-logs/{log_id}/finish",
        headers=headers,
        json={},
    )
    assert second_finish.status_code == 409


def test_users_only_see_their_own_work_logs(client):
    user_a_headers = register_and_login(
        client, "worklog-owner-a@example.com"
    )
    user_b_headers = register_and_login(
        client, "worklog-owner-b@example.com"
    )

    create_response = client.post(
        "/api/v1/work-logs/start",
        headers=user_a_headers,
        json={
            "break_minutes": 0,
            "interruption_count": 0,
            "notes": "Private work log",
        },
    )

    assert create_response.status_code == 201, create_response.text
    log_id = create_response.json()["id"]

    owner_logs = client.get(
        "/api/v1/work-logs/",
        headers=user_a_headers,
    )
    other_user_logs = client.get(
        "/api/v1/work-logs/",
        headers=user_b_headers,
    )

    assert owner_logs.status_code == 200
    assert any(item["id"] == log_id for item in owner_logs.json())

    assert other_user_logs.status_code == 200
    assert all(item["id"] != log_id for item in other_user_logs.json())


def test_user_cannot_finish_another_users_work_log(client):
    user_a_headers = register_and_login(
        client, "worklog-finish-a@example.com"
    )
    user_b_headers = register_and_login(
        client, "worklog-finish-b@example.com"
    )

    create_response = client.post(
        "/api/v1/work-logs/start",
        headers=user_a_headers,
        json={
            "break_minutes": 0,
            "interruption_count": 0,
            "notes": "Owner's active work log",
        },
    )

    assert create_response.status_code == 201, create_response.text
    log_id = create_response.json()["id"]

    finish_response = client.post(
        f"/api/v1/work-logs/{log_id}/finish",
        headers=user_b_headers,
        json={
            "break_minutes": 5,
            "interruption_count": 1,
            "notes": "Unauthorized update",
        },
    )

    assert finish_response.status_code == 404

    # The owner can still finish the work log.
    owner_finish_response = client.post(
        f"/api/v1/work-logs/{log_id}/finish",
        headers=user_a_headers,
        json={
            "break_minutes": 5,
            "interruption_count": 1,
            "notes": "Completed by owner",
        },
    )

    assert owner_finish_response.status_code == 200
    assert owner_finish_response.json()["status"] == "completed"


def test_work_log_rejects_nonexistent_task(client):
    headers = register_and_login(
        client, "worklog-invalid-task@example.com"
    )

    response = client.post(
        "/api/v1/work-logs/start",
        headers=headers,
        json={
            "task_id": 999999999,
            "break_minutes": 0,
            "interruption_count": 0,
            "notes": "Invalid task reference",
        },
    )

    assert response.status_code in (400, 404, 422), response.text


def test_user_cannot_start_work_log_for_another_users_task(client):
    owner_headers = register_and_login(
        client, "worklog-task-owner@example.com"
    )
    other_headers = register_and_login(
        client, "worklog-task-other@example.com"
    )

    task_response = client.post(
        "/api/v1/tasks/",
        headers=owner_headers,
        json={
            "title": "Private task",
            "priority": "medium",
            "status": "pending",
            "estimated_minutes": 30,
            "due_at": None,
        },
    )

    assert task_response.status_code == 201, task_response.text
    task_id = task_response.json()["id"]

    response = client.post(
        "/api/v1/work-logs/start",
        headers=other_headers,
        json={
            "task_id": task_id,
            "break_minutes": 0,
            "interruption_count": 0,
            "notes": "Attempt to use another user's task",
        },
    )

    assert response.status_code in (400, 403, 404), response.text


def test_work_log_rejects_negative_break_minutes(client):
    headers = register_and_login(
        client, "worklog-negative-break@example.com"
    )

    response = client.post(
        "/api/v1/work-logs/start",
        headers=headers,
        json={
            "task_id": None,
            "break_minutes": -5,
            "interruption_count": 0,
            "notes": "Invalid break duration",
        },
    )

    assert response.status_code in (400, 422), response.text


def test_work_log_rejects_negative_interruption_count(client):
    headers = register_and_login(
        client, "worklog-negative-interruptions@example.com"
    )

    response = client.post(
        "/api/v1/work-logs/start",
        headers=headers,
        json={
            "task_id": None,
            "break_minutes": 0,
            "interruption_count": -2,
            "notes": "Invalid interruption count",
        },
    )

    assert response.status_code in (400, 422), response.text
