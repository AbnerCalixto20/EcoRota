from django.db import models


class ParametroAmbiental(models.Model):
    id_parametro = models.IntegerField(primary_key=True)
    kg_co2_por_km = models.FloatField()
    kg_co2_por_arvore = models.FloatField()
    atualizado_em = models.TextField()

    class Meta:
        managed = False
        db_table = "Parametro_Ambiental"


class DimTempo(models.Model):
    id_tempo = models.IntegerField(primary_key=True)
    ano = models.IntegerField()
    mes = models.IntegerField()
    nome_mes = models.TextField()
    trimestre = models.IntegerField()

    class Meta:
        managed = False
        db_table = "Dim_Tempo"
        ordering = ["-id_tempo"]

    def __str__(self):
        return f"{self.nome_mes}/{self.ano}"


class DimDestino(models.Model):
    id_destino = models.AutoField(primary_key=True)
    tipo_destino = models.TextField()
    campus = models.TextField()
    restaurante = models.TextField(null=True, blank=True)
    nome_destino = models.TextField(unique=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    ativo = models.IntegerField(default=1)

    class Meta:
        managed = False
        db_table = "Dim_Destino"

    def __str__(self):
        return self.nome_destino


class DimTurno(models.Model):
    id_turno = models.IntegerField(primary_key=True)
    nome_turno = models.TextField(unique=True)
    hora_inicio = models.TextField()
    hora_fim = models.TextField()

    class Meta:
        managed = False
        db_table = "Dim_Turno"

    def __str__(self):
        return self.nome_turno


class Usuario(models.Model):
    id_usuario = models.AutoField(primary_key=True)
    nome_completo = models.TextField()
    nusp = models.TextField(unique=True)
    email_institucional = models.TextField(unique=True)
    telefone = models.TextField(null=True, blank=True)
    senha_hash = models.TextField()
    status_conta = models.TextField(default="PENDENTE_ATIVACAO")
    termos_aceitos_em = models.TextField()
    versao_termos = models.TextField(default="1.0")
    foto = models.BinaryField(null=True, blank=True)
    bio = models.TextField(null=True, blank=True)
    falhas_login = models.IntegerField(default=0)
    bloqueado_ate = models.TextField(null=True, blank=True)
    cadastrado_em = models.TextField()

    class Meta:
        managed = False
        db_table = "Usuario"

    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False

    def __str__(self):
        return f"{self.nome_completo} ({self.email_institucional})"


class TokenUsuario(models.Model):
    id_token = models.AutoField(primary_key=True)
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, db_column="id_usuario", related_name="tokens")
    finalidade = models.TextField()
    token_hash = models.TextField(unique=True)
    criado_em = models.TextField()
    expira_em = models.TextField()
    utilizado_em = models.TextField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = "Token_Usuario"


class Veiculo(models.Model):
    id_veiculo = models.AutoField(primary_key=True)
    usuario = models.ForeignKey(Usuario, on_delete=models.DO_NOTHING, db_column="id_usuario", related_name="veiculos")
    marca = models.TextField()
    modelo = models.TextField()
    cor = models.TextField(null=True, blank=True)
    placa = models.TextField(unique=True, null=True, blank=True)
    ano = models.IntegerField(null=True, blank=True)
    capacidade_passageiros = models.IntegerField()
    ativo = models.IntegerField(default=1)

    class Meta:
        managed = False
        db_table = "Veiculo"

    def __str__(self):
        return f"{self.marca} {self.modelo} ({self.placa})"


class Viagem(models.Model):
    id_viagem = models.AutoField(primary_key=True)
    motorista = models.ForeignKey(Usuario, on_delete=models.DO_NOTHING, db_column="id_motorista", related_name="viagens_como_motorista")
    veiculo = models.ForeignKey(Veiculo, on_delete=models.DO_NOTHING, db_column="id_veiculo", related_name="viagens")
    ponto_partida = models.TextField()
    latitude_partida = models.FloatField()
    longitude_partida = models.FloatField()
    destino = models.ForeignKey(DimDestino, on_delete=models.DO_NOTHING, db_column="id_destino", related_name="viagens")
    data_horario = models.TextField()
    previsao_chegada = models.TextField()
    vagas_total = models.IntegerField()
    modalidade_aprovacao = models.TextField()
    status_oferta = models.TextField(default="DISPONIVEL")
    custo_combustivel_previsto = models.FloatField(default=0)
    custo_pedagio_previsto = models.FloatField(default=0)
    valor_rateio = models.FloatField(default=0)
    distancia_km = models.FloatField(default=0)
    motivo_cancelamento = models.TextField(null=True, blank=True)
    concluida_em = models.TextField(null=True, blank=True)
    cancelada_em = models.TextField(null=True, blank=True)
    criada_em = models.TextField()
    passageiros = models.ManyToManyField(Usuario, through="Reserva", related_name="viagens_como_passageiro")

    class Meta:
        managed = False
        db_table = "Viagem"

    def __str__(self):
        return f"#{self.id_viagem}: {self.ponto_partida} ({self.status_oferta})"


