# ── Stage 1: build React app ───────────────────────────────────────────────
FROM node:22-alpine AS build

WORKDIR /app

# Dependency layer — busts only when package files change
COPY webapp/package.json webapp/package-lock.json* ./
RUN npm install --legacy-peer-deps

# Source + build
COPY webapp/ ./
RUN npm run build

# ── Stage 2: serve with nginx ──────────────────────────────────────────────
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
