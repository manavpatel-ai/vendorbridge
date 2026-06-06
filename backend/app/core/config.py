from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "VendorBridge API"
    
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/vendorbridge"
    
    JWT_SECRET: str = "change-me-to-a-long-random-string-for-security"
    JWT_EXPIRE_MINUTES: int = 720
    
    # Groq AI
    GROQ_API_KEY: str = ""
    
    # SMTP Configuration
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = "you@gmail.com"
    SMTP_PASS: str = "your-app-password"
    SMTP_FROM: str = "you@gmail.com"
    
    # CORS Origins
    CORS_ORIGINS: Union[str, List[str]] = "http://localhost:5173"

    @field_validator("CORS_ORIGINS")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, list):
            return v
        raise ValueError(v)

    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env"), 
        env_file_encoding="utf-8", 
        extra="ignore"
    )

settings = Settings()
