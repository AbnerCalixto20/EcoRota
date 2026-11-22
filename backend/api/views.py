import base64
import re
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.conf import settings
from django.db import connection, transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .auth import (
    IsEcoRotaAuthenticated,
    IsEcoRotaAuthenticatedOrReadOnly,
    calculate_max_solidary_fare,
    estimate_road_distance_km,
    fetchall_dict,
    fetchone_dict,
    generate_opaque_token,
    hash_password,
    hash_token,
    haversine_km,
    normalize_sql_datetime,
    now_sql_datetime,
    sign_jwt,
    validate_password_strength,
    verify_password,
)
from .models import DimDestino, Notificacao, Usuario, Veiculo, Viagem
from .serializers import DimDestinoSerializer, VeiculoSerializer

MAX_PHOTO_BYTES = 5 * 1024 * 1024


# =============================================================================
# 1. HEALTH & AUTENTICAÇÃO (ECR001, ECR002, ECR011)
# =============================================================================

@api_view(["GET"])
@permission_classes([AllowAny])
def health(request):
    with connection.cursor() as cursor:
        cursor.execute("PRAGMA foreign_keys;")
        fk = cursor.fetchone()[0] == 1
    return Response({"status": "ok", "service": "EcoRota USP API", "foreign_keys_enabled": fk})


@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    data = request.data or {}
    nome = str(data.get("nome_completo") or "").strip()
    nusp = str(data.get("nusp") or "").strip()
    email = str(data.get("email_institucional") or "").strip().lower()
    telefone = str(data.get("telefone") or "").strip() or None
    senha = data.get("senha") or ""

    if not nome or not nusp or not email or not senha:
        return Response({"error": "Preencha Nome Completo, NUSP, E-mail institucional e Senha."}, status=400)
    if not data.get("termos_aceitos"):
        return Response({"error": "É obrigatório aceitar os Termos de Uso e a Política LGPD."}, status=400)
    if not email.endswith("@usp.br"):
        return Response({"error": "Domínio inválido. Apenas e-mails institucionais (@usp.br) são permitidos."}, status=400)

    pwd_err = validate_password_strength(senha)
    if pwd_err:
        return Response({"error": pwd_err}, status=400)

    if fetchone_dict("SELECT id_usuario FROM Usuario WHERE lower(email_institucional)=lower(%s) OR nusp=%s", [email, nusp]):
        return Response({"error": "E-mail institucional ou NUSP já cadastrados."}, status=409)

    raw_token = generate_opaque_token(20)
    now_sql = now_sql_datetime()
    expira_sql = now_sql_datetime(offset_minutes=24 * 60)

    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO Usuario (nome_completo, nusp, email_institucional, telefone, senha_hash,
                                     status_conta, termos_aceitos_em, versao_termos)
                VALUES (%s, %s, %s, %s, %s, 'PENDENTE_ATIVACAO', %s, '1.0')
                """,
                [nome, nusp, email, telefone, hash_password(senha), now_sql],
            )
            uid = cursor.lastrowid
            cursor.execute(
                "INSERT INTO Token_Usuario (id_usuario, finalidade, token_hash, expira_em) VALUES (%s, 'ATIVACAO', %s, %s)",
                [uid, hash_token(raw_token), expira_sql],
            )

    payload = {
        "message": "Cadastro realizado! Confirme seu e-mail institucional para ativar a conta.",
        "id_usuario": uid,
        "status_conta": "PENDENTE_ATIVACAO",
    }
    if settings.DEBUG:
        payload["dev_activation_token"] = raw_token
    return Response(payload, status=201)


@api_view(["POST"])
@permission_classes([AllowAny])
def activate(request):
    raw_token = str((request.data or {}).get("token") or "").strip()
    if not raw_token:
        return Response({"error": "Token de ativação obrigatório."}, status=400)

    row = fetchone_dict(
        "SELECT id_token, id_usuario, expira_em, utilizado_em FROM Token_Usuario WHERE token_hash=%s AND finalidade='ATIVACAO'",
        [hash_token(raw_token)],
    )
    now_sql = now_sql_datetime()
    if not row or row["utilizado_em"] or row["expira_em"] < now_sql:
        return Response({"error": "Token de ativação inválido, já utilizado ou expirado."}, status=400)

    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute("UPDATE Usuario SET status_conta='ATIVA' WHERE id_usuario=%s", [row["id_usuario"]])
            cursor.execute("UPDATE Token_Usuario SET utilizado_em=%s WHERE id_token=%s", [now_sql, row["id_token"]])
    return Response({"message": "Conta institucional ativada com sucesso! Você já pode fazer login."})


@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    data = request.data or {}
    ident = str(data.get("identificador") or "").strip()
    senha = data.get("senha") or ""
    if not ident or not senha:
        return Response({"error": "Informe seu E-mail institucional/NUSP e Senha."}, status=400)

    user = fetchone_dict(
        """
        SELECT id_usuario, nome_completo, nusp, email_institucional, telefone,
               senha_hash, status_conta, bio, falhas_login, bloqueado_ate
          FROM Usuario
         WHERE lower(email_institucional)=lower(%s) OR nusp=%s
        """,
        [ident, ident],
    )
    if not user:
        return Response({"error": "E-mail/NUSP ou senha inválidos."}, status=401)

    now_sql = now_sql_datetime()
    if user["bloqueado_ate"] and user["bloqueado_ate"] > now_sql:
        return Response({"error": f"Acesso bloqueado temporariamente até {user['bloqueado_ate']}."}, status=423)
    if user["status_conta"] in ("PENDENTE_ATIVACAO", "INATIVA"):
        return Response({"error": f"Conta com status {user['status_conta']}."}, status=403)

    if not verify_password(senha, user["senha_hash"]):
        fails = int(user["falhas_login"] or 0) + 1
        with connection.cursor() as cursor:
            if fails >= 5:
                cursor.execute(
                    "UPDATE Usuario SET falhas_login=%s, bloqueado_ate=%s, status_conta='BLOQUEADA' WHERE id_usuario=%s",
                    [fails, now_sql_datetime(30), user["id_usuario"]],
                )
                return Response({"error": "Conta bloqueada por 30 minutos após 5 tentativas incorretas."}, status=423)
            cursor.execute("UPDATE Usuario SET falhas_login=%s WHERE id_usuario=%s", [fails, user["id_usuario"]])
        return Response({"error": "E-mail/NUSP ou senha inválidos."}, status=401)

    with connection.cursor() as cursor:
        cursor.execute(
            "UPDATE Usuario SET falhas_login=0, bloqueado_ate=NULL, status_conta='ATIVA' WHERE id_usuario=%s",
            [user["id_usuario"]],
        )

    rep = fetchone_dict(
        "SELECT reputacao, quantidade_avaliacoes FROM View_Reputacao_Usuario WHERE id_usuario=%s",
        [user["id_usuario"]],
    ) or {"reputacao": 0, "quantidade_avaliacoes": 0}

    return Response(
        {
            "token": sign_jwt(user["id_usuario"], user["email_institucional"], user["nusp"]),
            "usuario": {
                "id_usuario": user["id_usuario"],
                "nome_completo": user["nome_completo"],
                "nusp": user["nusp"],
                "email_institucional": user["email_institucional"],
                "telefone": user["telefone"],
                "bio": user["bio"],
                "status_conta": "ATIVA",
                "reputacao": rep["reputacao"] or 0,
                "quantidade_avaliacoes": rep["quantidade_avaliacoes"] or 0,
            },
        }
    )


@api_view(["GET"])
@permission_classes([IsEcoRotaAuthenticated])
def me(request):
    u: Usuario = request.user
    rep = fetchone_dict("SELECT reputacao, quantidade_avaliacoes FROM View_Reputacao_Usuario WHERE id_usuario=%s", [u.id_usuario]) or {}
    return Response(
        {
            "usuario": {
                "id_usuario": u.id_usuario,
                "nome_completo": u.nome_completo,
                "nusp": u.nusp,
                "email_institucional": u.email_institucional,
                "telefone": u.telefone,
                "status_conta": u.status_conta,
                "bio": u.bio,
                "cadastrado_em": u.cadastrado_em,
                "reputacao": rep.get("reputacao") or 0,
                "quantidade_avaliacoes": rep.get("quantidade_avaliacoes") or 0,
                "possui_veiculo": Veiculo.objects.filter(usuario_id=u.id_usuario, ativo=1).exists(),
                "notificacoes_nao_lidas": Notificacao.objects.filter(usuario_id=u.id_usuario, lida_em__isnull=True).count(),
            }
        }
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def forgot_password(request):
    email = str((request.data or {}).get("email_institucional") or "").strip()
    if not email:
        return Response({"error": "Informe o e-mail institucional associado à conta."}, status=400)

    user = fetchone_dict("SELECT id_usuario FROM Usuario WHERE lower(email_institucional)=lower(%s)", [email])
    dev_token = None
    if user:
        raw_token = generate_opaque_token(20)
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO Token_Usuario (id_usuario, finalidade, token_hash, expira_em) VALUES (%s, 'RECUPERACAO', %s, %s)",
                [user["id_usuario"], hash_token(raw_token), now_sql_datetime(30)],
            )
        if settings.DEBUG:
            dev_token = raw_token

    resp = {"message": "Se o e-mail estiver cadastrado, enviamos um token de redefinição (validade: 30 min)."}
    if dev_token:
        resp["dev_reset_token"] = dev_token
    return Response(resp)


@api_view(["POST"])
@permission_classes([AllowAny])
def reset_password(request):
    data = request.data or {}
    raw_token = str(data.get("token") or "").strip()
    nova_senha = data.get("nova_senha") or ""
    if not raw_token or not nova_senha:
        return Response({"error": "Token e nova senha são obrigatórios."}, status=400)
    pwd_err = validate_password_strength(nova_senha)
    if pwd_err:
        return Response({"error": pwd_err}, status=400)

    row = fetchone_dict(
        "SELECT id_token, id_usuario, expira_em, utilizado_em FROM Token_Usuario WHERE token_hash=%s AND finalidade='RECUPERACAO'",
        [hash_token(raw_token)],
    )
    now_sql = now_sql_datetime()
    if not row or row["utilizado_em"] or row["expira_em"] < now_sql:
        return Response({"error": "Token inválido, já utilizado ou expirado."}, status=400)

    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE Usuario
                   SET senha_hash=%s, falhas_login=0, bloqueado_ate=NULL,
                       status_conta=CASE WHEN status_conta='BLOQUEADA' THEN 'ATIVA' ELSE status_conta END
                 WHERE id_usuario=%s
                """,
                [hash_password(nova_senha), row["id_usuario"]],
            )
            cursor.execute("UPDATE Token_Usuario SET utilizado_em=%s WHERE id_token=%s", [now_sql, row["id_token"]])
    return Response({"message": "Senha redefinida com sucesso!"})


