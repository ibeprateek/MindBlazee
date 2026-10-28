from datetime import datetime, timedelta, timezone

import jwt

from app.core.config import settings

def test_tasks_require_authentication(client):
    response = client.get("/api/v1/tasks/")
    assert response.status_code == 401


def test_task_creation_requires_authentication(client):
    response = client.post(
        "/api/v1/tasks/",
        json={
            "title": "Test task",
            "description": "This request should be rejected",
            "priority": "medium",
            "status": "pending",
            "estimated_minutes": 30,
            "due_at": None,
        },
    )
    assert response.status_code == 401


def test_login_rejects_invalid_credentials(client):
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "nonexistent@example.com",
            "password": "WrongPassword123!",
        },
    )

    assert response.status_code == 401


def test_registration_rejects_invalid_email(client):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "not-an-email",
            "full_name": "Test User",
            "password": "StrongTestPass123!",
        },
    )

    assert response.status_code == 422


def register_and_login(client, email: str):
    registration = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "full_name": "Test User",
            "password": "StrongTestPass123!",
        },
    )
    assert registration.status_code == 201

    login = client.post(
        "/api/v1/auth/login",
        json={
            "email": email,
            "password": "StrongTestPass123!",
        },
    )
    assert login.status_code == 200

    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_registration_and_login_success(client):
    headers = register_and_login(
        client, "auth-test@example.com"
    )

    assert headers["Authorization"].startswith("Bearer ")


def test_user_cannot_access_another_users_task(client):
    user_a_headers = register_and_login(
        client, "owner-a@example.com"
    )
    user_b_headers = register_and_login(
        client, "owner-b@example.com"
    )

    create_response = client.post(
        "/api/v1/tasks/",
        headers=user_a_headers,
        json={
            "title": "Private task",
            "description": "Belongs to user A",
            "priority": "high",
            "status": "pending",
            "estimated_minutes": 30,
            "due_at": None,
        },
    )

    assert create_response.status_code == 201
    task_id = create_response.json()["id"]

    # The owner can retrieve the task.
    owner_response = client.get(
        f"/api/v1/tasks/{task_id}",
        headers=user_a_headers,
    )
    assert owner_response.status_code == 200

    # Another user cannot retrieve it.
    other_user_response = client.get(
        f"/api/v1/tasks/{task_id}",
        headers=user_b_headers,
    )
    assert other_user_response.status_code == 404

    # Another user cannot update it.
    update_response = client.patch(
        f"/api/v1/tasks/{task_id}",
        headers=user_b_headers,
        json={"title": "Unauthorized change"},
    )
    assert update_response.status_code == 404

    # Another user cannot delete it.
    delete_response = client.delete(
        f"/api/v1/tasks/{task_id}",
        headers=user_b_headers,
    )
    assert delete_response.status_code == 404

    # The original task remains unchanged.
    final_response = client.get(
        f"/api/v1/tasks/{task_id}",
        headers=user_a_headers,
    )
    assert final_response.status_code == 200
    assert final_response.json()["title"] == "Private task"


def test_invalid_jwt_is_rejected(client):
    response = client.get(
        "/api/v1/tasks/",
        headers={"Authorization": "Bearer invalid.token.value"},
    )

    assert response.status_code == 401


def test_expired_jwt_is_rejected(client):
    expired_token = jwt.encode(
        {
            "sub": "1",
            "exp": datetime.now(timezone.utc) - timedelta(minutes=5),
        },
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )

    response = client.get(
        "/api/v1/tasks/",
        headers={"Authorization": f"Bearer {expired_token}"},
    )

    assert response.status_code == 401


def test_jwt_with_wrong_signature_is_rejected(client):
    wrong_secret = "this-is-an-incorrect-test-secret"

    token = jwt.encode(
        {
            "sub": "1",
            "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
        },
        wrong_secret,
        algorithm=settings.jwt_algorithm,
    )

    response = client.get(
        "/api/v1/tasks/",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 401


def test_jwt_with_non_numeric_subject_is_rejected(client):
    token = jwt.encode(
        {
            "sub": "not-a-user-id",
            "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
        },
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )

    response = client.get(
        "/api/v1/tasks/",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 401



def test_inactive_user_cannot_access_protected_endpoint(client):
    from app.db.dependencies import get_db
    from app.models import User
    from sqlalchemy import select

    email = "inactive_test@example.com"
    headers = register_and_login(client, email)

    original_dependency = client.app.dependency_overrides[get_db]

    def inactive_user_db():
        db = next(original_dependency())
        try:
            user = db.scalar(
                select(User).where(User.email == email)
            )
            assert user is not None

            user.is_active = False
            db.flush()

            yield db
        finally:
            db.close()

    client.app.dependency_overrides[get_db] = inactive_user_db

    try:
        response = client.get(
            "/api/v1/tasks/",
            headers=headers,
        )
        assert response.status_code == 401
    finally:
        client.app.dependency_overrides[get_db] = original_dependency
