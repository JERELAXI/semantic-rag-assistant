"""Auth business logic: password hashing, JWT creation/verification, user registration and authentication."""

import hashlib
import secrets
from datetime import UTC, datetime, timedelta

from jose import JWTError, jwt
from pwdlib import PasswordHash
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.models import RefreshToken, User
from src.auth.schemas import TokenResponse
from src.core.config import settings
from src.core.exceptions import AuthError, ConflictError

_pwd = PasswordHash.recommended()


def hash_password(plain: str) -> str:
    return _pwd.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return _pwd.verify(plain, hashed)


def create_access_token(user_id: str) -> str:
    expire = datetime.now(UTC) + timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode(
        {"sub": user_id, "type": "access", "exp": expire},
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )


def _hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


async def create_refresh_token(db: AsyncSession, user_id: str) -> str:
    raw = secrets.token_urlsafe(32)
    expires_at = datetime.now(UTC) + timedelta(days=settings.refresh_token_expire_days)
    db.add(RefreshToken(user_id=user_id, token_hash=_hash_token(raw), expires_at=expires_at))
    await db.commit()
    return raw


async def verify_access_token(db: AsyncSession, token: str) -> User:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        raise AuthError("Invalid or expired token")

    if payload.get("type") != "access":
        raise AuthError("Invalid token type")

    user_id: str | None = payload.get("sub")
    if not user_id:
        raise AuthError("Invalid token payload")

    result = await db.execute(select(User).where(User.id == user_id, User.is_active.is_(True)))
    user = result.scalar_one_or_none()
    if user is None:
        raise AuthError("User not found or inactive")
    return user


async def refresh_tokens(db: AsyncSession, raw_token: str) -> TokenResponse:
    token_hash = _hash_token(raw_token)
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked.is_(False),
            RefreshToken.expires_at > datetime.now(UTC),
        )
    )
    stored = result.scalar_one_or_none()
    if stored is None:
        raise AuthError("Invalid or expired refresh token")

    stored.revoked = True
    await db.flush()

    user_id = str(stored.user_id)
    access_token = create_access_token(user_id)
    new_refresh = await create_refresh_token(db, user_id)
    return TokenResponse(access_token=access_token, refresh_token=new_refresh)


async def register_user(db: AsyncSession, email: str, password: str, display_name: str) -> TokenResponse:
    result = await db.execute(select(User).where(User.email == email))
    if result.scalar_one_or_none() is not None:
        raise ConflictError("Email already registered")

    user = User(email=email, display_name=display_name, hashed_password=hash_password(password))
    db.add(user)
    await db.flush()

    user_id = str(user.id)
    access_token = create_access_token(user_id)
    refresh_token = await create_refresh_token(db, user_id)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


async def authenticate_user(db: AsyncSession, email: str, password: str) -> TokenResponse:
    result = await db.execute(select(User).where(User.email == email, User.is_active.is_(True)))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(password, user.hashed_password):
        raise AuthError("Invalid email or password")

    user_id = str(user.id)
    access_token = create_access_token(user_id)
    refresh_token = await create_refresh_token(db, user_id)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)