# =============================================================================
# 2. PERFIL E VEÍCULOS (ECR015)
# =============================================================================

@api_view(["GET", "PUT"])
@permission_classes([IsEcoRotaAuthenticated])
def perfil(request):
    u = request.user
    if request.method == "GET":
        rep = fetchone_dict("SELECT reputacao, quantidade_avaliacoes FROM View_Reputacao_Usuario WHERE id_usuario=%s", [u.id_usuario]) or {}
        impacto = fetchone_dict("SELECT * FROM View_Dashboard_Sustentavel_Usuario WHERE id_usuario=%s", [u.id_usuario])
        veiculos = Veiculo.objects.filter(usuario_id=u.id_usuario, ativo=1).order_by("-id_veiculo")
        foto = None
        if u.foto:
            raw = bytes(u.foto)
            try:
                txt = raw.decode("utf-8")
                foto = txt if txt.startswith("data:image/") else f"data:image/jpeg;base64,{base64.b64encode(raw).decode('ascii')}"
            except UnicodeDecodeError:
                foto = f"data:image/jpeg;base64,{base64.b64encode(raw).decode('ascii')}"
        return Response(
            {
                "perfil": {
                    "id_usuario": u.id_usuario,
                    "nome_completo": u.nome_completo,
                    "nusp": u.nusp,
                    "email_institucional": u.email_institucional,
                    "telefone": u.telefone,
                    "status_conta": u.status_conta,
                    "bio": u.bio,
                    "foto_data_url": foto,
                    "cadastrado_em": u.cadastrado_em,
                    "reputacao": rep.get("reputacao") or 0,
                    "quantidade_avaliacoes": rep.get("quantidade_avaliacoes") or 0,
                },
                "impacto": impacto,
                "veiculos": VeiculoSerializer(veiculos, many=True).data,
            }
        )

    data = request.data or {}
    if ("nusp" in data and data["nusp"] and str(data["nusp"]).strip() != u.nusp) or (
        "email_institucional" in data and data["email_institucional"] and str(data["email_institucional"]).strip().lower() != u.email_institucional.lower()
    ):
        return Response(
            {"error": "NUSP e E-mail institucional são campos restritos e dependem de validação institucional via suporte."},
            status=403,
        )

    telefone = str(data.get("telefone") or "").strip() or None
    bio = str(data.get("bio") or "").strip() or None
    foto_provided = "foto_data_url" in data
    foto_bytes = None
    if foto_provided and data["foto_data_url"]:
        raw_str = str(data["foto_data_url"])
        match = re.match(r"^data:image/(jpeg|jpg|png);base64,(.+)$", raw_str, flags=re.IGNORECASE)
        if not match:
            return Response({"error": "Envie apenas imagens JPG ou PNG."}, status=400)
        if len(base64.b64decode(match.group(2))) > MAX_PHOTO_BYTES:
            return Response({"error": "A foto de perfil deve ter no máximo 5 MB."}, status=400)
        foto_bytes = raw_str.encode("utf-8")

    with connection.cursor() as cursor:
        if foto_provided:
            cursor.execute("UPDATE Usuario SET telefone=%s, bio=%s, foto=%s WHERE id_usuario=%s", [telefone, bio, foto_bytes, u.id_usuario])
        else:
            cursor.execute("UPDATE Usuario SET telefone=%s, bio=%s WHERE id_usuario=%s", [telefone, bio, u.id_usuario])
    return Response({"message": "Perfil atualizado com sucesso."})


@api_view(["GET", "POST"])
@permission_classes([IsEcoRotaAuthenticated])
def veiculos(request):
    if request.method == "GET":
        qs = Veiculo.objects.filter(usuario_id=request.user.id_usuario, ativo=1).order_by("-id_veiculo")
        return Response({"veiculos": VeiculoSerializer(qs, many=True).data})

    data = request.data or {}
    marca = str(data.get("marca") or "").strip()
    modelo = str(data.get("modelo") or "").strip()
    placa = str(data.get("placa") or "").strip().upper()
    cor = str(data.get("cor") or "").strip() or None
    ano = int(data["ano"]) if data.get("ano") not in (None, "") else None
    try:
        cap = int(data.get("capacidade_passageiros") or 0)
    except (TypeError, ValueError):
        cap = 0

    if not marca or not modelo or not placa or cap < 1 or cap > 8:
        return Response({"error": "Informe Marca, Modelo, Placa e capacidade (1 a 8)."}, status=400)

    with connection.cursor() as cursor:
        cursor.execute(
            "INSERT INTO Veiculo (id_usuario, marca, modelo, cor, placa, ano, capacidade_passageiros, ativo) VALUES (%s,%s,%s,%s,%s,%s,%s,1)",
            [request.user.id_usuario, marca, modelo, cor, placa, ano, cap],
        )
        vid = cursor.lastrowid
    return Response({"message": "Veículo cadastrado com sucesso!", "veiculo": VeiculoSerializer(Veiculo.objects.get(id_veiculo=vid)).data}, status=201)


