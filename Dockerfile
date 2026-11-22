# Build isolado do frontend React.
FROM node:22-bookworm-slim AS frontend-builder
WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN ECOROTA_RENDER_BUILD=1 VITE_PUBLIC_DEMO=true npm run build

# Django + Daphne atende HTTP, React e WebSocket no mesmo domínio.
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/backend \
    DJANGO_DEBUG=False \
    ECOROTA_PUBLIC_DEMO=1
WORKDIR /app
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt
COPY backend/ /app/backend/
COPY database/schema.sql database/seed.sql /app/database/
COPY deploy/ /app/deploy/
COPY --from=frontend-builder /build/frontend/dist /app/frontend/dist
RUN DJANGO_SECRET_KEY=build-time-placeholder-key-not-used-at-runtime-123456 python backend/manage.py collectstatic --noinput && \
    useradd --create-home --shell /usr/sbin/nologin ecorota && \
    chown -R ecorota:ecorota /app/database
USER ecorota
EXPOSE 10000
CMD ["sh", "/app/deploy/start.sh"]
