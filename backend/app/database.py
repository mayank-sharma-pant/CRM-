from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

# Create database engine
database_url = settings.get_database_url()
# Connection pool configuration
_is_sqlite = "sqlite" in database_url
_pool_kwargs = (
    {"check_same_thread": False}  # SQLite only (local dev)
    if _is_sqlite
    else {}
)
_engine_kwargs: dict = {
    "connect_args": _pool_kwargs,
    "pool_pre_ping": True,  # Reconnect after Neon auto-suspend
}
if not _is_sqlite:
    _engine_kwargs.update(
        pool_size=5,        # Max persistent connections per worker
        max_overflow=10,    # Burst connections allowed above pool_size
        pool_timeout=30,    # Seconds to wait for a connection from pool
        pool_recycle=1800,  # Recycle connections after 30 min to avoid TCP timeout
    )

engine = create_engine(database_url, **_engine_kwargs)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models (SQLAlchemy 2.0 style)
Base = declarative_base()

# Dependency for database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

