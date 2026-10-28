
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.engine import URL
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.dependencies import get_db
from app.db.session import Base
from app.main import app
from app.models import Task, User  # Ensure models are registered


test_database_url = URL.create(
    drivername="mysql+pymysql",
    username=settings.db_user,
    password=settings.db_password,
    host=settings.db_host,
    port=settings.db_port,
    database=settings.test_db_name,
    query={"charset": "utf8mb4"},
)

test_engine = create_engine(
    test_database_url,
    pool_pre_ping=True,
)


@pytest.fixture(scope="session", autouse=True)
def prepare_test_database():
    Base.metadata.create_all(test_engine)
    yield
    test_engine.dispose()


@pytest.fixture
def client():
    connection = test_engine.connect()
    transaction = connection.begin()

    def override_get_db():
        db = Session(
            bind=connection,
            join_transaction_mode="create_savepoint",
        )
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.pop(get_db, None)
        transaction.rollback()
        connection.close()
