FROM python:3.12-slim

# Install uv from official image
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# Use system Python, copy mode avoids hardlink issues in overlayfs
ENV UV_PYTHON_DOWNLOADS=never \
    UV_LINK_MODE=copy

WORKDIR /app

# -- Dependency layer (busts only when pyproject.toml / uv.lock change) ----
COPY pyproject.toml uv.lock ./
COPY backend/pyproject.toml backend/pyproject.toml
RUN cd backend && uv sync --no-dev --frozen

# -- Source layer -----------------------------------------------------------
COPY backend/ backend/

WORKDIR /app/backend
EXPOSE 8000
CMD ["uv", "run", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
