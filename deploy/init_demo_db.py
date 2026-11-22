"""Inicializa o banco de demonstração somente quando ele não existir.

No Render Free este banco NÃO é persistente; será recriado após uma suspensão
ou redeploy e pode perder qualquer alteração realizada por visitantes.
Este script deliberadamente NÃO cria superusuário Django.
"""
from pathlib import Path
import hashlib
import os
import secrets
import sqlite3
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent
DB = ROOT / "database" / "ecorota.sqlite"
DB.parent.mkdir(parents=True, exist_ok=True)


def demo_hash(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.scrypt(password.encode(), salt=salt.encode(), n=16384, r=8, p=1, dklen=64).hex()
    return f"scrypt:{salt}:{digest}"


def main():
    if os.environ.get("ECOROTA_PUBLIC_DEMO") != "1":
        raise RuntimeError("Inicialização autorizada apenas para modo demo.")
    if os.environ.get("DATABASE_URL"):
        raise RuntimeError("Esta inicialização é exclusiva para o SQLite de demonstração.")

    if not DB.exists():
        print("[EcoRota Demo] Criando SQLite temporário de demonstração", flush=True)
        con = sqlite3.connect(DB)
        try:
            con.execute("PRAGMA foreign_keys = ON")
            con.executescript((ROOT / "database" / "schema.sql").read_text(encoding="utf-8"))
            seed = (ROOT / "database" / "seed.sql").read_text(encoding="utf-8")
            seed = seed.replace("__DEMO_PASSWORD_HASH__", demo_hash("EcoRota@2026"))
            con.executescript(seed)
            con.commit()
            # Conta admin NÃO é criada e não se enviam credenciais reais.
            status = con.execute("PRAGMA integrity_check").fetchone()[0]
            if status != "ok":
                raise RuntimeError(f"Falha de integridade: {status}")
        except Exception:
            con.close()
            DB.unlink(missing_ok=True)
            raise
        finally:
            try:
                con.close()
            except Exception:
                pass

    os.chdir(ROOT)
    subprocess.run([sys.executable, "backend/manage.py", "migrate", "--noinput"], check=True)
    print("[EcoRota Demo] Banco pronto", flush=True)


if __name__ == "__main__":
    main()
