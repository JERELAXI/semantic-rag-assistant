from pydantic import BaseModel


class SettingsResponse(BaseModel):
    embedding_provider: str
    embedding_dim: int
    reranker_enabled: bool


class SettingsPatch(BaseModel):
    embedding_provider: str | None = None
    reranker_enabled: bool | None = None
