"""Inicializa ou recria o banco SQLite oficial do EcoRota USP.

Modos de uso:
  python database/reset_db.py                   # Dev local: recria do zero com massa de demonstração + admin
  python database/reset_db.py --prod            # Produção: recria limpo (schema + 124 locais USP/Metrô/Bandejões, sem contas teste)
  python database/reset_db.py --prod --if-missing  # Render/Docker: cria banco limpo somente se ainda não existir
"""
import argparse
import hashlib
import os
import re
import secrets
import sqlite3
import sys
from pathlib import Path

DB_DIR = Path(__file__).resolve().parent
ROOT_DIR = DB_DIR.parent
BACKEND_DIR = ROOT_DIR / "backend"
DB_PATH = Path(os.environ.get("ECOROTA_DB_PATH", str(DB_DIR / "ecorota.sqlite"))).resolve()

sys.path.insert(0, str(BACKEND_DIR))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "ecorota.settings")

import django  # noqa: E402
from django.contrib.auth import get_user_model  # noqa: E402
from django.core.management import call_command  # noqa: E402


def hash_password(plain_password: str) -> str:
    salt = secrets.token_hex(16)
    derived = hashlib.scrypt(
        plain_password.encode("utf-8"), salt=salt.encode("utf-8"), n=16384, r=8, p=1, dklen=64
    ).hex()
    return f"scrypt:{salt}:{derived}"


def extract_destinos_sql(seed_sql: str) -> str:
    """Extrai somente o INSERT INTO Dim_Destino (124 locais oficiais) sem contas nem viagens de teste."""
    match = re.search(r"INSERT INTO Dim_Destino\b.*?;", seed_sql, flags=re.DOTALL | re.IGNORECASE)
    if not match:
        raise RuntimeError("Bloco INSERT INTO Dim_Destino não encontrado em seed.sql.")
    return f"PRAGMA foreign_keys = ON;\n{match.group(0)}\n"


def db_already_initialized(path: Path) -> bool:
    if not path.exists() or path.stat().st_size == 0:
        return False
    conn = sqlite3.connect(str(path))
    try:
        row = conn.execute(
            "SELECT 1 FROM sqlite_master WHERE type='table' AND name='Dim_Destino'"
        ).fetchone()
        return row is not None
    finally:
        conn.close()


def main():
    parser = argparse.ArgumentParser(description="Inicializa o banco SQLite oficial do EcoRota USP.")
    parser.add_argument("--prod", action="store_true", help="Cria banco limpo (apenas schema + 124 locais, sem contas teste).")
    parser.add_argument("--if-missing", action="store_true", help="Não sobrescreve o banco se ele já existir e estiver inicializado.")
    args = parser.parse_args()

    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    should_create = not (args.if_missing and db_already_initialized(DB_PATH))

    if should_create:
        for suffix in ("", "-wal", "-shm", "-journal"):
            p = Path(f"{DB_PATH}{suffix}")
            if p.exists():
                p.unlink()

        conn = sqlite3.connect(str(DB_PATH))
        try:
            conn.execute("PRAGMA foreign_keys = ON;")
            conn.executescript((DB_DIR / "schema.sql").read_text(encoding="utf-8"))
            seed_sql = (DB_DIR / "seed.sql").read_text(encoding="utf-8")
            if args.prod:
                conn.executescript(extract_destinos_sql(seed_sql))
            else:
                seed_sql = seed_sql.replace("__DEMO_PASSWORD_HASH__", hash_password("EcoRota@2026"))
                conn.executescript(seed_sql)
            conn.commit()
        finally:
            conn.close()

    django.setup()
    call_command("migrate", verbosity=0)

    User = get_user_model()
    if args.prod:
        admin_pwd = os.environ.get("DJANGO_ADMIN_PASSWORD", "").strip()
        if admin_pwd and not User.objects.filter(username="admin").exists():
            User.objects.create_superuser("admin", os.environ.get("DJANGO_ADMIN_EMAIL", "admin@usp.br"), admin_pwd)
    else:
        if not User.objects.filter(username="admin").exists():
            User.objects.create_superuser("admin", "admin@usp.br", "EcoRota@2026")

    conn = sqlite3.connect(str(DB_PATH))
    try:
        conn.execute("PRAGMA foreign_keys = ON;")
        integrity = conn.execute("PRAGMA integrity_check;").fetchone()[0]
        fk_issues = conn.execute("PRAGMA foreign_key_check;").fetchall()
        dest_count = conn.execute("SELECT COUNT(*) FROM Dim_Destino WHERE ativo=1;").fetchone()[0]
        user_count = conn.execute("SELECT COUNT(*) FROM Usuario;").fetchone()[0]
        mode = "PRODUCAO LIMPA" if args.prod else "DEV DEMO"
        print(f"[EcoRota DB - {mode}] Banco pronto em {DB_PATH}")
        print(f"[EcoRota DB] integrity_check={integrity} | fk_erros={len(fk_issues)} | locais={dest_count} | usuarios={user_count}")
        if integrity != "ok" or fk_issues:
            raise SystemExit(1)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
