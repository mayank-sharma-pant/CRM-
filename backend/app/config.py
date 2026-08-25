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

    # Billing (Razorpay)
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    RAZORPAY_WEBHOOK_SECRET: str = ""
    TRIAL_DAYS: int = 14

    # Public API base for OAuth redirect_uri (no trailing slash)
    PUBLIC_API_URL: str = "http://localhost:8000"

    # SSO (Google / Microsoft). Empty client id ⇒ provider disabled.
    GOOGLE_OAUTH_CLIENT_ID: str = ""
    GOOGLE_OAUTH_CLIENT_SECRET: str = ""
    MICROSOFT_OAUTH_CLIENT_ID: str = ""
    MICROSOFT_OAUTH_CLIENT_SECRET: str = ""
    MICROSOFT_OAUTH_TENANT: str = "common"


settings = Settings()


def _warn_if_production_urls_point_to_localhost() -> None:
    """Catch the common deploy mistake: Railway/Render env still has localhost."""
    if (settings.ENVIRONMENT or "").lower() != "production":
        return
    fe = (settings.FRONTEND_URL or "").strip().lower()
    if "localhost" in fe or "127.0.0.1" in fe:
        warnings.warn(
            "FRONTEND_URL is set to localhost/127.0.0.1 while ENVIRONMENT=production. "
            "Browsers will block cookies/CORS for your real site. Set FRONTEND_URL to your "
            "live CRM origin (e.g. https://crm.perioxia.com) in the host environment, not only in a local .env file.",
            stacklevel=1,
        )
    api = (settings.PUBLIC_API_URL or "").strip().lower()
    if not api or "localhost" in api or "127.0.0.1" in api:
        warnings.warn(
            "PUBLIC_API_URL is empty or points at localhost/127.0.0.1 while "
            "ENVIRONMENT=production. OAuth redirect URIs and provider webhooks will not "
            "resolve, and email open/click tracking stays off because a recipient's mail "
            "client cannot reach a loopback host. Set PUBLIC_API_URL to this backend's "
            "public origin in the host environment.",
            stacklevel=1,
        )
    origins = [
        o.strip()
        for o in (settings.CORS_ORIGINS or "").split(",")
        if o.strip()
    ]
    if not origins:
        return
    has_public_https = any(
        o.lower().startswith("https://")
        and "localhost" not in o.lower()
        and "127.0.0.1" not in o.lower()
        for o in origins
    )
    only_loopback = all(
        "localhost" in o.lower() or "127.0.0.1" in o.lower() for o in origins
    )
    if only_loopback or not has_public_https:
        warnings.warn(
            "CORS_ORIGINS has no public https origin while ENVIRONMENT=production. "
            "Set CORS_ORIGINS to your live frontend URL(s), e.g. "
            "https://crm.perioxia.com (comma-separated). Remove duplicate keys in .env — "
            "only one CORS_ORIGINS line; hosting dashboards often override .env.",
            stacklevel=1,
        )


_warn_if_production_urls_point_to_localhost()

if settings.SECRET_KEY.startswith(_INSECURE_KEY_PREFIX):
    if (settings.ENVIRONMENT or "").lower() == "production":
        raise RuntimeError(
            "SECRET_KEY is still the default placeholder while ENVIRONMENT=production. "
            "Set a strong random key (>=32 chars) in the host environment before booting. "
            "Refusing to start with a guessable signing key."
        )
    warnings.warn(
        "SECRET_KEY is still the default placeholder! "
        "Set a strong random key in .env before deploying to production.",
        stacklevel=1,
    )
