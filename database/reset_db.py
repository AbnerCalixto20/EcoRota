"""Recria database/ecorota.sqlite usando o schema oficial + seed + tabelas do Django Admin."""
import hashlib
import os
import secrets
import sqlite3
import sys
from pathlib import Path

DB_DIR = Path(__file__).resolve().parent
ROOT_DIR = DB_DIR.parent
BACKEND_DIR = ROOT_DIR / "backend"
DB_PATH = DB_DIR / "ecorota.sqlite"

sys.path.insert(0, str(BACKEND_DIR))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "ecorota.settings")

import django  # noqa: E402
from django.contrib.auth import get_user_model  # noqa: E402
from django.core.management import call_command  # noqa: E402


def hash_password(plain_password: str) -> str:
    salt = secrets.token_hex(16)
    derived = hashlib.scrypt(plain_password.encode("utf-8"), salt=salt.encode("utf-8"), n=16384, r=8, p=1, dklen=64).hex()
    return f"scrypt:{salt}:{derived}"


def main():
    for suffix in ("", "-wal", "-shm", "-journal"):
        p = Path(f"{DB_PATH}{suffix}")
        if p.exists():
            p.unlink()

    conn = sqlite3.connect(str(DB_PATH))
    try:
        conn.execute("PRAGMA foreign_keys = ON;")
        conn.executescript((DB_DIR / "schema.sql").read_text(encoding="utf-8"))
        seed_sql = (DB_DIR / "seed.sql").read_text(encoding="utf-8")
        seed_sql = seed_sql.replace("__DEMO_PASSWORD_HASH__", hash_password("EcoRota@2026"))
        conn.executescript(seed_sql)
        conn.commit()
    finally:
        conn.close()

    django.setup()
    call_command("migrate", verbosity=0)

    User = get_user_model()
    if not User.objects.filter(username="admin").exists():
        User.objects.create_superuser("admin", "admin@usp.br", "EcoRota@2026")

    conn = sqlite3.connect(str(DB_PATH))
    try:
        conn.execute("PRAGMA foreign_keys = ON;")
        integrity = conn.execute("PRAGMA integrity_check;").fetchone()[0]
        fk_issues = conn.execute("PRAGMA foreign_key_check;").fetchall()
        print(f"[EcoRota DB] Recriado com sucesso em {DB_PATH}")
        print(f"[EcoRota DB] integrity_check={integrity} | foreign_key_check={len(fk_issues)} erros")
        if integrity != "ok" or fk_issues:
            raise SystemExit(1)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
