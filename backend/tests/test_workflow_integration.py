
from tests.test_auth import register_and_login


def test_task_worklog_and_analytics_workflow(client):
    headers = register_and_login(
        client, "workflow-integration@example.com"
    )

    # 1. Create a task.
    task_response = client.post(
        "/api/v1/tasks/",
        headers=headers,
        json={
            "title": "Integration test task",
            "description": "Test task-to-worklog workflow",
            "priority": "medium",
            "status": "pending",
            "estimated_minutes": 30,
            "due_at": None,
        },
    )

    assert task_response.status_code == 201, task_response.text
    task_id = task_response.json()["id"]

    # 2. Start a work log linked to the task.
    start_response = client.post(
        "/api/v1/work-logs/start",
        headers=headers,
        json={
            "task_id": task_id,
            "break_minutes": 0,
            "interruption_count": 0,
            "notes": "Integration workflow test",
        },
    )

    assert start_response.status_code == 201, start_response.text
    work_log_id = start_response.json()["id"]
    assert start_response.json()["task_id"] == task_id

    # 3. Finish the work log.
    finish_response = client.post(
        f"/api/v1/work-logs/{work_log_id}/finish",
        headers=headers,
        json={
            "break_minutes": 5,
            "interruption_count": 1,
            "notes": "Integration test completed",
        },
    )

    assert finish_response.status_code == 200, finish_response.text
    assert finish_response.json()["status"] == "completed"

    # 4. Verify workload analytics.
    analytics_response = client.get(
        "/api/v1/analytics/workload",
        headers=headers,
    )

    assert analytics_response.status_code == 200, analytics_response.text

    analytics = analytics_response.json()
    assert analytics["total_tasks"] >= 1
    assert analytics["pending_tasks"] >= 1
