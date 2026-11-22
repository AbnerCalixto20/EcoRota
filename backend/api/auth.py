import hashlib
import hmac
import math
import re
import secrets
from datetime import datetime, timedelta, timezone
import jwt
from django.conf import settings
from django.db import DatabaseError, IntegrityError, connection
from rest_framework import authentication, exceptions, status
from rest_framework.permissions import SAFE_METHODS, BasePermission
from rest_framework.response import Response
from .models import Usuario


# --- Utilitários de Senha, Tokens, Data e Geo ---

def hash_password(plain_password: str) -> str:
    salt = secrets.token_hex(16)
    derived = hashlib.scrypt(plain_password.encode("utf-8"), salt=salt.encode("utf-8"), n=16384, r=8, p=1, dklen=64).hex()
    return f"scrypt:{salt}:{derived}"


def verify_password(plain_password: str, stored_hash: str) -> bool:
    if not stored_hash or not stored_hash.startswith("scrypt:"):
        return False
    parts = stored_hash.split(":")
    if len(parts) != 3:
        return False
    _, salt, original_hex = parts
    candidate = hashlib.scrypt(plain_password.encode("utf-8"), salt=salt.encode("utf-8"), n=16384, r=8, p=1, dklen=64).hex()
    return hmac.compare_digest(candidate, original_hex)


def validate_password_strength(password: str):
    if not isinstance(password, str) or len(password) < 8:
        return "A senha deve possuir pelo menos 8 caracteres."
    if not re.search(r"[A-Za-z]", password) or not re.search(r"[0-9]", password):
        return "A senha deve conter pelo menos uma letra e um número."
    return None


def generate_opaque_token(nbytes: int = 20) -> str:
    return secrets.token_hex(nbytes)


def hash_token(raw_token: str) -> str:
    return hashlib.sha256(str(raw_token).encode("utf-8")).hexdigest()


def sign_jwt(user_id: int, email: str, nusp: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "email": email,
        "nusp": nusp,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=settings.JWT_EXPIRES_HOURS)).timestamp()),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")


def verify_jwt(token: str) -> dict:
    return jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])


def now_sql_datetime(offset_minutes: int = 0) -> str:
    return (datetime.now() + timedelta(minutes=offset_minutes)).strftime("%Y-%m-%d %H:%M:%S")


def normalize_sql_datetime(value: str):
    if not value or not isinstance(value, str):
        return None
    trimmed = value.strip()
    if re.fullmatch(r"\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}", trimmed):
        return trimmed
    match = re.fullmatch(r"(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::(\d{2}))?", trimmed)
    if match:
        return f"{match.group(1)} {match.group(2)}:{match.group(3) or '00'}"
    try:
        return datetime.fromisoformat(trimmed.replace("Z", "")).strftime("%Y-%m-%d %H:%M:%S")
    except ValueError:
        return None


def haversine_km(lat1, lon1, lat2, lon2):
    if None in (lat1, lon1, lat2, lon2):
        return None
    try:
        lat1, lon1, lat2, lon2 = float(lat1), float(lon1), float(lat2), float(lon2)
    except (TypeError, ValueError):
        return None
    dlat, dlon = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return round(6371.0 * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)), 2)


def estimate_road_distance_km(lat1, lon1, lat2, lon2) -> float:
    straight = haversine_km(lat1, lon1, lat2, lon2)
    return round(max(1.5, straight * 1.35), 1) if straight is not None else 6.0


def calculate_max_solidary_fare(custo_combustivel, custo_pedagio, vagas_total) -> float:
    return round((float(custo_combustivel or 0) + float(custo_pedagio or 0)) / (int(vagas_total or 1) + 1), 2)


# --- Helpers SQL ---

def fetchall_dict(sql: str, params=None) -> list[dict]:
    with connection.cursor() as cursor:
        cursor.execute(sql, params or [])
        cols = [col[0] for col in cursor.description]
        return [dict(zip(cols, row)) for row in cursor.fetchall()]


def fetchone_dict(sql: str, params=None):
    with connection.cursor() as cursor:
        cursor.execute(sql, params or [])
        row = cursor.fetchone()
        if row is None:
            return None
        return dict(zip([col[0] for col in cursor.description], row))


# --- DRF Auth, Permissões e Erros SQLite ---

class EcoRotaJWTAuthentication(authentication.BaseAuthentication):
    keyword = "Bearer"

    def authenticate(self, request):
        header = authentication.get_authorization_header(request).decode("utf-8").strip()
        if not header.startswith(f"{self.keyword} "):
            return None
        token = header[len(self.keyword) + 1 :].strip()
        try:
            user_id = int(verify_jwt(token)["sub"])
        except Exception:
            raise exceptions.AuthenticationFailed("Sessão inválida ou expirada. Faça login novamente.")

        usuario = Usuario.objects.filter(id_usuario=user_id).first()
        if not usuario:
            raise exceptions.AuthenticationFailed("Usuário não encontrado.")
        if usuario.status_conta != "ATIVA":
            raise exceptions.PermissionDenied(f"Conta com status {usuario.status_conta}.")
        return (usuario, token)

    def authenticate_header(self, request):
        return self.keyword


class IsEcoRotaAuthenticated(BasePermission):
    message = "Autenticação necessária. Faça login com sua conta @usp.br."

    def has_permission(self, request, view):
        return isinstance(request.user, Usuario) and request.user.status_conta == "ATIVA"


class IsEcoRotaAuthenticatedOrReadOnly(BasePermission):
    message = "Autenticação necessária para realizar esta operação."

    def has_permission(self, request, view):
        return request.method in SAFE_METHODS or (
            isinstance(request.user, Usuario) and request.user.status_conta == "ATIVA"
        )


def ecorota_exception_handler(exc, context):
    from rest_framework.views import exception_handler

    if isinstance(exc, (IntegrityError, DatabaseError)):
        msg = str(exc)
        if "UNIQUE constraint failed" in msg:
            if "Usuario.email_institucional" in msg or "Usuario.nusp" in msg:
                return Response({"error": "E-mail institucional ou NUSP já cadastrado na plataforma."}, status=status.HTTP_409_CONFLICT)
            if "Veiculo.placa" in msg:
                return Response({"error": "Já existe um veículo cadastrado com esta placa."}, status=status.HTTP_409_CONFLICT)
            if "Reserva.id_passageiro, Reserva.id_viagem" in msg:
                return Response({"error": "Você já possui uma reserva registrada para esta carona."}, status=status.HTTP_409_CONFLICT)
            if "Avaliacao.id_viagem" in msg:
                return Response({"error": "Você já avaliou este participante nesta viagem."}, status=status.HTTP_409_CONFLICT)
            return Response({"error": "Registro duplicado."}, status=status.HTTP_409_CONFLICT)

        if "CHECK constraint failed" in msg:
            if "valor_rateio" in msg:
                return Response({"error": "O valor do rateio viola a regra de rateio solidário."}, status=status.HTTP_400_BAD_REQUEST)
            if "email_institucional" in msg:
                return Response({"error": "Utilize um e-mail institucional @usp.br."}, status=status.HTTP_400_BAD_REQUEST)
            if "previsao_chegada" in msg:
                return Response({"error": "A previsão de chegada deve ser posterior ao horário de partida."}, status=status.HTTP_400_BAD_REQUEST)
            return Response({"error": f"Dados inválidos: {msg}"}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"error": msg}, status=status.HTTP_400_BAD_REQUEST)

    response = exception_handler(exc, context)
    if response is not None and isinstance(response.data, dict) and "detail" in response.data:
        response.data = {"error": str(response.data["detail"])}
    return response
