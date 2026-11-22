"""Entrega do index.html compilado pelo Vite (React Router)."""
from django.conf import settings
from django.http import FileResponse, Http404


def serve_spa(request):
    index = settings.FRONTEND_DIST / "index.html"
    if not index.is_file():
        raise Http404("Frontend compilado não encontrado")
    return FileResponse(index.open("rb"), content_type="text/html; charset=utf-8")
