from django.contrib import admin
from django.urls import include, path, re_path
from django.conf import settings
from .spa import serve_spa

admin.site.site_header = "EcoRota USP — Administração"

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("api.urls")),
    path("api-auth/", include("rest_framework.urls")),
]

# A página React atende as rotas do navegador; /api e /static continuam com o Django/WhiteNoise.
if settings.PUBLIC_DEMO:
    urlpatterns = [p for p in urlpatterns if str(p.pattern) not in ("admin/", "api-auth/")]
    urlpatterns += [re_path(r"^(?!api/|admin/|api-auth/|static/|ws/).*$", serve_spa)]
