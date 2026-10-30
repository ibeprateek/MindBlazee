from pathlib import Path
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool
from sqlalchemy.engine import URL

from app.core.config import settings
from app.db.session import Base
from app.models import Task, User  # Register both models

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

# Build the database URL from .env without storing credentials in alembic.ini.
database_url = URL.create(
    drivername="mysql+pymysql",
    username=settings.db_user,
    password=settings.db_password,
    host=settings.db_host,
    port=settings.db_port,
    database=settings.db_name,
    query={"charset": "utf8mb4"},
)

# Escape percent signs for Alembic's configuration parser.
config.set_main_option(
    "sqlalchemy.url",
    database_url.render_as_string(hide_password=False).replace("%", "%%"),
)


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()



def run_migrations_online() -> None:
    connect_args = {}

    if settings.db_ssl_ca:
        ca_path = Path(settings.db_ssl_ca)

        if not ca_path.is_absolute():
            ca_path = Path(__file__).resolve().parents[1] / ca_path

        if not ca_path.is_file():
            raise FileNotFoundError(
                f"MySQL CA certificate not found: {ca_path}"
            )

        connect_args["ssl"] = {"ca": str(ca_path)}

    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        pool_pre_ping=True,
        connect_args=connect_args,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()

    connectable.dispose()



if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
