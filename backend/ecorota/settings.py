import os
from pathlib import Path
import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BASE_DIR.parent
DEFAULT_SQLITE_PATH = PROJECT_ROOT / "database" / "ecorota.sqlite"

PUBLIC_DEMO = os.environ.get("ECOROTA_PUBLIC_DEMO", "0") == "1"
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "ecorota-usp-pmr3304-django-dev-secret-key-2026")
if PUBLIC_DEMO and (not os.environ.get("DJANGO_SECRET_KEY") or len(SECRET_KEY) < 40):
    raise RuntimeError("Defina DJANGO_SECRET_KEY (40+ caracteres) nas variáveis de ambiente do Render.")
DEBUG = os.environ.get("DJANGO_DEBUG", "False" if PUBLIC_DEMO else "True").lower() in ("1", "true", "yes")
if PUBLIC_DEMO and DEBUG:
    raise RuntimeError("A demonstração pública não permite DJANGO_DEBUG=True.")
ALLOWED_HOSTS = [
    h.strip()
    for h in os.environ.get("DJANGO_ALLOWED_HOSTS", "127.0.0.1,localhost,testserver").split(",")
    if h.strip()
]

RENDER_HOST = os.environ.get("RENDER_EXTERNAL_HOSTNAME", "").strip()
if RENDER_HOST and RENDER_HOST not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append(RENDER_HOST)

APPEND_SLASH = False

INSTALLED_APPS = [
    "daphne",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "channels",
    "api.apps.ApiConfig",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "ecorota.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "ecorota.wsgi.application"
ASGI_APPLICATION = "ecorota.asgi.application"

if os.environ.get("DATABASE_URL"):
    DATABASES = {"default": dj_database_url.config(conn_max_age=600, ssl_require=not DEBUG)}
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": str(DEFAULT_SQLITE_PATH),
            "OPTIONS": {"timeout": 20},
        }
    }

CHANNEL_LAYERS = {
    "default": {"BACKEND": "channels.layers.InMemoryChannelLayer"},
}

CORS_ALLOWED_ORIGINS = [
    o.strip()
    for o in os.environ.get("CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if o.strip()
]
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = list(CORS_ALLOWED_ORIGINS)
if RENDER_HOST:
    CSRF_TRUSTED_ORIGINS.append(f"https://{RENDER_HOST}")
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https") if PUBLIC_DEMO else None
SECURE_SSL_REDIRECT = PUBLIC_DEMO and bool(os.environ.get("RENDER"))
SESSION_COOKIE_SECURE = PUBLIC_DEMO
CSRF_COOKIE_SECURE = PUBLIC_DEMO
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "api.auth.EcoRotaJWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "api.auth.IsEcoRotaAuthenticatedOrReadOnly",
    ],
    "EXCEPTION_HANDLER": "api.auth.ecorota_exception_handler",
}

JWT_EXPIRES_HOURS = int(os.environ.get("JWT_EXPIRES_HOURS", "12"))
DATA_UPLOAD_MAX_MEMORY_SIZE = 8 * 1024 * 1024

LANGUAGE_CODE = "pt-br"
TIME_ZONE = "America/Sao_Paulo"
USE_I18N = True
USE_TZ = False

STATIC_URL = "/static/"
# No Render, collectstatic coloca os recursos do Vite em /static/frontend/.
FRONTEND_DIST = PROJECT_ROOT / "frontend" / "dist"
if PUBLIC_DEMO and FRONTEND_DIST.is_dir():
    STATICFILES_DIRS = [("frontend", FRONTEND_DIST)]
STATIC_ROOT = BASE_DIR / "staticfiles"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
