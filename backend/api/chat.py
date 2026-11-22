from urllib.parse import parse_qs
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.db import connection
from .auth import verify_jwt


class ChatConsumer(AsyncJsonWebsocketConsumer):
    """WebSocket do Chat Interativo por viagem (UC012)."""

    async def connect(self):
        qs = parse_qs(self.scope.get("query_string", b"").decode("utf-8"))
        token = (qs.get("token") or [None])[0]
        viagem_raw = (qs.get("viagemId") or [None])[0]
        if not token or not viagem_raw:
            await self.close(code=4001)
            return

        try:
            self.user_id = int(verify_jwt(token)["sub"])
            self.viagem_id = int(viagem_raw)
        except Exception:
            await self.close(code=4002)
            return

        check = await self._check_participation(self.viagem_id, self.user_id)
        if not check["allowed"]:
            await self.close(code=4003)
            return

        self.room_group_name = f"chat_viagem_{self.viagem_id}"
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()
        await self.send_json({"type": "connected", "viagemId": self.viagem_id, "status_oferta": check["status_oferta"]})

    async def disconnect(self, close_code):
        if hasattr(self, "room_group_name"):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        texto = str(content.get("conteudo", "")).strip()
        if not texto:
            return
        result = await self._save_message(self.viagem_id, self.user_id, texto)
        if "error" in result:
            await self.send_json({"type": "error", "error": result["error"]})
            return
        await self.channel_layer.group_send(self.room_group_name, {"type": "chat_message", "data": result["data"]})

    async def chat_message(self, event):
        await self.send_json({"type": "message", "data": event["data"]})

    @database_sync_to_async
    def _check_participation(self, viagem_id: int, user_id: int) -> dict:
        with connection.cursor() as cursor:
            cursor.execute("SELECT id_motorista, status_oferta FROM Viagem WHERE id_viagem = %s", [viagem_id])
            ride = cursor.fetchone()
            if not ride:
                return {"allowed": False}
            if ride[0] == user_id:
                return {"allowed": True, "status_oferta": ride[1]}
            cursor.execute(
                "SELECT 1 FROM Reserva WHERE id_viagem = %s AND id_passageiro = %s AND status_reserva = 'CONFIRMADO'",
                [viagem_id, user_id],
            )
            if cursor.fetchone():
                return {"allowed": True, "status_oferta": ride[1]}
        return {"allowed": False}

    @database_sync_to_async
    def _save_message(self, viagem_id: int, user_id: int, conteudo: str) -> dict:
        with connection.cursor() as cursor:
            cursor.execute("SELECT status_oferta FROM Viagem WHERE id_viagem = %s", [viagem_id])
            row = cursor.fetchone()
            if not row or row[0] in ("CONCLUIDA", "CANCELADA"):
                return {"error": "Chat encerrado após conclusão ou cancelamento da viagem."}
            try:
                cursor.execute(
                    "INSERT INTO Mensagem (id_viagem, id_remetente, conteudo) VALUES (%s, %s, %s)",
                    [viagem_id, user_id, conteudo],
                )
                msg_id = cursor.lastrowid
                cursor.execute(
                    """
                    SELECT M.id_mensagem, M.id_viagem, M.id_remetente, M.conteudo, M.enviada_em,
                           U.nome_completo AS remetente_nome
                      FROM Mensagem M JOIN Usuario U ON U.id_usuario = M.id_remetente
                     WHERE M.id_mensagem = %s
                    """,
                    [msg_id],
                )
                return {"data": dict(zip([c[0] for c in cursor.description], cursor.fetchone()))}
            except Exception as exc:
                return {"error": str(exc)}
