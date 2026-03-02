import warnings
from pydantic_settings import BaseSettings
from typing import Optional

_INSECURE_KEY_PREFIX = "your-secret-key"


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./crm.db"

    def get_database_url(self) -> str:
        url = self.DATABASE_URL
        # Use psycopg (v3) driver for PostgreSQL
        if url.startswith("postgresql://") and "+" not in url.split("//")[0]:
            url = url.replace("postgresql://", "postgresql+psycopg://", 1)
        return url

    SECRET_KEY: str = "your-secret-key-change-in-production-min-32-chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    SMTP_HOST: Optional[str] = None
    SMTP_PORT: Optional[int] = None
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM_EMAIL: Optional[str] = None
    SMTP_TLS: bool = True

    FRONTEND_URL: str = "http://localhost:3000"

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


settings = Settings()

if settings.SECRET_KEY.startswith(_INSECURE_KEY_PREFIX):
    warnings.warn(
        "SECRET_KEY is still the default placeholder! "
        "Set a strong random key in .env before deploying to production.",
        stacklevel=1,
    )
