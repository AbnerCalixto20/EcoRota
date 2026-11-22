import base64
from django.conf import settings
from django.db import connection
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from .auth import hash_password
from .models import FatoDashboardSustentavel, Usuario, Viagem


class EcoRotaBateriaDeTestes(TestCase):
    """
    Bateria completa de testes automatizados do EcoRota USP (PMR3304).
    Cobre todos os 16 Casos de Uso (ECR001–ECR016 e UC012), regras de negócio,
    triggers do banco SQLite, Esquema Estrela e relações ORM (1:N e N:N).
    """

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        schema_sql = (settings.PROJECT_ROOT / "database" / "schema.sql").read_text(encoding="utf-8")
        seed_sql = (settings.PROJECT_ROOT / "database" / "seed.sql").read_text(encoding="utf-8")
        seed_sql = seed_sql.replace("__DEMO_PASSWORD_HASH__", hash_password("EcoRota@2026"))
        with connection.cursor():
            raw = connection.connection
            raw.execute("PRAGMA foreign_keys = ON;")
            raw.executescript(schema_sql)
            raw.executescript(seed_sql)

    def setUp(self):
        self.client = APIClient()

    def _login(self, identificador="ana.lima@usp.br", senha="EcoRota@2026"):
        res = self.client.post("/api/auth/login", {"identificador": identificador, "senha": senha}, format="json")
        self.assertEqual(res.status_code, 200, res.data)
        return {"HTTP_AUTHORIZATION": f"Bearer {res.data['token']}"}, res.data

    # ------------------------------------------------------------------
    # INFRAESTRUTURA E INTEGRIDADE DO BANCO
    # ------------------------------------------------------------------
    def test_01_health_e_integridade_sqlite(self):
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data["foreign_keys_enabled"])

        with connection.cursor() as cursor:
            cursor.execute("PRAGMA integrity_check;")
            self.assertEqual(cursor.fetchone()[0], "ok")
            cursor.execute("PRAGMA foreign_key_check;")
            self.assertEqual(cursor.fetchall(), [])

    def test_02_orm_relacoes_1n_nn_e_esquema_estrela(self):
        ana = Usuario.objects.get(email_institucional="ana.lima@usp.br")
        self.assertGreaterEqual(ana.veiculos.count(), 1)  # 1:N Usuario -> Veiculo
        self.assertGreaterEqual(ana.viagens_como_motorista.count(), 1)  # 1:N Usuario -> Viagem

        viagem1 = Viagem.objects.get(id_viagem=1)
        self.assertEqual(viagem1.passageiros.count(), 2)  # N:N Viagem <-> Passageiros via Reserva

        fato = FatoDashboardSustentavel.objects.select_related("tempo", "destino", "turno").get(viagem=viagem1)
        self.assertEqual(fato.turno.nome_turno, "MANHA")
        self.assertGreater(fato.estimativa_co2_economizado_kg, 0)

    # ------------------------------------------------------------------
    # ECR001 — CADASTRAR USUÁRIO INSTITUCIONAL
    # ------------------------------------------------------------------
    @override_settings(DEBUG=True)
    def test_03_ecr001_cadastro_validacao_usp_duplicidade_e_ativacao(self):
        # Rejeita domínio não-USP
        bad = self.client.post(
            "/api/auth/register",
            {"nome_completo": "Externo", "nusp": "9990001", "email_institucional": "x@gmail.com", "senha": "Password123", "termos_aceitos": True},
            format="json",
        )
        self.assertEqual(bad.status_code, 400)

        # Rejeita sem aceite de termos LGPD
        no_terms = self.client.post(
            "/api/auth/register",
            {"nome_completo": "Aluno", "nusp": "15000002", "email_institucional": "aluno2@usp.br", "senha": "Password123", "termos_aceitos": False},
            format="json",
        )
        self.assertEqual(no_terms.status_code, 400)

        # Rejeita duplicidade de e-mail/NUSP já cadastrado
        dup = self.client.post(
            "/api/auth/register",
            {"nome_completo": "Dup", "nusp": "14745101", "email_institucional": "ana.lima@usp.br", "senha": "Password123", "termos_aceitos": True},
            format="json",
        )
        self.assertEqual(dup.status_code, 409)

        # Cadastro válido -> PENDENTE_ATIVACAO -> bloqueia login antes de ativar
        ok = self.client.post(
            "/api/auth/register",
            {"nome_completo": "Novo Aluno USP", "nusp": "15000001", "email_institucional": "novo@usp.br", "senha": "Password123", "termos_aceitos": True},
            format="json",
        )
        self.assertEqual(ok.status_code, 201)
        self.assertEqual(ok.data["status_conta"], "PENDENTE_ATIVACAO")
        before = self.client.post("/api/auth/login", {"identificador": "novo@usp.br", "senha": "Password123"}, format="json")
        self.assertEqual(before.status_code, 403)

        # Ativa via token e rejeita reuso do mesmo token
        token = ok.data["dev_activation_token"]
        self.assertEqual(self.client.post("/api/auth/activate", {"token": token}, format="json").status_code, 200)
        self.assertEqual(self.client.post("/api/auth/activate", {"token": token}, format="json").status_code, 400)

        # Login com sucesso após ativação
        headers, _ = self._login("novo@usp.br", "Password123")
        self.assertEqual(self.client.get("/api/auth/me", **headers).status_code, 200)

    # ------------------------------------------------------------------
    # ECR002 & ECR011 — AUTENTICAÇÃO, BLOQUEIO 5 TENTATIVAS E RECUPERAÇÃO
    # ------------------------------------------------------------------
    @override_settings(DEBUG=True)
    def test_04_ecr002_ecr011_login_nusp_bloqueio_5_falhas_e_recuperacao(self):
        # Login funcionando pelo NUSP
        _, data = self._login("14700105", "EcoRota@2026")
        self.assertEqual(data["usuario"]["email_institucional"], "elisa.nogueira@usp.br")

        # 4 tentativas erradas -> 401; 5ª tentativa -> 423 (bloqueado por 30 min)
        for _ in range(4):
            r = self.client.post("/api/auth/login", {"identificador": "elisa.nogueira@usp.br", "senha": "Errada123"}, format="json")
            self.assertEqual(r.status_code, 401)
        r5 = self.client.post("/api/auth/login", {"identificador": "elisa.nogueira@usp.br", "senha": "Errada123"}, format="json")
        self.assertEqual(r5.status_code, 423)

        # Mesmo com senha correta, continua bloqueada
        locked = self.client.post("/api/auth/login", {"identificador": "elisa.nogueira@usp.br", "senha": "EcoRota@2026"}, format="json")
        self.assertEqual(locked.status_code, 423)

        # ECR011: recupera senha -> desbloqueia conta -> login com nova senha -> token não pode ser reutilizado
        forgot = self.client.post("/api/auth/forgot-password", {"email_institucional": "elisa.nogueira@usp.br"}, format="json")
        self.assertEqual(forgot.status_code, 200)
        reset_token = forgot.data["dev_reset_token"]

        reset = self.client.post("/api/auth/reset-password", {"token": reset_token, "nova_senha": "NovaSenha2026"}, format="json")
        self.assertEqual(reset.status_code, 200)
        reuse = self.client.post("/api/auth/reset-password", {"token": reset_token, "nova_senha": "OutraSenha2026"}, format="json")
        self.assertEqual(reuse.status_code, 400)

        self._login("elisa.nogueira@usp.br", "NovaSenha2026")

    def test_05_rotas_protegidas_exigem_jwt(self):
        for url in ("/api/auth/me", "/api/perfil", "/api/veiculos", "/api/viagens/minhas", "/api/reservas/pendentes", "/api/historico", "/api/notificacoes"):
            self.assertIn(self.client.get(url).status_code, (401, 403), f"Falha na proteção de {url}")

    # ------------------------------------------------------------------
    # ECR003 — PESQUISAR ROTAS E CARONAS
    # ------------------------------------------------------------------
    def test_06_ecr003_pesquisa_filtros_e_ordenacao_geoespacial(self):
        todas = self.client.get("/api/viagens").data["viagens"]
        self.assertGreaterEqual(len(todas), 4)

        # Filtro por parada intermediária ("Portão 1")
        por_parada = self.client.get("/api/viagens?origem=Port%C3%A3o%201").data["viagens"]
        self.assertGreaterEqual(len(por_parada), 1)

        # Filtro somente gratuitas
        gratuitas = self.client.get("/api/viagens?somente_gratuitas=true").data["viagens"]
        self.assertTrue(all(v["valor_rateio"] == 0 for v in gratuitas))

        # Filtro por modalidade MANUAL
        manuais = self.client.get("/api/viagens?modalidade=MANUAL").data["viagens"]
        self.assertTrue(all(v["modalidade_aprovacao"] == "MANUAL" for v in manuais))

        # Ordenação geoespacial por proximidade (Metrô Butantã)
        geo = self.client.get("/api/viagens?lat=-23.5718&lng=-46.7081").data["viagens"]
        self.assertIsNotNone(geo[0]["desvio_km"])
        self.assertLessEqual(geo[0]["desvio_km"], geo[-1]["desvio_km"])

        # Filtro por id_origem usando a mesma base Dim_Destino (Escola Politécnica -> Viagem 6)
        por_id_origem = self.client.get("/api/viagens?id_origem=1").data["viagens"]
        self.assertGreaterEqual(len(por_id_origem), 1)
        self.assertTrue(all("Poli" in v["ponto_partida"] for v in por_id_origem))

    # ------------------------------------------------------------------
    # ECR004 — SOLICITAR RESERVA DE VAGA (AUTOMÁTICA, MANUAL E TRIGGERS)
    # ------------------------------------------------------------------
    def test_07_ecr004_reservas_automatica_manual_e_bloqueios(self):
        ana_h, _ = self._login("ana.lima@usp.br")
        diego_h, _ = self._login("diego.ferreira@usp.br")
        elisa_h, _ = self._login("elisa.nogueira@usp.br")
        bruno_h, _ = self._login("bruno.silva@usp.br")

        # Bloqueio de auto-reserva (Ana é motorista da viagem 5)
        self.assertEqual(self.client.post("/api/reservas", {"id_viagem": 5}, format="json", **ana_h).status_code, 400)

        # Viagem 5 (AUTOMATICA, 3 vagas, Carla já ocupa 1) -> Diego e Elisa confirmam imediatamente
        r1 = self.client.post("/api/reservas", {"id_viagem": 5}, format="json", **diego_h)
        self.assertEqual(r1.status_code, 201)
        self.assertEqual(r1.data["reserva"]["status_reserva"], "CONFIRMADO")

        # Duplicidade bloqueada
        self.assertEqual(self.client.post("/api/reservas", {"id_viagem": 5}, format="json", **diego_h).status_code, 409)

        r2 = self.client.post("/api/reservas", {"id_viagem": 5}, format="json", **elisa_h)
        self.assertEqual(r2.status_code, 201)

        # Lotou as 3 vagas -> Bruno deve ser bloqueado pelo trigger ("Nao existem vagas disponiveis")
        r3 = self.client.post("/api/reservas", {"id_viagem": 5}, format="json", **bruno_h)
        self.assertEqual(r3.status_code, 400)

        # Viagem 8 (MANUAL, motorista Bruno) -> Carla entra como PENDENTE_APROVACAO
        carla_h, _ = self._login("carla.mendes@usp.br")
        r_man = self.client.post("/api/reservas", {"id_viagem": 8}, format="json", **carla_h)
        self.assertEqual(r_man.status_code, 201)
        self.assertEqual(r_man.data["reserva"]["status_reserva"], "PENDENTE_APROVACAO")

    # ------------------------------------------------------------------
    # ECR005 — GERENCIAR SOLICITAÇÕES DE RESERVA (MOTORISTA)
    # ------------------------------------------------------------------
    def test_08_ecr005_painel_aceitar_rejeitar_e_permissao(self):
        ana_h, _ = self._login("ana.lima@usp.br")
        bruno_h, _ = self._login("bruno.silva@usp.br")

        pend = self.client.get("/api/reservas/pendentes", **ana_h).data["solicitacoes"]
        self.assertGreaterEqual(len(pend), 1)
        rid = pend[0]["id_reserva"]

        # Outro motorista (Bruno) não pode decidir solicitação de viagem da Ana
        self.assertEqual(self.client.patch(f"/api/reservas/{rid}/decidir", {"decisao": "ACEITAR"}, format="json", **bruno_h).status_code, 403)

        # Ana aceita -> status CONFIRMADO
        ok = self.client.patch(f"/api/reservas/{rid}/decidir", {"decisao": "ACEITAR"}, format="json", **ana_h)
        self.assertEqual(ok.status_code, 200)
        self.assertEqual(ok.data["status_reserva"], "CONFIRMADO")

    # ------------------------------------------------------------------
    # ECR006 — CANCELAR RESERVA (PASSAGEIRO) E CANCELAR VIAGEM (MOTORISTA)
    # ------------------------------------------------------------------
    def test_09_ecr006_cancelamentos_e_devolucao_de_vagas(self):
        carla_h, _ = self._login("carla.mendes@usp.br")
        ana_h, _ = self._login("ana.lima@usp.br")

        # Antes: Viagem 5 tem 2 vagas livres (Carla ocupa 1 das 3)
        antes = self.client.get("/api/viagens/5").data["viagem"]["vagas_disponiveis"]
        self.assertEqual(antes, 2)

        # Carla cancela sua reserva (id_reserva = 9) -> vaga volta para 3
        canc_p = self.client.patch("/api/reservas/9/cancelar", {"justificativa_cancelamento": "Imprevisto na aula"}, format="json", **carla_h)
        self.assertEqual(canc_p.status_code, 200)
        depois = self.client.get("/api/viagens/5").data["viagem"]["vagas_disponiveis"]
        self.assertEqual(depois, 3)

        # Motorista Ana cancela Viagem 6 -> trigger cancela automaticamente a reserva pendente do Diego
        canc_m = self.client.patch("/api/viagens/6/cancelar", {"motivo_cancelamento": "Pneu furado"}, format="json", **ana_h)
        self.assertEqual(canc_m.status_code, 200)
        pend_pos = self.client.get("/api/reservas/pendentes", **ana_h).data["solicitacoes"]
        self.assertEqual(len(pend_pos), 0)

    # ------------------------------------------------------------------
    # ECR007 — CRIAR CORRIDA (RATEIO SOLIDÁRIO, CONFLITO DE AGENDA, CAPACIDADE)
    # ------------------------------------------------------------------
    def test_10_ecr007_criar_corrida_validacoes_e_triggers(self):
        ana_h, _ = self._login("ana.lima@usp.br")

        # Violação de rateio solidário (combustível 10 / 4 = 2.50 máx, tentando cobrar 15.00)
        bad_fare = self.client.post(
            "/api/viagens",
            {"id_veiculo": 1, "ponto_partida": "Butantã", "id_destino": 1, "data_horario": "2026-12-05 08:00:00", "previsao_chegada": "2026-12-05 08:30:00", "vagas_total": 3, "custo_combustivel_previsto": 10, "valor_rateio": 15},
            format="json",
            **ana_h,
        )
        self.assertEqual(bad_fare.status_code, 400)

        # Vagas excedem capacidade do veículo (Gol da Ana tem capacidade 3, tentando 5)
        bad_cap = self.client.post(
            "/api/viagens",
            {"id_veiculo": 1, "ponto_partida": "Butantã", "id_destino": 1, "data_horario": "2026-12-05 08:00:00", "previsao_chegada": "2026-12-05 08:30:00", "vagas_total": 5, "custo_combustivel_previsto": 20, "valor_rateio": 2},
            format="json",
            **ana_h,
        )
        self.assertEqual(bad_cap.status_code, 400)

        # Conflito de agenda com Viagem 5 da Ana (2026-11-23 07:45 -> 08:15)
        conflict = self.client.post(
            "/api/viagens",
            {"id_veiculo": 1, "ponto_partida": "Pinheiros", "id_destino": 2, "data_horario": "2026-11-23 08:00:00", "previsao_chegada": "2026-11-23 08:40:00", "vagas_total": 2, "custo_combustivel_previsto": 12, "valor_rateio": 3},
            format="json",
            **ana_h,
        )
        self.assertEqual(conflict.status_code, 400)
        self.assertIn("Conflito", conflict.data["error"])

        # Ponto de partida igual ao destino deve ser bloqueado (via id_origem e via nome)
        same_id = self.client.post(
            "/api/viagens",
            {"id_veiculo": 1, "id_origem": 1, "id_destino": 1, "data_horario": "2026-12-06 08:00:00", "previsao_chegada": "2026-12-06 08:30:00", "vagas_total": 2, "custo_combustivel_previsto": 10, "valor_rateio": 2},
            format="json",
            **ana_h,
        )
        self.assertEqual(same_id.status_code, 400)
        same_name = self.client.post(
            "/api/viagens",
            {"id_veiculo": 1, "ponto_partida": "Escola Politécnica (Poli)", "id_destino": 1, "data_horario": "2026-12-06 08:00:00", "previsao_chegada": "2026-12-06 08:30:00", "vagas_total": 2, "custo_combustivel_previsto": 10, "valor_rateio": 2},
            format="json",
            **ana_h,
        )
        self.assertEqual(same_name.status_code, 400)

        # Parada intermediária igual à origem ou ao destino deve ser bloqueada
        same_stop = self.client.post(
            "/api/viagens",
            {"id_veiculo": 1, "id_origem": 2, "id_destino": 1, "paradas": [{"id_destino": 2}], "data_horario": "2026-12-06 08:00:00", "previsao_chegada": "2026-12-06 08:30:00", "vagas_total": 2, "custo_combustivel_previsto": 10, "valor_rateio": 2},
            format="json",
            **ana_h,
        )
        self.assertEqual(same_stop.status_code, 400)

        # Criação válida usando id_origem e parada intermediária da mesma base Dim_Destino
        ok = self.client.post(
            "/api/viagens",
            {"id_veiculo": 1, "id_origem": 2, "id_destino": 1, "data_horario": "2026-12-10 09:00:00", "previsao_chegada": "2026-12-10 09:30:00", "vagas_total": 3, "modalidade_aprovacao": "AUTOMATICA", "custo_combustivel_previsto": 16, "valor_rateio": 4, "distancia_km": 9.5, "paradas": [{"id_destino": 3}]},
            format="json",
            **ana_h,
        )
        self.assertEqual(ok.status_code, 201)
        det = self.client.get(f"/api/viagens/{ok.data['viagem']['id_viagem']}").data["viagem"]
        self.assertEqual(det["ponto_partida"], "Faculdade de Economia, Administração, Contabilidade e Atuária (FEA)")
        self.assertEqual(len(det["paradas"]), 1)
        self.assertEqual(det["paradas"][0]["descricao_local"], "Faculdade de Filosofia, Letras e Ciências Humanas (FFLCH)")

    # ------------------------------------------------------------------
    # ECR008, ECR009 & ECR010 — CONCLUIR VIAGEM -> FATO ESTRELA -> AVALIAÇÃO -> DASHBOARD
    # ------------------------------------------------------------------
    def test_11_ecr008_ecr009_ecr010_fluxo_completo_conclusao_avaliacao_e_impacto(self):
        ana_h, _ = self._login("ana.lima@usp.br")
        carla_h, _ = self._login("carla.mendes@usp.br")

        # Cria nova viagem
        c = self.client.post(
            "/api/viagens",
            {"id_veiculo": 1, "ponto_partida": "Metrô Butantã", "id_destino": 7, "data_horario": "2026-12-01 12:30:00", "previsao_chegada": "2026-12-01 12:55:00", "vagas_total": 3, "modalidade_aprovacao": "AUTOMATICA", "custo_combustivel_previsto": 12, "valor_rateio": 3, "distancia_km": 10.0},
            format="json",
            **ana_h,
        )
        vid = c.data["viagem"]["id_viagem"]

        # Carla confirma vaga
        self.assertEqual(self.client.post("/api/reservas", {"id_viagem": vid}, format="json", **carla_h).status_code, 201)

        # Não pode concluir antes de iniciar (trigger trg_viagem_validar_encerramento)
        self.assertEqual(self.client.patch(f"/api/viagens/{vid}/concluir", **ana_h).status_code, 400)

        # Não pode avaliar antes de concluir (trigger trg_avaliacao_validar_participacao)
        self.assertEqual(
            self.client.post("/api/avaliacoes", {"id_viagem": vid, "id_avaliado": 1, "nota_quantitativa": 5}, format="json", **carla_h).status_code,
            400,
        )

        # Iniciar -> Concluir
        self.assertEqual(self.client.patch(f"/api/viagens/{vid}/iniciar", **ana_h).status_code, 200)
        fim = self.client.patch(f"/api/viagens/{vid}/concluir", **ana_h)
        self.assertEqual(fim.status_code, 200)
        # 1 passageiro * 10 km * 0.12 kg CO2/km = 1.2 kg CO2 (turno 2 = TARDE)
        self.assertAlmostEqual(fim.data["fato_sustentavel"]["estimativa_co2_economizado_kg"], 1.2, places=2)
        self.assertEqual(fim.data["fato_sustentavel"]["id_turno"], 2)

        # Não pode reabrir viagem concluída
        self.assertEqual(self.client.patch(f"/api/viagens/{vid}/iniciar", **ana_h).status_code, 400)

        # ECR009: Carla avalia Ana e não pode avaliar duas vezes
        av = self.client.post(
            "/api/avaliacoes",
            {"id_viagem": vid, "id_avaliado": 1, "nota_quantitativa": 5, "observacao_qualitativa": "Excelente!"},
            format="json",
            **carla_h,
        )
        self.assertEqual(av.status_code, 201)
        self.assertEqual(
            self.client.post("/api/avaliacoes", {"id_viagem": vid, "id_avaliado": 1, "nota_quantitativa": 4}, format="json", **carla_h).status_code,
            409,
        )

        # ECR010: Dashboard Multidimensional Global filtrado por RESTAURANTE + TARDE + 202612 reflete o novo fato
        multi = self.client.get("/api/dashboard/multidimensional?escopo=global&id_tempo=202612&tipo_destino=RESTAURANTE&id_turno=2")
        self.assertEqual(multi.status_code, 200)
        self.assertEqual(multi.data["escopo"], "global")
        self.assertAlmostEqual(multi.data["totais"]["co2_economizado_kg"], 1.2, places=2)

        # Dashboard Individual (escopo=usuario): exige login e retorna apenas viagens da usuária
        self.assertEqual(self.client.get("/api/dashboard/multidimensional?escopo=usuario").status_code, 401)
        multi_u = self.client.get("/api/dashboard/multidimensional?escopo=usuario&id_tempo=202612", **carla_h)
        self.assertEqual(multi_u.status_code, 200)
        self.assertEqual(multi_u.data["escopo"], "usuario")
        self.assertEqual(multi_u.data["totais"]["total_viagens_concluidas"], 1)
        # Cota individual da Carla na viagem de 1.2 kg CO2 com 1 passageiro + 1 motorista = 0.6 kg
        self.assertAlmostEqual(multi_u.data["totais"]["co2_economizado_kg"], 0.6, places=2)
        self.assertEqual(multi_u.data["registros"][0]["mes_referencia"], "2026-12")
        # Impacto global total >= impacto individual da Carla (sem filtro)
        g_all = self.client.get("/api/dashboard/multidimensional?escopo=global").data["totais"]
        u_all = self.client.get("/api/dashboard/multidimensional?escopo=usuario", **carla_h).data["totais"]
        self.assertGreater(g_all["total_viagens_concluidas"], u_all["total_viagens_concluidas"])

    # ------------------------------------------------------------------
    # UC012 — CHAT INTERATIVO (PARTICIPAÇÃO, ENVIO E BLOQUEIO PÓS-CONCLUSÃO)
    # ------------------------------------------------------------------
    def test_12_uc012_chat_permissao_envio_e_bloqueio_encerrada(self):
        bruno_h, _ = self._login("bruno.silva@usp.br")
        carla_h, _ = self._login("carla.mendes@usp.br")

        # Bruno não participa da viagem 5 -> 403
        self.assertEqual(self.client.get("/api/mensagens/5", **bruno_h).status_code, 403)

        # Carla participa da viagem 5 -> pode ler e enviar
        self.assertEqual(self.client.get("/api/mensagens/5", **carla_h).status_code, 200)
        sent = self.client.post("/api/mensagens/5", {"conteudo": "Estou chegando no metrô!"}, format="json", **carla_h)
        self.assertEqual(sent.status_code, 201)

        # Viagem 1 já está CONCLUIDA -> leitura permitida, mas envio bloqueado (403)
        self.assertEqual(self.client.get("/api/mensagens/1", **carla_h).status_code, 200)
        self.assertFalse(self.client.get("/api/mensagens/1", **carla_h).data["chat_ativo"])
        self.assertEqual(self.client.post("/api/mensagens/1", {"conteudo": "Depois do fim"}, format="json", **carla_h).status_code, 403)

    # ------------------------------------------------------------------
    # ECR014 — SUPORTE (VISITANTE E AUTENTICADO)
    # ------------------------------------------------------------------
    def test_13_ecr014_suporte_visitante_e_autenticado(self):
        # Visitante sem login abre chamado
        vis = self.client.post(
            "/api/suporte",
            {"nome": "Visitante USP", "email": "visitante@usp.br", "categoria_assunto": "Dúvida", "mensagem": "Como validar NUSP?"},
            format="json",
        )
        self.assertEqual(vis.status_code, 201)
        self.assertGreaterEqual(vis.data["chamado"]["numero_protocolo"], 1)

        # Autenticado (preenchimento automático de nome e e-mail) + consulta /suporte/meus
        ana_h, _ = self._login("ana.lima@usp.br")
        aut = self.client.post("/api/suporte", {"categoria_assunto": "Sugestão", "mensagem": "Adicionar ponto na FEA"}, format="json", **ana_h)
        self.assertEqual(aut.status_code, 201)
        self.assertEqual(aut.data["chamado"]["email"], "ana.lima@usp.br")
        meus = self.client.get("/api/suporte/meus", **ana_h).data["chamados"]
        self.assertEqual(len(meus), 1)

    # ------------------------------------------------------------------
    # ECR015 — PERFIL, UPLOAD DE FOTO, CAMPOS RESTRITOS E VEÍCULOS
    # ------------------------------------------------------------------
    def test_14_ecr015_perfil_foto_restricoes_e_crud_veiculos(self):
        ana_h, _ = self._login("ana.lima@usp.br")

        # Bloqueio de NUSP e E-mail institucional
        self.assertEqual(self.client.put("/api/perfil", {"nusp": "00000000"}, format="json", **ana_h).status_code, 403)
        self.assertEqual(self.client.put("/api/perfil", {"email_institucional": "outro@usp.br"}, format="json", **ana_h).status_code, 403)

        # Rejeita formato inválido de foto (ex: SVG/GIF)
        self.assertEqual(self.client.put("/api/perfil", {"foto_data_url": "data:image/gif;base64,R0lGODlh"}, format="json", **ana_h).status_code, 400)

        # Aceita atualização de bio, telefone e PNG válido
        tiny_png = "data:image/png;base64," + base64.b64encode(b"\x89PNG\r\n\x1a\n").decode("ascii")
        ok = self.client.put("/api/perfil", {"telefone": "(11) 98888-7777", "bio": "Bio atualizada", "foto_data_url": tiny_png}, format="json", **ana_h)
        self.assertEqual(ok.status_code, 200)

        # Bloqueia remoção de veículo em corrida ativa (veículo 1 está na viagem 5)
        self.assertEqual(self.client.delete("/api/veiculos/1", **ana_h).status_code, 409)

        # Cadastra novo veículo e remove com sucesso
        novo = self.client.post("/api/veiculos", {"marca": "Honda", "modelo": "Fit", "cor": "Preto", "placa": "USP9Z99", "ano": 2023, "capacidade_passageiros": 4}, format="json", **ana_h)
        self.assertEqual(novo.status_code, 201)
        vid = novo.data["veiculo"]["id_veiculo"]
        self.assertEqual(self.client.delete(f"/api/veiculos/{vid}", **ana_h).status_code, 200)

    # ------------------------------------------------------------------
    # ECR016 & NOTIFICAÇÕES — HISTÓRICO DE VIAGENS E LEITURA DE NOTIFICAÇÕES
    # ------------------------------------------------------------------
    def test_15_ecr016_historico_detalhado_e_notificacoes(self):
        carla_h, _ = self._login("carla.mendes@usp.br")

        hist = self.client.get("/api/historico?papel=PASSAGEIRO", **carla_h)
        self.assertEqual(hist.status_code, 200)
        self.assertGreaterEqual(len(hist.data["historico"]), 3)

        det = self.client.get("/api/historico/1", **carla_h)
        self.assertEqual(det.status_code, 200)
        self.assertGreaterEqual(len(det.data["avaliacoes"]), 1)
        self.assertIsNotNone(det.data["fato_sustentavel"])

        # Notificações geradas pelos triggers + marcar todas como lidas
        notifs = self.client.get("/api/notificacoes", **carla_h)
        self.assertEqual(notifs.status_code, 200)
        self.assertGreater(notifs.data["nao_lidas"], 0)
        self.assertEqual(self.client.patch("/api/notificacoes/ler-todas", **carla_h).status_code, 200)
        self.assertEqual(self.client.get("/api/notificacoes", **carla_h).data["nao_lidas"], 0)