@api_view(["DELETE"])
@permission_classes([IsEcoRotaAuthenticated])
def veiculo_delete(request, veiculo_id: int):
    if not Veiculo.objects.filter(id_veiculo=veiculo_id, usuario_id=request.user.id_usuario).exists():
        return Response({"error": "Veículo não encontrado."}, status=404)
    if Viagem.objects.filter(veiculo_id=veiculo_id, status_oferta__in=["DISPONIVEL", "EM_ANDAMENTO"]).exists():
        return Response({"error": "Não é possível remover um veículo vinculado a corridas ativas."}, status=409)
    with connection.cursor() as cursor:
        cursor.execute("UPDATE Veiculo SET ativo=0 WHERE id_veiculo=%s", [veiculo_id])
    return Response({"message": "Veículo removido da lista de veículos ativos."})


# =============================================================================
# 3. DESTINOS E DIMENSÕES
# =============================================================================

@api_view(["GET"])
@permission_classes([AllowAny])
def destinos(request):
    qs = DimDestino.objects.filter(ativo=1).order_by("tipo_destino", "nome_destino")
    return Response({"destinos": DimDestinoSerializer(qs, many=True).data})


@api_view(["GET"])
@permission_classes([AllowAny])
def dimensoes(request):
    return Response(
        {
            "destinos": fetchall_dict("SELECT id_destino, tipo_destino, campus, restaurante, nome_destino FROM Dim_Destino WHERE ativo=1 ORDER BY tipo_destino, nome_destino"),
            "tempos": fetchall_dict("SELECT id_tempo, ano, mes, nome_mes, trimestre, printf('%04d-%02d', ano, mes) AS mes_referencia FROM Dim_Tempo ORDER BY id_tempo DESC"),
            "turnos": fetchall_dict("SELECT id_turno, nome_turno, hora_inicio, hora_fim FROM Dim_Turno ORDER BY id_turno"),
            "parametroAmbiental": fetchone_dict("SELECT kg_co2_por_km, kg_co2_por_arvore, atualizado_em FROM Parametro_Ambiental WHERE id_parametro=1"),
        }
    )


# =============================================================================
# 4. VIAGENS (ECR003, ECR004, ECR006, ECR007, ECR008)
# =============================================================================

