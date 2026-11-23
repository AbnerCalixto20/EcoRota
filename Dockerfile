# Stage 1: Build de produção do frontend React
FROM node:22-bookworm-slim AS frontend-builder
WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN ECOROTA_RENDER_BUILD=1 npm run build

# Stage 2: Django + Daphne (HTTP + React SPA + WebSocket no mesmo domínio)
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/backend \
    DJANGO_DEBUG=False

WORKDIR /app
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

COPY backend/ /app/backend/
COPY database/schema.sql database/seed.sql database/reset_db.py /app/database/
COPY --from=frontend-builder /build/frontend/dist /app/frontend/dist

RUN DJANGO_SECRET_KEY=build-only-placeholder-key-replaced-at-runtime-2026 python backend/manage.py collectstatic --noinput && \
    useradd --create-home --shell /usr/sbin/nologin ecorota && \
    chown -R ecorota:ecorota /app/database

USER ecorota
EXPOSE 10000

# Inicializa banco limpo (schema + 124 locais USP/Metrô/Bandejões, sem contas teste) somente se ainda não existir
CMD ["sh", "-c", "python /app/database/reset_db.py --prod --if-missing && cd /app/backend && exec daphne -b 0.0.0.0 -p ${PORT:-10000} ecorota.asgi:application"]
