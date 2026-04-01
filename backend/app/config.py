import warnings
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

_INSECURE_KEY_PREFIX = "your-secret-key"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",
    )

    ENVIRONMENT: str = "development"
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

    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000,https://crm.perioxia.com,https://perioxia.com,https://www.crm.perioxia.com,https://www.perioxia.com"

    SMTP_HOST: Optional[str] = None
    SMTP_PORT: Optional[int] = None
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM_EMAIL: Optional[str] = None
    SMTP_TLS: bool = True

    FRONTEND_URL: str = "https://crm.perioxia.com"

    # Auth cookie settings
    # - If frontend and backend are on different sites (different registrable domain),
    #   browsers will NOT send cookies on XHR/fetch unless SameSite=None and Secure=true.
    # - For same-site deployments (recommended), Lax is fine.
    AUTH_COOKIE_SAMESITE: str = "lax"  # "lax" | "strict" | "none"
    AUTH_COOKIE_SECURE: Optional[bool] = None  # defaults to True in production

    # AI (Gemini)
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-2.5-flash"
    AI_RATE_LIMIT_PER_MINUTE: int = 20
    AI_MAX_ACTIONS_PER_REQUEST: int = 5

    # AI (OpenAI)
    # User indicated they set OPENAI_KEY in the environment.
    OPENAI_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-5.3-codex"


settings = Settings()

if settings.SECRET_KEY.startswith(_INSECURE_KEY_PREFIX):
    warnings.warn(
        "SECRET_KEY is still the default placeholder! "
        "Set a strong random key in .env before deploying to production.",
        stacklevel=1,
    )