@api_view(["GET", "POST"])
@permission_classes([IsEcoRotaAuthenticatedOrReadOnly])
def viagens(request):
    if request.method == "GET":
        q = request.query_params
        vagas_min = max(1, int(q.get("vagas_min") or 1))
        conds, params = ["V.status_oferta='DISPONIVEL'", "V.vagas_disponiveis >= %s"], [vagas_min]

        if q.get("id_destino"):
            conds.append("V.id_destino=%s")
            params.append(int(q["id_destino"]))
        if q.get("destino") and q["destino"].strip():
            term = f"%{q['destino'].strip().lower()}%"
            conds.append("(lower(V.destino_final) LIKE %s OR lower(V.campus) LIKE %s OR lower(COALESCE(V.restaurante,'')) LIKE %s)")
            params.extend([term, term, term])
        if q.get("data") and q["data"].strip():
            conds.append("substr(V.data_horario,1,10)=%s")
            params.append(q["data"].strip())
        if (q.get("modalidade") or "").upper() in ("AUTOMATICA", "MANUAL"):
            conds.append("V.modalidade_aprovacao=%s")
            params.append(q["modalidade"].upper())
        if q.get("somente_gratuitas") == "true":
            conds.append("V.valor_rateio=0")

        rows = fetchall_dict(
            f"""
            SELECT V.*, U.nome_completo AS motorista_nome, U.nusp AS motorista_nusp,
                   COALESCE(R.reputacao, 0) AS motorista_reputacao,
                   COALESCE(R.quantidade_avaliacoes, 0) AS motorista_avaliacoes,
                   VE.marca AS veiculo_marca, VE.modelo AS veiculo_modelo,
                   VE.cor AS veiculo_cor, VE.placa AS veiculo_placa, VE.ano AS veiculo_ano
              FROM View_Viagens_Com_Vagas V
              JOIN Usuario U ON U.id_usuario = V.id_motorista
              LEFT JOIN View_Reputacao_Usuario R ON R.id_usuario = V.id_motorista
              JOIN Veiculo VE ON VE.id_veiculo = V.id_veiculo
             WHERE {' AND '.join(conds)}
             ORDER BY V.data_horario ASC
            """,
            params,
        )

        origem_term = (q.get("origem") or "").strip().lower()
        if q.get("id_origem") and not origem_term:
            orig_row = fetchone_dict("SELECT nome_destino FROM Dim_Destino WHERE id_destino=%s AND ativo=1", [int(q["id_origem"])])
            if orig_row:
                origem_term = orig_row["nome_destino"].strip().lower()
        ref_lat, ref_lng = q.get("lat"), q.get("lng")
        result = []
        for r in rows:
            paradas = fetchall_dict(
                "SELECT id_parada, ordem, descricao_local, latitude, longitude FROM Parada_Viagem WHERE id_viagem=%s ORDER BY ordem",
                [r["id_viagem"]],
            )
            r["paradas"] = paradas
            r["desvio_km"] = None
            if ref_lat is not None and ref_lng is not None:
                dists = [haversine_km(ref_lat, ref_lng, r["latitude_partida"], r["longitude_partida"])] + [
                    haversine_km(ref_lat, ref_lng, p["latitude"], p["longitude"]) for p in paradas
                ]
                valid = [d for d in dists if d is not None]
                r["desvio_km"] = min(valid) if valid else None
            if origem_term and origem_term not in r["ponto_partida"].lower() and not any(origem_term in p["descricao_local"].lower() for p in paradas):
                continue
            result.append(r)

        result.sort(key=lambda r: (r["desvio_km"] if r["desvio_km"] is not None else float("inf"), r["data_horario"]))
        return Response({"viagens": result})

    # POST — ECR007 Criar Corrida
    d = request.data or {}
    start_sql = normalize_sql_datetime(str(d.get("data_horario") or ""))
    end_sql = normalize_sql_datetime(str(d.get("previsao_chegada") or ""))

    ponto_partida = str(d.get("ponto_partida") or "").strip()
    lat = d.get("latitude_partida")
    lng = d.get("longitude_partida")
    id_origem = d.get("id_origem")
    if id_origem not in (None, ""):
        orig = fetchone_dict("SELECT id_destino, nome_destino, latitude, longitude FROM Dim_Destino WHERE id_destino=%s AND ativo=1", [int(id_origem)])
        if not orig:
            return Response({"error": "Ponto de partida não encontrado ou inativo."}, status=404)
        ponto_partida = orig["nome_destino"]
        if lat is None:
            lat = orig["latitude"]
        if lng is None:
            lng = orig["longitude"]

    if not d.get("id_veiculo") or not ponto_partida or not d.get("id_destino") or not start_sql or not end_sql:
        return Response({"error": "Informe veículo, partida, destino, saída e chegada."}, status=400)
    if end_sql <= start_sql:
        return Response({"error": "A previsão de chegada deve ser posterior ao horário de partida."}, status=400)

    vagas_total = int(d.get("vagas_total") or 1)
    comb = float(d.get("custo_combustivel_previsto") or 0)
    pedagio = float(d.get("custo_pedagio_previsto") or 0)
    rateio = float(d.get("valor_rateio") or 0)
    max_rateio = calculate_max_solidary_fare(comb, pedagio, vagas_total)
    if rateio > max_rateio + 0.01:
        return Response({"error": f"Rateio excede o teto solidário de R$ {max_rateio:.2f}."}, status=400)

    lat = float(lat if lat is not None else -23.5718)
    lng = float(lng if lng is not None else -46.7081)
    dest = fetchone_dict("SELECT id_destino, nome_destino, latitude, longitude FROM Dim_Destino WHERE id_destino=%s AND ativo=1", [int(d["id_destino"])])
    if not dest:
        return Response({"error": "Destino não encontrado ou inativo."}, status=404)
    if (id_origem not in (None, "") and int(id_origem) == int(dest["id_destino"])) or ponto_partida.lower() == dest["nome_destino"].strip().lower():
        return Response({"error": "O ponto de partida e o destino não podem ser o mesmo local."}, status=400)

    dist = float(d["distancia_km"]) if d.get("distancia_km") not in (None, "") and float(d["distancia_km"]) > 0 else estimate_road_distance_km(lat, lng, dest["latitude"], dest["longitude"])

    paradas_resolvidas = []
    nomes_usados = {ponto_partida.lower(), dest["nome_destino"].strip().lower()}
    for p in d.get("paradas") or []:
        if isinstance(p, str):
            desc = p.strip()
            p_lat, p_lng = lat, lng
            p_id = None
        else:
            p = p or {}
            p_id = p.get("id_destino")
            if p_id not in (None, ""):
                parada_dest = fetchone_dict(
                    "SELECT id_destino, nome_destino, latitude, longitude FROM Dim_Destino WHERE id_destino=%s AND ativo=1",
                    [int(p_id)],
                )
                if not parada_dest:
                    return Response({"error": "Parada intermediária não encontrada ou inativa."}, status=404)
                if (id_origem not in (None, "") and int(p_id) == int(id_origem)) or int(p_id) == int(dest["id_destino"]):
                    return Response({"error": "A parada intermediária não pode ser igual ao ponto de partida ou ao destino."}, status=400)
                desc = parada_dest["nome_destino"]
                p_lat = parada_dest["latitude"] if parada_dest["latitude"] is not None else lat
                p_lng = parada_dest["longitude"] if parada_dest["longitude"] is not None else lng
            else:
                desc = str(p.get("descricao_local") or "").strip()
                p_lat = float(p["latitude"]) if p.get("latitude") is not None else lat
                p_lng = float(p["longitude"]) if p.get("longitude") is not None else lng
        if not desc:
            continue
        if desc.lower() in nomes_usados:
            return Response({"error": "A parada intermediária não pode ser igual ao ponto de partida, ao destino ou a outra parada."}, status=400)
        nomes_usados.add(desc.lower())
        paradas_resolvidas.append((desc, p_lat, p_lng))

    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO Viagem (id_motorista, id_veiculo, ponto_partida, latitude_partida, longitude_partida,
                                    id_destino, data_horario, previsao_chegada, vagas_total, modalidade_aprovacao,
                                    status_oferta, custo_combustivel_previsto, custo_pedagio_previsto, valor_rateio, distancia_km)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'DISPONIVEL',%s,%s,%s,%s)
                """,
                [
                    request.user.id_usuario, int(d["id_veiculo"]), ponto_partida,
                    lat, lng, int(d["id_destino"]), start_sql, end_sql, vagas_total,
                    str(d.get("modalidade_aprovacao") or "AUTOMATICA").upper(), comb, pedagio, rateio, dist,
                ],
            )
            vid = cursor.lastrowid
            for ordem, (desc, p_lat, p_lng) in enumerate(paradas_resolvidas, start=1):
                cursor.execute(
                    "INSERT INTO Parada_Viagem (id_viagem, ordem, descricao_local, latitude, longitude) VALUES (%s,%s,%s,%s,%s)",
                    [vid, ordem, desc, p_lat, p_lng],
                )

    return Response(
        {"message": "Corrida publicada com sucesso!", "viagem": fetchone_dict("SELECT * FROM View_Viagens_Com_Vagas WHERE id_viagem=%s", [vid])},
        status=201,
    )


@api_view(["GET"])
@permission_classes([IsEcoRotaAuthenticated])
def minhas_viagens(request):
    uid = request.user.id_usuario
    como_motorista = fetchall_dict(
        """
        SELECT V.*, VE.marca AS veiculo_marca, VE.modelo AS veiculo_modelo, VE.cor AS veiculo_cor, VE.placa AS veiculo_placa
          FROM View_Viagens_Com_Vagas V JOIN Veiculo VE ON VE.id_veiculo = V.id_veiculo
         WHERE V.id_motorista=%s AND V.status_oferta IN ('DISPONIVEL','EM_ANDAMENTO')
         ORDER BY V.data_horario ASC
        """,
        [uid],
    )
    for v in como_motorista:
        v["reservas"] = fetchall_dict(
            """
            SELECT R.id_reserva, R.id_passageiro, R.status_reserva, R.solicitada_em,
                   U.nome_completo AS passageiro_nome, U.nusp AS passageiro_nusp,
                   COALESCE(REP.reputacao, 0) AS passageiro_reputacao
              FROM Reserva R JOIN Usuario U ON U.id_usuario = R.id_passageiro
              LEFT JOIN View_Reputacao_Usuario REP ON REP.id_usuario = R.id_passageiro
             WHERE R.id_viagem=%s AND R.status_reserva IN ('PENDENTE_APROVACAO','CONFIRMADO')
            """,
            [v["id_viagem"]],
        )
    como_passageiro = fetchall_dict(
        """
        SELECT R.id_reserva, R.status_reserva, R.solicitada_em, V.*,
               U.nome_completo AS motorista_nome, COALESCE(REP.reputacao, 0) AS motorista_reputacao,
               VE.marca AS veiculo_marca, VE.modelo AS veiculo_modelo, VE.cor AS veiculo_cor, VE.placa AS veiculo_placa
          FROM Reserva R
          JOIN View_Viagens_Com_Vagas V ON V.id_viagem = R.id_viagem
          JOIN Usuario U ON U.id_usuario = V.id_motorista
          LEFT JOIN View_Reputacao_Usuario REP ON REP.id_usuario = V.id_motorista
          JOIN Veiculo VE ON VE.id_veiculo = V.id_veiculo
         WHERE R.id_passageiro=%s AND R.status_reserva IN ('PENDENTE_APROVACAO','CONFIRMADO')
           AND V.status_oferta IN ('DISPONIVEL','EM_ANDAMENTO')
         ORDER BY V.data_horario ASC
        """,
        [uid],
    )
    return Response({"como_motorista": como_motorista, "como_passageiro": como_passageiro})


@api_view(["GET"])
@permission_classes([AllowAny])
def viagem_detail(request, viagem_id: int):
    v = fetchone_dict(
        """
        SELECT V.*, U.nome_completo AS motorista_nome, U.nusp AS motorista_nusp, U.bio AS motorista_bio,
               COALESCE(REP.reputacao, 0) AS motorista_reputacao, COALESCE(REP.quantidade_avaliacoes, 0) AS motorista_avaliacoes,
               VE.marca AS veiculo_marca, VE.modelo AS veiculo_modelo, VE.cor AS veiculo_cor,
               VE.placa AS veiculo_placa, VE.ano AS veiculo_ano, VE.capacidade_passageiros
          FROM View_Viagens_Com_Vagas V
          JOIN Usuario U ON U.id_usuario = V.id_motorista
          LEFT JOIN View_Reputacao_Usuario REP ON REP.id_usuario = V.id_motorista
          JOIN Veiculo VE ON VE.id_veiculo = V.id_veiculo
         WHERE V.id_viagem=%s
        """,
        [viagem_id],
    )
    if not v:
        return Response({"error": "Carona não encontrada."}, status=404)
    v["paradas"] = fetchall_dict("SELECT id_parada, ordem, descricao_local, latitude, longitude FROM Parada_Viagem WHERE id_viagem=%s ORDER BY ordem", [viagem_id])
    v["passageiros_confirmados"] = fetchall_dict(
        """
        SELECT R.id_reserva, U.id_usuario, U.nome_completo, COALESCE(REP.reputacao, 0) AS reputacao
          FROM Reserva R JOIN Usuario U ON U.id_usuario = R.id_passageiro
          LEFT JOIN View_Reputacao_Usuario REP ON REP.id_usuario = U.id_usuario
         WHERE R.id_viagem=%s AND R.status_reserva='CONFIRMADO'
        """,
        [viagem_id],
    )
    v["minha_reserva"] = (
        fetchone_dict("SELECT * FROM Reserva WHERE id_viagem=%s AND id_passageiro=%s", [viagem_id, request.user.id_usuario])
        if isinstance(request.user, Usuario)
        else None
    )
    return Response({"viagem": v})


@api_view(["PATCH"])
@permission_classes([IsEcoRotaAuthenticated])
def viagem_iniciar(request, viagem_id: int):
    ride = fetchone_dict("SELECT id_motorista FROM Viagem WHERE id_viagem=%s", [viagem_id])
    if not ride:
        return Response({"error": "Viagem não encontrada."}, status=404)
    if ride["id_motorista"] != request.user.id_usuario:
        return Response({"error": "Apenas o motorista pode iniciar esta viagem."}, status=403)
    with connection.cursor() as cursor:
        cursor.execute("UPDATE Viagem SET status_oferta='EM_ANDAMENTO' WHERE id_viagem=%s", [viagem_id])
    return Response({"message": "Viagem iniciada! Status atualizado para EM_ANDAMENTO."})


@api_view(["PATCH"])
@permission_classes([IsEcoRotaAuthenticated])
def viagem_concluir(request, viagem_id: int):
    ride = fetchone_dict("SELECT id_motorista FROM Viagem WHERE id_viagem=%s", [viagem_id])
    if not ride:
        return Response({"error": "Viagem não encontrada."}, status=404)
    if ride["id_motorista"] != request.user.id_usuario:
        return Response({"error": "Apenas o motorista pode concluir esta viagem."}, status=403)
    with connection.cursor() as cursor:
        cursor.execute("UPDATE Viagem SET status_oferta='CONCLUIDA', concluida_em=%s WHERE id_viagem=%s", [now_sql_datetime(), viagem_id])
    fato = fetchone_dict("SELECT * FROM Fato_Dashboard_Sustentavel WHERE id_viagem=%s", [viagem_id])
    return Response({"message": "Viagem concluída! Avaliações habilitadas e impacto contabilizado.", "fato_sustentavel": fato})


@api_view(["PATCH"])
@permission_classes([IsEcoRotaAuthenticated])
def viagem_cancelar(request, viagem_id: int):
    ride = fetchone_dict("SELECT id_motorista FROM Viagem WHERE id_viagem=%s", [viagem_id])
    if not ride:
        return Response({"error": "Viagem não encontrada."}, status=404)
    if ride["id_motorista"] != request.user.id_usuario:
        return Response({"error": "Apenas o motorista pode cancelar esta viagem."}, status=403)
    motivo = str((request.data or {}).get("motivo_cancelamento") or "").strip() or "Cancelada pelo motorista"
    with connection.cursor() as cursor:
        cursor.execute(
            "UPDATE Viagem SET status_oferta='CANCELADA', motivo_cancelamento=%s, cancelada_em=%s WHERE id_viagem=%s",
            [motivo, now_sql_datetime(), viagem_id],
        )
    return Response({"message": "Viagem cancelada e passageiros notificados."})


# =============================================================================
# 5. RESERVAS (ECR004, ECR005, ECR006)
# =============================================================================

@api_view(["POST"])
@permission_classes([IsEcoRotaAuthenticated])
def reservas_create(request):
    id_viagem = (request.data or {}).get("id_viagem")
    if not id_viagem:
        return Response({"error": "Informe id_viagem."}, status=400)
    viagem = fetchone_dict("SELECT modalidade_aprovacao FROM Viagem WHERE id_viagem=%s", [int(id_viagem)])
    if not viagem:
        return Response({"error": "Carona não encontrada."}, status=404)

    st = "CONFIRMADO" if viagem["modalidade_aprovacao"] == "AUTOMATICA" else "PENDENTE_APROVACAO"
    with connection.cursor() as cursor:
        cursor.execute(
            "INSERT INTO Reserva (id_passageiro, id_viagem, status_reserva, decidida_em) VALUES (%s,%s,%s,%s)",
            [request.user.id_usuario, int(id_viagem), st, now_sql_datetime() if st == "CONFIRMADO" else None],
        )
        rid = cursor.lastrowid
    msg = "Vaga confirmada automaticamente! Chat liberado." if st == "CONFIRMADO" else "Solicitação enviada! Aguarde aprovação do motorista."
    return Response({"message": msg, "reserva": fetchone_dict("SELECT * FROM Reserva WHERE id_reserva=%s", [rid])}, status=201)


@api_view(["GET"])
@permission_classes([IsEcoRotaAuthenticated])
def reservas_pendentes(request):
    solicitacoes = fetchall_dict(
        """
        SELECT R.id_reserva, R.id_viagem, R.id_passageiro, R.status_reserva, R.solicitada_em,
               U.nome_completo AS passageiro_nome, U.nusp AS passageiro_nusp,
               U.email_institucional AS passageiro_email, U.bio AS passageiro_bio,
               COALESCE(REP.reputacao, 0) AS passageiro_reputacao, COALESCE(REP.quantidade_avaliacoes, 0) AS passageiro_avaliacoes,
               V.ponto_partida, V.destino_final, V.data_horario, V.vagas_total, V.vagas_disponiveis
          FROM Reserva R
          JOIN View_Viagens_Com_Vagas V ON V.id_viagem = R.id_viagem
          JOIN Usuario U ON U.id_usuario = R.id_passageiro
          LEFT JOIN View_Reputacao_Usuario REP ON REP.id_usuario = U.id_usuario
         WHERE V.id_motorista=%s AND R.status_reserva='PENDENTE_APROVACAO' AND V.status_oferta='DISPONIVEL'
         ORDER BY R.solicitada_em ASC
        """,
        [request.user.id_usuario],
    )
    return Response({"solicitacoes": solicitacoes})


@api_view(["PATCH"])
@permission_classes([IsEcoRotaAuthenticated])
def reserva_decidir(request, reserva_id: int):
    dec = str((request.data or {}).get("decisao") or "").upper()
    if dec not in ("ACEITAR", "REJEITAR", "CONFIRMADO", "REJEITADO"):
        return Response({"error": "Envie ACEITAR ou REJEITAR."}, status=400)
    novo = "CONFIRMADO" if dec in ("ACEITAR", "CONFIRMADO") else "REJEITADO"

    row = fetchone_dict("SELECT V.id_motorista FROM Reserva R JOIN Viagem V ON V.id_viagem=R.id_viagem WHERE R.id_reserva=%s", [reserva_id])
    if not row:
        return Response({"error": "Solicitação não encontrada."}, status=404)
    if row["id_motorista"] != request.user.id_usuario:
        return Response({"error": "Apenas o motorista pode decidir esta solicitação."}, status=403)

    with connection.cursor() as cursor:
        cursor.execute("UPDATE Reserva SET status_reserva=%s, decidida_em=%s WHERE id_reserva=%s", [novo, now_sql_datetime(), reserva_id])
    return Response({"message": "Solicitação atualizada com sucesso.", "status_reserva": novo})


@api_view(["PATCH"])
@permission_classes([IsEcoRotaAuthenticated])
def reserva_cancelar(request, reserva_id: int):
    row = fetchone_dict("SELECT id_passageiro FROM Reserva WHERE id_reserva=%s", [reserva_id])
    if not row:
        return Response({"error": "Reserva não encontrada."}, status=404)
    if row["id_passageiro"] != request.user.id_usuario:
        return Response({"error": "Você só pode cancelar suas próprias reservas."}, status=403)
    just = str((request.data or {}).get("justificativa_cancelamento") or "").strip() or "Cancelado pelo passageiro"
    with connection.cursor() as cursor:
        cursor.execute(
            "UPDATE Reserva SET status_reserva='CANCELADO_PASSAGEIRO', justificativa_cancelamento=%s, cancelada_em=%s WHERE id_reserva=%s",
            [just, now_sql_datetime(), reserva_id],
        )
    return Response({"message": "Reserva cancelada e vaga devolvida."})


# =============================================================================
# 6. CHAT INTERATIVO (UC012) & AVALIAÇÕES (ECR009)
# =============================================================================

@api_view(["GET", "POST"])
@permission_classes([IsEcoRotaAuthenticated])
def mensagens_viagem(request, viagem_id: int):
    ride = fetchone_dict(
        """
        SELECT V.id_viagem, V.id_motorista, V.ponto_partida, V.destino_final,
               V.data_horario, V.status_oferta, U.nome_completo AS motorista_nome
          FROM View_Viagens_Com_Vagas V JOIN Usuario U ON U.id_usuario = V.id_motorista
         WHERE V.id_viagem=%s
        """,
        [viagem_id],
    )
    if not ride:
        return Response({"error": "Viagem não encontrada."}, status=404)

    uid = request.user.id_usuario
    is_part = ride["id_motorista"] == uid or bool(
        fetchone_dict("SELECT 1 AS ok FROM Reserva WHERE id_viagem=%s AND id_passageiro=%s AND status_reserva='CONFIRMADO'", [viagem_id, uid])
    )
    if not is_part:
        return Response({"error": "Chat disponível apenas para participantes confirmados."}, status=403)

    if request.method == "GET":
        msgs = fetchall_dict(
            """
            SELECT M.id_mensagem, M.id_viagem, M.id_remetente, M.conteudo, M.enviada_em, U.nome_completo AS remetente_nome
              FROM Mensagem M JOIN Usuario U ON U.id_usuario = M.id_remetente
             WHERE M.id_viagem=%s ORDER BY M.enviada_em ASC, M.id_mensagem ASC
            """,
            [viagem_id],
        )
        parts = fetchall_dict(
            """
            SELECT U.id_usuario, U.nome_completo, 'MOTORISTA' AS papel FROM Viagem V JOIN Usuario U ON U.id_usuario=V.id_motorista WHERE V.id_viagem=%s
            UNION ALL
            SELECT U.id_usuario, U.nome_completo, 'PASSAGEIRO' AS papel FROM Reserva R JOIN Usuario U ON U.id_usuario=R.id_passageiro WHERE R.id_viagem=%s AND R.status_reserva='CONFIRMADO'
            """,
            [viagem_id, viagem_id],
        )
        return Response({"viagem": ride, "chat_ativo": ride["status_oferta"] not in ("CONCLUIDA", "CANCELADA"), "participantes": parts, "mensagens": msgs})

    conteudo = str((request.data or {}).get("conteudo") or "").strip()
    if not conteudo:
        return Response({"error": "Digite uma mensagem."}, status=400)
    if ride["status_oferta"] in ("CONCLUIDA", "CANCELADA"):
        return Response({"error": "Chat bloqueado após conclusão ou cancelamento."}, status=403)

    with connection.cursor() as cursor:
        cursor.execute("INSERT INTO Mensagem (id_viagem, id_remetente, conteudo) VALUES (%s,%s,%s)", [viagem_id, uid, conteudo])
        mid = cursor.lastrowid
    saved = fetchone_dict(
        "SELECT M.id_mensagem, M.id_viagem, M.id_remetente, M.conteudo, M.enviada_em, U.nome_completo AS remetente_nome FROM Mensagem M JOIN Usuario U ON U.id_usuario=M.id_remetente WHERE M.id_mensagem=%s",
        [mid],
    )
    layer = get_channel_layer()
    if layer is not None:
        async_to_sync(layer.group_send)(f"chat_viagem_{viagem_id}", {"type": "chat_message", "data": saved})
    return Response({"mensagem": saved}, status=201)


@api_view(["GET"])
@permission_classes([IsEcoRotaAuthenticated])
def avaliacoes_viagem(request, viagem_id: int):
    uid = request.user.id_usuario
    viagem = fetchone_dict("SELECT id_viagem, id_motorista, ponto_partida, destino_final, data_horario, status_oferta FROM View_Viagens_Com_Vagas WHERE id_viagem=%s", [viagem_id])
    if not viagem:
        return Response({"error": "Viagem não encontrada."}, status=404)
    parts = fetchall_dict(
        """
        SELECT U.id_usuario, U.nome_completo, U.nusp, 'MOTORISTA' AS papel, COALESCE(REP.reputacao, 0) AS reputacao
          FROM Viagem V JOIN Usuario U ON U.id_usuario=V.id_motorista LEFT JOIN View_Reputacao_Usuario REP ON REP.id_usuario=U.id_usuario WHERE V.id_viagem=%s
        UNION ALL
        SELECT U.id_usuario, U.nome_completo, U.nusp, 'PASSAGEIRO' AS papel, COALESCE(REP.reputacao, 0) AS reputacao
          FROM Reserva R JOIN Usuario U ON U.id_usuario=R.id_passageiro LEFT JOIN View_Reputacao_Usuario REP ON REP.id_usuario=U.id_usuario WHERE R.id_viagem=%s AND R.status_reserva='CONFIRMADO'
        """,
        [viagem_id, viagem_id],
    )
    if not any(p["id_usuario"] == uid for p in parts):
        return Response({"error": "Acesso restrito aos participantes da viagem."}, status=403)
    minhas = {a["id_avaliado"]: a for a in fetchall_dict("SELECT id_avaliacao, id_avaliado, nota_quantitativa, observacao_qualitativa, criada_em FROM Avaliacao WHERE id_viagem=%s AND id_avaliador=%s", [viagem_id, uid])}
    return Response({"viagem": viagem, "participantes": [{**p, "avaliacao_enviada": minhas.get(p["id_usuario"])} for p in parts if p["id_usuario"] != uid]})


@api_view(["POST"])
@permission_classes([IsEcoRotaAuthenticated])
def avaliacoes_create(request):
    d = request.data or {}
    try:
        nota = int(d.get("nota_quantitativa") or 0)
    except (TypeError, ValueError):
        nota = 0
    if not d.get("id_viagem") or not d.get("id_avaliado") or nota < 1 or nota > 5:
        return Response({"error": "Informe viagem, avaliado e nota entre 1 e 5."}, status=400)
    with connection.cursor() as cursor:
        cursor.execute(
            "INSERT INTO Avaliacao (id_avaliador, id_avaliado, id_viagem, nota_quantitativa, observacao_qualitativa) VALUES (%s,%s,%s,%s,%s)",
            [request.user.id_usuario, int(d["id_avaliado"]), int(d["id_viagem"]), nota, str(d.get("observacao_qualitativa") or "").strip() or None],
        )
        aid = cursor.lastrowid
    return Response(
        {
            "message": "Avaliação registrada! Reputação atualizada.",
            "id_avaliacao": aid,
            "reputacao_atualizada": fetchone_dict("SELECT * FROM View_Reputacao_Usuario WHERE id_usuario=%s", [int(d["id_avaliado"])]),
        },
        status=201,
    )


# =============================================================================
# 7. DASHBOARD SUSTENTÁVEL (ECR010), HISTÓRICO (ECR016), NOTIFICAÇÕES & SUPORTE (ECR014)
# =============================================================================

@api_view(["GET"])
@permission_classes([AllowAny])
def dashboard_resumo(request):
    plat = fetchone_dict("SELECT * FROM View_Impacto_Total_Plataforma") or {}
    param = fetchone_dict("SELECT kg_co2_por_km, kg_co2_por_arvore FROM Parametro_Ambiental WHERE id_parametro=1") or {"kg_co2_por_km": 0.12, "kg_co2_por_arvore": 20.0}
    evol = fetchall_dict(
        """
        SELECT id_tempo, ano, mes, nome_mes, mes_referencia,
               SUM(total_viagens_concluidas) AS total_viagens_concluidas,
               SUM(total_passageiros_transportados) AS total_passageiros_transportados,
               ROUND(SUM(estimativa_total_co2_economizado_kg), 3) AS co2_economizado_kg
          FROM View_Dashboard_Sustentavel
         GROUP BY id_tempo, ano, mes, nome_mes, mes_referencia ORDER BY id_tempo ASC
        """
    )
    usuario = fetchone_dict("SELECT * FROM View_Dashboard_Sustentavel_Usuario WHERE id_usuario=%s", [request.user.id_usuario]) if isinstance(request.user, Usuario) else None
    arv = round(float(plat.get("estimativa_total_co2_economizado_kg") or 0) / float(param["kg_co2_por_arvore"]), 2)
    return Response({"plataforma": {**plat, "equivalencia_arvores": arv}, "usuario": usuario, "parametro_ambiental": param, "evolucao_mensal": evol})


@api_view(["GET"])
@permission_classes([AllowAny])
def dashboard_multidimensional(request):
    q = request.query_params
    escopo = (q.get("escopo") or "global").strip().lower()
    if escopo not in ("global", "usuario"):
        return Response({"error": "Escopo inválido. Use 'global' ou 'usuario'."}, status=400)

    param = fetchone_dict("SELECT kg_co2_por_arvore FROM Parametro_Ambiental WHERE id_parametro=1") or {"kg_co2_por_arvore": 20.0}
    kg_arvore = float(param["kg_co2_por_arvore"])

    where, filter_params = [], []
    if q.get("id_tempo"):
        where.append("id_tempo=%s")
        filter_params.append(int(q["id_tempo"]))
    if q.get("id_destino"):
        where.append("id_destino=%s")
        filter_params.append(int(q["id_destino"]))
    if (q.get("tipo_destino") or "").upper() in ("CAMPUS", "RESTAURANTE"):
        where.append("tipo_destino=%s")
        filter_params.append(q["tipo_destino"].upper())
    if q.get("id_turno"):
        where.append("id_turno=%s")
        filter_params.append(int(q["id_turno"]))
    wsql = f"WHERE {' AND '.join(where)}" if where else ""

    if escopo == "usuario":
        if not isinstance(request.user, Usuario):
            return Response({"error": "Faça login para visualizar seu dashboard individual."}, status=401)
        uid = request.user.id_usuario
        cte = """
        WITH BaseUsuario AS (
            SELECT T.id_tempo, T.ano, T.mes, T.nome_mes,
                   printf('%%04d-%%02d', T.ano, T.mes) AS mes_referencia,
                   D.id_destino, D.tipo_destino, D.campus, D.restaurante, D.nome_destino,
                   TU.id_turno, TU.nome_turno AS turno,
                   P.id_viagem, P.papel, P.distancia_km,
                   P.passageiros_transportados, P.veiculos_individuais_evitados,
                   ROUND(P.estimativa_co2_economizado_kg / (P.passageiros_transportados + 1.0), 3) AS co2_cota_usuario_kg,
                   CASE WHEN P.passageiros_transportados > 0 THEN P.distancia_km ELSE 0 END AS km_compartilhados
              FROM (
                    SELECT V.id_viagem, 'MOTORISTA' AS papel, F.id_tempo, F.id_destino, F.id_turno,
                           F.distancia_km, F.passageiros_transportados, F.veiculos_individuais_evitados,
                           F.estimativa_co2_economizado_kg
                      FROM Fato_Dashboard_Sustentavel F
                      JOIN Viagem V ON V.id_viagem = F.id_viagem
                     WHERE V.id_motorista = %s
                    UNION ALL
                    SELECT R.id_viagem, 'PASSAGEIRO' AS papel, F.id_tempo, F.id_destino, F.id_turno,
                           F.distancia_km, F.passageiros_transportados, F.veiculos_individuais_evitados,
                           F.estimativa_co2_economizado_kg
                      FROM Fato_Dashboard_Sustentavel F
                      JOIN Reserva R ON R.id_viagem = F.id_viagem AND R.status_reserva = 'CONFIRMADO'
                     WHERE R.id_passageiro = %s
                   ) P
              JOIN Dim_Tempo T ON T.id_tempo = P.id_tempo
              JOIN Dim_Destino D ON D.id_destino = P.id_destino
              JOIN Dim_Turno TU ON TU.id_turno = P.id_turno
        )
        """
        params = [uid, uid, *filter_params]
        registros = fetchall_dict(
            f"""
            {cte}
            SELECT id_tempo, ano, mes, nome_mes, mes_referencia,
                   id_destino, tipo_destino, campus, restaurante, nome_destino,
                   id_turno, turno,
                   COUNT(id_viagem) AS total_viagens_concluidas,
                   COALESCE(SUM(passageiros_transportados), 0) AS total_passageiros_transportados,
                   COALESCE(SUM(veiculos_individuais_evitados), 0) AS total_veiculos_individuais_evitados,
                   ROUND(COALESCE(SUM(km_compartilhados), 0), 2) AS km_de_deslocamento_individual_evitados,
                   ROUND(COALESCE(SUM(co2_cota_usuario_kg), 0), 3) AS estimativa_total_co2_economizado_kg
              FROM BaseUsuario {wsql}
             GROUP BY id_tempo, ano, mes, nome_mes, mes_referencia,
                      id_destino, tipo_destino, campus, restaurante, nome_destino,
                      id_turno, turno
             ORDER BY id_tempo DESC, estimativa_total_co2_economizado_kg DESC
            """,
            params,
        )
        totais = fetchone_dict(
            f"""
            {cte}
            SELECT COUNT(id_viagem) AS total_viagens_concluidas,
                   COALESCE(SUM(passageiros_transportados), 0) AS total_passageiros_transportados,
                   COALESCE(SUM(veiculos_individuais_evitados), 0) AS total_veiculos_individuais_evitados,
                   ROUND(COALESCE(SUM(km_compartilhados), 0), 2) AS km_evitados,
                   ROUND(COALESCE(SUM(co2_cota_usuario_kg), 0), 3) AS co2_economizado_kg
              FROM BaseUsuario {wsql}
            """,
            params,
        ) or {}
        totais["equivalencia_arvores"] = round(float(totais.get("co2_economizado_kg") or 0) / kg_arvore, 4)
        evolucao_mensal = fetchall_dict(
            f"""
            {cte}
            SELECT id_tempo, ano, mes, nome_mes, mes_referencia,
                   COUNT(id_viagem) AS total_viagens_concluidas,
                   COALESCE(SUM(passageiros_transportados), 0) AS total_passageiros_transportados,
                   ROUND(COALESCE(SUM(co2_cota_usuario_kg), 0), 3) AS co2_economizado_kg
              FROM BaseUsuario {wsql}
             GROUP BY id_tempo, ano, mes, nome_mes, mes_referencia
             ORDER BY id_tempo ASC
            """,
            params,
        )
        por_turno = fetchall_dict(
            f"""
            {cte}
            SELECT id_turno, turno,
                   COUNT(id_viagem) AS viagens,
                   COALESCE(SUM(passageiros_transportados), 0) AS passageiros,
                   ROUND(COALESCE(SUM(co2_cota_usuario_kg), 0), 3) AS co2_kg
              FROM BaseUsuario {wsql}
             GROUP BY id_turno, turno ORDER BY id_turno
            """,
            params,
        )
        por_destino = fetchall_dict(
            f"""
            {cte}
            SELECT id_destino, nome_destino, tipo_destino,
                   COUNT(id_viagem) AS viagens,
                   COALESCE(SUM(passageiros_transportados), 0) AS passageiros,
                   ROUND(COALESCE(SUM(co2_cota_usuario_kg), 0), 3) AS co2_kg
              FROM BaseUsuario {wsql}
             GROUP BY id_destino, nome_destino, tipo_destino ORDER BY co2_kg DESC
            """,
            params,
        )
        return Response(
            {
                "escopo": "usuario",
                "totais": totais,
                "evolucao_mensal": evolucao_mensal,
                "por_turno": por_turno,
                "por_destino": por_destino,
                "registros": registros,
            }
        )

    registros = fetchall_dict(
        f"SELECT * FROM View_Dashboard_Sustentavel {wsql} ORDER BY id_tempo DESC, estimativa_total_co2_economizado_kg DESC",
        filter_params,
    )
    totais = fetchone_dict(
        f"""
        SELECT COALESCE(SUM(total_viagens_concluidas),0) AS total_viagens_concluidas,
               COALESCE(SUM(total_passageiros_transportados),0) AS total_passageiros_transportados,
               COALESCE(SUM(total_veiculos_individuais_evitados),0) AS total_veiculos_individuais_evitados,
               ROUND(COALESCE(SUM(km_de_deslocamento_individual_evitados),0),2) AS km_evitados,
               ROUND(COALESCE(SUM(estimativa_total_co2_economizado_kg),0),3) AS co2_economizado_kg
          FROM View_Dashboard_Sustentavel {wsql}
        """,
        filter_params,
    ) or {}
    totais["equivalencia_arvores"] = round(float(totais.get("co2_economizado_kg") or 0) / kg_arvore, 2)
    evolucao_mensal = fetchall_dict(
        f"""
        SELECT id_tempo, ano, mes, nome_mes, mes_referencia,
               SUM(total_viagens_concluidas) AS total_viagens_concluidas,
               SUM(total_passageiros_transportados) AS total_passageiros_transportados,
               ROUND(SUM(estimativa_total_co2_economizado_kg), 3) AS co2_economizado_kg
          FROM View_Dashboard_Sustentavel {wsql}
         GROUP BY id_tempo, ano, mes, nome_mes, mes_referencia ORDER BY id_tempo ASC
        """,
        filter_params,
    )
    por_turno = fetchall_dict(
        f"SELECT id_turno, turno, SUM(total_viagens_concluidas) AS viagens, SUM(total_passageiros_transportados) AS passageiros, ROUND(SUM(estimativa_total_co2_economizado_kg),3) AS co2_kg FROM View_Dashboard_Sustentavel {wsql} GROUP BY id_turno, turno ORDER BY id_turno",
        filter_params,
    )
    por_destino = fetchall_dict(
        f"SELECT id_destino, nome_destino, tipo_destino, SUM(total_viagens_concluidas) AS viagens, SUM(total_passageiros_transportados) AS passageiros, ROUND(SUM(estimativa_total_co2_economizado_kg),3) AS co2_kg FROM View_Dashboard_Sustentavel {wsql} GROUP BY id_destino, nome_destino, tipo_destino ORDER BY co2_kg DESC",
        filter_params,
    )
    return Response(
        {
            "escopo": "global",
            "totais": totais,
            "evolucao_mensal": evolucao_mensal,
            "por_turno": por_turno,
            "por_destino": por_destino,
            "registros": registros,
        }
    )


@api_view(["GET"])
@permission_classes([IsEcoRotaAuthenticated])
def historico_list(request):
    where, params = ["id_usuario=%s"], [request.user.id_usuario]
    if (request.query_params.get("papel") or "").upper() in ("MOTORISTA", "PASSAGEIRO"):
        where.append("papel=%s")
        params.append(request.query_params["papel"].upper())
    return Response({"historico": fetchall_dict(f"SELECT * FROM View_Historico_Usuario WHERE {' AND '.join(where)} ORDER BY data_horario DESC, id_viagem DESC", params)})


@api_view(["GET"])
@permission_classes([IsEcoRotaAuthenticated])
def historico_detail(request, viagem_id: int):
    resumo = fetchone_dict("SELECT * FROM View_Historico_Usuario WHERE id_usuario=%s AND id_viagem=%s", [request.user.id_usuario, viagem_id])
    if not resumo:
        return Response({"error": "Viagem não encontrada no seu histórico."}, status=404)
    return Response(
        {
            "resumo": resumo,
            "viagem": fetchone_dict("SELECT V.*, U.nome_completo AS motorista_nome FROM View_Viagens_Com_Vagas V JOIN Usuario U ON U.id_usuario=V.id_motorista WHERE V.id_viagem=%s", [viagem_id]),
            "participantes": fetchall_dict(
                "SELECT U.id_usuario, U.nome_completo, 'MOTORISTA' AS papel FROM Viagem V JOIN Usuario U ON U.id_usuario=V.id_motorista WHERE V.id_viagem=%s UNION ALL SELECT U.id_usuario, U.nome_completo, 'PASSAGEIRO' AS papel FROM Reserva R JOIN Usuario U ON U.id_usuario=R.id_passageiro WHERE R.id_viagem=%s AND R.status_reserva='CONFIRMADO'",
                [viagem_id, viagem_id],
            ),
            "avaliacoes": fetchall_dict(
                "SELECT A.id_avaliacao, UA.nome_completo AS avaliador_nome, UB.nome_completo AS avaliado_nome, A.nota_quantitativa, A.observacao_qualitativa FROM Avaliacao A JOIN Usuario UA ON UA.id_usuario=A.id_avaliador JOIN Usuario UB ON UB.id_usuario=A.id_avaliado WHERE A.id_viagem=%s ORDER BY A.criada_em DESC",
                [viagem_id],
            ),
            "fato_sustentavel": fetchone_dict("SELECT * FROM Fato_Dashboard_Sustentavel WHERE id_viagem=%s", [viagem_id]),
        }
    )


@api_view(["GET"])
@permission_classes([IsEcoRotaAuthenticated])
def notificacoes_list(request):
    rows = fetchall_dict("SELECT id_notificacao, id_viagem, id_reserva, tipo, conteudo, criada_em, lida_em FROM Notificacao WHERE id_usuario=%s ORDER BY criada_em DESC LIMIT 50", [request.user.id_usuario])
    return Response({"notificacoes": rows, "nao_lidas": sum(1 for r in rows if not r["lida_em"])})


@api_view(["PATCH"])
@permission_classes([IsEcoRotaAuthenticated])
def notificacoes_ler_todas(request):
    with connection.cursor() as cursor:
        cursor.execute("UPDATE Notificacao SET lida_em=%s WHERE id_usuario=%s AND lida_em IS NULL", [now_sql_datetime(), request.user.id_usuario])
    return Response({"message": "Notificações marcadas como lidas."})


@api_view(["PATCH"])
@permission_classes([IsEcoRotaAuthenticated])
def notificacao_lida(request, notificacao_id: int):
    with connection.cursor() as cursor:
        cursor.execute("UPDATE Notificacao SET lida_em=%s WHERE id_notificacao=%s AND id_usuario=%s", [now_sql_datetime(), notificacao_id, request.user.id_usuario])
    return Response({"message": "Notificação marcada como lida."})


@api_view(["POST"])
@permission_classes([AllowAny])
def suporte_create(request):
    d = request.data or {}
    logged = isinstance(request.user, Usuario)
    nome = (request.user.nome_completo if logged else str(d.get("nome") or "")).strip()
    email = (request.user.email_institucional if logged else str(d.get("email") or "")).strip()
    cat = str(d.get("categoria_assunto") or "").strip()
    msg = str(d.get("mensagem") or "").strip()
    if not nome or not email or not cat or not msg:
        return Response({"error": "Preencha Nome, E-mail, Categoria e Mensagem."}, status=400)
    with connection.cursor() as cursor:
        cursor.execute(
            "INSERT INTO Chamado_Suporte (id_usuario, nome, email, categoria_assunto, mensagem, status_chamado) VALUES (%s,%s,%s,%s,%s,'ABERTO')",
            [request.user.id_usuario if logged else None, nome, email, cat, msg],
        )
        proto = cursor.lastrowid
    return Response({"message": f"Solicitação registrada! Protocolo #{proto} gerado.", "chamado": fetchone_dict("SELECT * FROM Chamado_Suporte WHERE numero_protocolo=%s", [proto])}, status=201)


@api_view(["GET"])
@permission_classes([IsEcoRotaAuthenticated])
def suporte_meus(request):
    return Response({"chamados": fetchall_dict("SELECT numero_protocolo, categoria_assunto, mensagem, status_chamado, criado_em FROM Chamado_Suporte WHERE id_usuario=%s ORDER BY criado_em DESC", [request.user.id_usuario])})
