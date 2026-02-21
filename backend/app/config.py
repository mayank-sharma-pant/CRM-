from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Database (postgresql:// → postgresql+psycopg:// when using psycopg3)
    DATABASE_URL: str = "sqlite:///./crm.db"

    def get_database_url(self) -> str:
        url = self.DATABASE_URL
        if url.startswith("postgresql://") and "+" not in url.split("//")[0]:
            url = url.replace("postgresql://", "postgresql+psycopg://", 1)
        return url
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production-min-32-chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    
    # Email (optional)
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: Optional[int] = None
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
