
from pathlib import Path

from sqlalchemy import URL, create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings

BASE_DIR = Path(__file__).resolve().parents[2]
CA_CERT_PATH = BASE_DIR / "certs" / "ca.pem"

database_url = URL.create(
    drivername="mysql+pymysql",
    username=settings.db_user,
    password=settings.db_password,
    host=settings.db_host,
    port=settings.db_port,
    database=settings.db_name,
    query={"charset": "utf8mb4"},
)

connect_args = {}

if settings.db_ssl_ca:
    ca_path = Path(settings.db_ssl_ca)
    if not ca_path.is_absolute():
        ca_path = BASE_DIR / ca_path

    if not ca_path.is_file():
        raise FileNotFoundError(f"MySQL CA certificate not found: {ca_path}")

    connect_args["ssl"] = {"ca": str(ca_path)}

engine = create_engine(
    database_url,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    pool_recycle=1800,
    connect_args=connect_args,
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass
