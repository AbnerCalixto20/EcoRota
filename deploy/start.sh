#!/bin/sh
set -eu

if [ -z "${DJANGO_SECRET_KEY:-}" ]; then
  echo "ERRO: configure DJANGO_SECRET_KEY em Environment no Render." >&2
  exit 1
fi
if [ "${ECOROTA_PUBLIC_DEMO:-}" != "1" ]; then
  echo "ERRO: este serviço foi preparado apenas para demonstração pública." >&2
  exit 1
fi

python /app/deploy/init_demo_db.py
cd /app/backend
exec daphne -b 0.0.0.0 -p "${PORT:-10000}" ecorota.asgi:application