class ParadaViagem(models.Model):
    id_parada = models.AutoField(primary_key=True)
    viagem = models.ForeignKey(Viagem, on_delete=models.CASCADE, db_column="id_viagem", related_name="paradas")
    ordem = models.IntegerField()
    descricao_local = models.TextField()
    latitude = models.FloatField()
    longitude = models.FloatField()

    class Meta:
        managed = False
        db_table = "Parada_Viagem"
        ordering = ["ordem"]


class Reserva(models.Model):
    id_reserva = models.AutoField(primary_key=True)
    passageiro = models.ForeignKey(Usuario, on_delete=models.DO_NOTHING, db_column="id_passageiro", related_name="reservas")
    viagem = models.ForeignKey(Viagem, on_delete=models.DO_NOTHING, db_column="id_viagem", related_name="reservas")
    status_reserva = models.TextField()
    justificativa_cancelamento = models.TextField(null=True, blank=True)
    solicitada_em = models.TextField()
    decidida_em = models.TextField(null=True, blank=True)
    cancelada_em = models.TextField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = "Reserva"


class Mensagem(models.Model):
    id_mensagem = models.AutoField(primary_key=True)
    viagem = models.ForeignKey(Viagem, on_delete=models.DO_NOTHING, db_column="id_viagem", related_name="mensagens")
    remetente = models.ForeignKey(Usuario, on_delete=models.DO_NOTHING, db_column="id_remetente", related_name="mensagens_enviadas")
    conteudo = models.TextField()
    enviada_em = models.TextField()

    class Meta:
        managed = False
        db_table = "Mensagem"


class Avaliacao(models.Model):
    id_avaliacao = models.AutoField(primary_key=True)
    avaliador = models.ForeignKey(Usuario, on_delete=models.DO_NOTHING, db_column="id_avaliador", related_name="avaliacoes_feitas")
    avaliado = models.ForeignKey(Usuario, on_delete=models.DO_NOTHING, db_column="id_avaliado", related_name="avaliacoes_recebidas")
    viagem = models.ForeignKey(Viagem, on_delete=models.DO_NOTHING, db_column="id_viagem", related_name="avaliacoes")
    nota_quantitativa = models.IntegerField()
    observacao_qualitativa = models.TextField(null=True, blank=True)
    criada_em = models.TextField()

    class Meta:
        managed = False
        db_table = "Avaliacao"


class Notificacao(models.Model):
    id_notificacao = models.AutoField(primary_key=True)
    usuario = models.ForeignKey(Usuario, on_delete=models.DO_NOTHING, db_column="id_usuario", related_name="notificacoes")
    viagem = models.ForeignKey(Viagem, on_delete=models.DO_NOTHING, db_column="id_viagem", null=True, blank=True)
    reserva = models.ForeignKey(Reserva, on_delete=models.DO_NOTHING, db_column="id_reserva", null=True, blank=True)
    tipo = models.TextField()
    conteudo = models.TextField()
    criada_em = models.TextField()
    lida_em = models.TextField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = "Notificacao"


class ChamadoSuporte(models.Model):
    numero_protocolo = models.AutoField(primary_key=True)
    usuario = models.ForeignKey(Usuario, on_delete=models.DO_NOTHING, db_column="id_usuario", null=True, blank=True)
    nome = models.TextField()
    email = models.TextField()
    categoria_assunto = models.TextField()
    mensagem = models.TextField()
    status_chamado = models.TextField(default="ABERTO")
    criado_em = models.TextField()

    class Meta:
        managed = False
        db_table = "Chamado_Suporte"


class FatoDashboardSustentavel(models.Model):
    id_fato = models.AutoField(primary_key=True)
    viagem = models.OneToOneField(Viagem, on_delete=models.CASCADE, db_column="id_viagem", related_name="fato_sustentavel")
    tempo = models.ForeignKey(DimTempo, on_delete=models.DO_NOTHING, db_column="id_tempo", related_name="fatos")
    destino = models.ForeignKey(DimDestino, on_delete=models.DO_NOTHING, db_column="id_destino", related_name="fatos")
    turno = models.ForeignKey(DimTurno, on_delete=models.DO_NOTHING, db_column="id_turno", related_name="fatos")
    passageiros_transportados = models.IntegerField()
    distancia_km = models.FloatField()
    kg_co2_por_km_aplicado = models.FloatField()
    veiculos_individuais_evitados = models.IntegerField()
    estimativa_co2_economizado_kg = models.FloatField()
    atualizado_em = models.TextField()

    class Meta:
        managed = False
        db_table = "Fato_Dashboard_Sustentavel"
