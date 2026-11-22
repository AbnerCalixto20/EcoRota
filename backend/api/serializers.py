from rest_framework import serializers
from .models import DimDestino, Veiculo


class VeiculoSerializer(serializers.ModelSerializer):
    id_usuario = serializers.IntegerField(source="usuario_id", read_only=True)

    class Meta:
        model = Veiculo
        fields = ["id_veiculo", "id_usuario", "marca", "modelo", "cor", "placa", "ano", "capacidade_passageiros", "ativo"]


class DimDestinoSerializer(serializers.ModelSerializer):
    class Meta:
        model = DimDestino
        fields = ["id_destino", "tipo_destino", "campus", "restaurante", "nome_destino", "latitude", "longitude"]
