import hashlib
import secrets
import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api_keys.models import ApiKey
from src.api_keys.schemas import ApiKeyCreated, ApiKeyResponse
from src.auth.models import User
from src.core.exceptions import AuthError, NotFoundError


def _generate_key() -> tuple[str, str, str]:
    """Return (full_key, key_prefix, key_hash)."""
    raw = secrets.token_urlsafe(32)
    full_key = f"srag_{raw}"
    key_prefix = full_key[:12]
    key_hash = hashlib.sha256(full_key.encode()).hexdigest()
    return full_key, key_prefix, key_hash


async def create_api_key(db: AsyncSession, user: User, name: str) -> ApiKeyCreated:
    full_key, key_prefix, key_hash = _generate_key()
    api_key = ApiKey(
        user_id=user.id,
        name=name,
        key_prefix=key_prefix,
        key_hash=key_hash,
    )
    db.add(api_key)
    await db.commit()
    await db.refresh(api_key)
    return ApiKeyCreated(
        id=api_key.id,
        name=api_key.name,
        key_prefix=api_key.key_prefix,
        key=full_key,
        created_at=api_key.created_at,
    )


async def list_api_keys(db: AsyncSession, user: User) -> list[ApiKeyResponse]:
    result = await db.execute(
        select(ApiKey)
        .where(ApiKey.user_id == user.id, ApiKey.revoked.is_(False))
        .order_by(ApiKey.created_at.desc())
    )
    return [ApiKeyResponse.model_validate(row) for row in result.scalars().all()]


async def revoke_api_key(db: AsyncSession, user: User, key_id: uuid.UUID) -> None:
    result = await db.execute(
        select(ApiKey).where(ApiKey.id == key_id, ApiKey.user_id == user.id)
    )
    api_key = result.scalar_one_or_none()
    if api_key is None:
        raise NotFoundError("API key not found")
    api_key.revoked = True
    await db.commit()


async def verify_api_key(db: AsyncSession, raw_key: str) -> User:
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    result = await db.execute(
        select(ApiKey).where(ApiKey.key_hash == key_hash, ApiKey.revoked.is_(False))
    )
    api_key = result.scalar_one_or_none()
    if api_key is None:
        raise AuthError("Invalid or revoked API key")

    user = await db.get(User, api_key.user_id)
    if user is None or not user.is_active:
        raise AuthError("User not found or inactive")

    api_key.last_used_at = datetime.now(UTC)
    await db.commit()
    return user
