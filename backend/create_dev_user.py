
from sqlalchemy import text

from app.db.session import engine

with engine.begin() as connection:
    existing_user = connection.execute(
        text("SELECT id FROM users WHERE email = :email"),
        {"email": "dev@mindblaze.local"},
    ).first()

    if existing_user:
        print("Development user already exists. ID:", existing_user.id)
    else:
        result = connection.execute(
            text("""
                INSERT INTO users
                    (email, full_name, password_hash, is_active)
                VALUES
                    (:email, :full_name, :password_hash, :is_active)
            """),
            {
                "email": "dev@mindblaze.local",
                "full_name": "Development User",
                "password_hash": "NOT_A_REAL_PASSWORD_HASH",
                "is_active": True,
            },
        )
        print("Created development user. ID:", result.lastrowid)
