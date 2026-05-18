"""Pydantic Settings — single source of truth for all environment variables."""

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Database
    database_url: str = Field(..., description="PostgreSQL async DSN, e.g. postgresql+asyncpg://user:pass@host/db")

    # Auth
    jwt_secret: str = Field(..., description="Secret key used to sign JWT tokens")
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30

    # OpenAI
    openai_api_key: str = Field(..., description="OpenAI API key for embeddings and chat completions")
    embedding_model: str = "text-embedding-3-small"
    chat_model: str = "gpt-4o-mini"

    # Embedding provider — "openai" or "nvidia"
    embedding_provider: str = "openai"
    embedding_dim: int = 1536

    # NVIDIA NIM
    nvidia_api_key: str = ""
    nvidia_embedding_model: str = "nvidia/nv-embedqa-e5-v5"
    nvidia_rerank_model: str = "nvidia/nv-rerankqa-mistral-4b-v3"
    nvidia_base_url: str = "https://integrate.api.nvidia.com/v1"

    # Reranker
    reranker_enabled: bool = True
    reranker_top_k: int = 5

    # Chunking
    chunk_size: int = 512
    chunk_overlap: int = 64

    # Upload limits
    max_file_size_mb: int = 50

    # CORS — comma-separated origins, e.g. "http://localhost:3000,chrome-extension://abc"
    cors_origins: list[str] = Field(default_factory=list)

    # Testing — set this in .env to point integration tests at a separate database
    test_database_url: str | None = None


settings = Settings()