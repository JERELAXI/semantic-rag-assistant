from fastapi import APIRouter, Depends

from src.auth.models import User
from src.core.config import settings
from src.core.dependencies import get_current_user
from src.settings.schemas import SettingsPatch, SettingsResponse

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("", response_model=SettingsResponse)
async def get_settings(_: User = Depends(get_current_user)) -> SettingsResponse:
    return SettingsResponse(
        embedding_provider=settings.embedding_provider,
        embedding_dim=settings.embedding_dim,
        reranker_enabled=settings.reranker_enabled,
    )


@router.patch("", response_model=SettingsResponse)
async def patch_settings(
    patch: SettingsPatch,
    _: User = Depends(get_current_user),
) -> SettingsResponse:
    if patch.embedding_provider is not None:
        settings.embedding_provider = patch.embedding_provider
    if patch.reranker_enabled is not None:
        settings.reranker_enabled = patch.reranker_enabled
    return SettingsResponse(
        embedding_provider=settings.embedding_provider,
        embedding_dim=settings.embedding_dim,
        reranker_enabled=settings.reranker_enabled,
    )
