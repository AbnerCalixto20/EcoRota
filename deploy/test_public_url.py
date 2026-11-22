"""Verificação básica do endereço público HTTPS após o deploy.

Uso: python deploy/test_public_url.py https://seu-servico.onrender.com
Não compartilha segredos e não faz login; apenas consulta endpoints públicos.
"""
import sys
import urllib.error
import urllib.request
from urllib.parse import urlparse


def main():
    if len(sys.argv) != 2:
        raise SystemExit("Uso: python deploy/test_public_url.py https://seu-servico.onrender.com")
    base = sys.argv[1].rstrip("/")
    parsed = urlparse(base)
    if parsed.scheme != "https" or not parsed.netloc or parsed.username or parsed.password:
        raise SystemExit("Forneça o endereço HTTPS público do Render.")
    for path in ("/", "/api/health", "/login"):
        url = base + path
        try:
            with urllib.request.urlopen(url, timeout=90) as res:
                text = res.read(220).decode("utf-8", errors="replace")
                print(f"{path}: HTTP {res.status} - {text[:90]!r}")
        except (urllib.error.URLError, TimeoutError) as exc:
            print(f"{path}: FALHOU - {exc}")
            raise SystemExit(1)


if __name__ == "__main__":
    main()
