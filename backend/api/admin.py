from django.contrib import admin
from .models import (
    Avaliacao,
    ChamadoSuporte,
    DimDestino,
    DimTempo,
    DimTurno,
    FatoDashboardSustentavel,
    Mensagem,
    Notificacao,
    ParadaViagem,
    ParametroAmbiental,
    Reserva,
    TokenUsuario,
    Usuario,
    Veiculo,
    Viagem,
)


@admin.register(Usuario)
class UsuarioAdmin(admin.ModelAdmin):
    list_display = ("id_usuario", "nome_completo", "nusp", "email_institucional", "status_conta")
    search_fields = ("nome_completo", "nusp", "email_institucional")


@admin.register(Viagem)
class ViagemAdmin(admin.ModelAdmin):
    list_display = ("id_viagem", "motorista", "ponto_partida", "destino", "data_horario", "status_oferta", "valor_rateio")
    list_filter = ("status_oferta", "modalidade_aprovacao")


@admin.register(FatoDashboardSustentavel)
class FatoAdmin(admin.ModelAdmin):
    list_display = ("id_fato", "viagem", "tempo", "destino", "turno", "passageiros_transportados", "estimativa_co2_economizado_kg")
    readonly_fields = ("veiculos_individuais_evitados", "estimativa_co2_economizado_kg")


for model in (
    Veiculo,
    DimDestino,
    DimTempo,
    DimTurno,
    ParametroAmbiental,
    ParadaViagem,
    Reserva,
    Mensagem,
    Avaliacao,
    Notificacao,
    ChamadoSuporte,
    TokenUsuario,
):
    admin.site.register(model)
