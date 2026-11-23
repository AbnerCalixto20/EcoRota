from django.conf import settings
from django.contrib import admin
from django.http import FileResponse, Http404
from django.urls import include, path, re_path

admin.site.site_header = "EcoRota USP — Administração"


def serve_spa(request):
    index = settings.FRONTEND_DIST / "index.html"
    if not index.is_file():
        raise Http404("Frontend compilado não encontrado.")
    return FileResponse(index.open("rb"), content_type="text/html; charset=utf-8")


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("api.urls")),
    path("api-auth/", include("rest_framework.urls")),
]

# Em produção (Render/Docker), o Django/WhiteNoise serve o React compilado no mesmo domínio.
if (settings.FRONTEND_DIST / "index.html").is_file():
    urlpatterns += [re_path(r"^(?!api/|admin/|api-auth/|static/|ws/).*$", serve_spa)]
