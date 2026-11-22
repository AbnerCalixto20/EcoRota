import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../auth';
import { ApiError, apiRequest, formatDateTimeBR, getStoredToken } from '../api';
import type { MensagemChat } from '../api';
import { Icon } from '../components/UI';
import { StatusBadge } from '../components/UI';

interface ChatPayload {
  viagem: {
    id_viagem: number;
    ponto_partida: string;
    destino_final: string;
    data_horario: string;
    status_oferta: string;
    motorista_nome: string;
  };
  chat_ativo: boolean;
  participantes: Array<{ id_usuario: number; nome_completo: string; papel: string }>;
  mensagens: MensagemChat[];
}

export function ChatPage() {
  const { viagemId } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState<ChatPayload | null>(null);
  const [mensagens, setMensagens] = useState<MensagemChat[]>([]);
  const [texto, setTexto] = useState('');
  const [wsStatus, setWsStatus] = useState<'conectando' | 'online' | 'offline'>('conectando');
  const [error, setError] = useState('');

  const wsRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    apiRequest<ChatPayload>(`/mensagens/${viagemId}`)
      .then((res) => {
        setData(res);
        setMensagens(res.mensagens);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Não foi possível carregar o chat.');
      });
  }, [viagemId]);

  useEffect(() => {
    const token = getStoredToken();
    if (!token || !viagemId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/chat?token=${encodeURIComponent(token)}&viagemId=${viagemId}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setWsStatus('online');
    ws.onclose = () => setWsStatus('offline');
    ws.onerror = () => setWsStatus('offline');
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'message' && msg.data) {
          setMensagens((prev) =>
            prev.some((m) => m.id_mensagem === msg.data.id_mensagem) ? prev : [...prev, msg.data]
          );
        } else if (msg.type === 'error') {
          setError(msg.error);
        }
      } catch {
        // ignora payload inválido
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [viagemId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = texto.trim();
    if (!content) return;
    setError('');

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ conteudo: content }));
      setTexto('');
    } else {
      try {
        const res = await apiRequest<{ mensagem: MensagemChat }>(`/mensagens/${viagemId}`, {
          method: 'POST',
          body: JSON.stringify({ conteudo: content }),
        });
        setMensagens((prev) => [...prev, res.mensagem]);
        setTexto('');
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Erro ao enviar mensagem.');
      }
    }
  };

  return (
    <div className="max-w-[960px] mx-auto px-6 py-8">
      <div className="mb-4 flex items-center justify-between">
        <Link to="/minhas-viagens" className="text-xs font-semibold text-neutral-600 hover:text-black inline-flex items-center gap-1">
          <Icon name="arrow_back" className="text-[16px]" /> Voltar para Minhas Viagens
        </Link>
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${
            wsStatus === 'online'
              ? 'bg-eco-soft text-eco-dark border border-eco-border'
              : 'bg-neutral-100 text-neutral-600'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              wsStatus === 'online' ? 'bg-eco' : 'bg-neutral-400'
            }`}
          />
          WebSocket {wsStatus}
        </span>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-700">
          {error}
        </div>
      )}

      {data && (
        <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm flex flex-col h-[70vh]">
          {/* Cabeçalho da sala */}
          <div className="px-6 py-4 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-semibold uppercase text-neutral-500">
                UC012 • Chat Interativo da Viagem #{data.viagem.id_viagem}
              </span>
              <h1 className="text-lg font-bold text-black">
                {data.viagem.ponto_partida} → {data.viagem.destino_final}
              </h1>
              <p className="text-xs text-neutral-500">
                Participantes: {data.participantes.map((p) => `${p.nome_completo} (${p.papel})`).join(', ')}
              </p>
            </div>
            <StatusBadge status={data.viagem.status_oferta} />
          </div>

          {/* Lista de mensagens */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-[#f9f9f9]">
            {mensagens.length === 0 ? (
              <p className="text-center text-xs text-neutral-400 pt-10">
                Nenhuma mensagem ainda. Combine o ponto exato de encontro aqui!
              </p>
            ) : (
              mensagens.map((m) => {
                const mine = m.id_remetente === user?.id_usuario;
                return (
                  <div key={m.id_mensagem} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                    <span className="text-[11px] text-neutral-500 mb-1 px-1">
                      {mine ? 'Você' : m.remetente_nome} • {formatDateTimeBR(m.enviada_em)}
                    </span>
                    <div
                      className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        mine
                          ? 'bg-black text-white rounded-br-sm'
                          : 'bg-white border border-neutral-200 text-black rounded-bl-sm'
                      }`}
                    >
                      {m.conteudo}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Envio */}
          {data.chat_ativo ? (
            <form onSubmit={handleSend} className="p-4 bg-white border-t border-neutral-200 flex items-center gap-3">
              <input
                type="text"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Digite sua mensagem para os participantes..."
                className="flex-1 px-4 py-3 bg-[#f3f3f4] rounded-full text-sm focus:bg-white border border-transparent focus:border-black focus:outline-none"
              />
              <button
                type="submit"
                className="px-5 py-3 rounded-full bg-black text-white text-sm font-semibold hover:bg-neutral-800 inline-flex items-center gap-1.5"
              >
                <Icon name="send" className="text-[18px]" />
                Enviar
              </button>
            </form>
          ) : (
            <div className="p-4 bg-neutral-100 border-t border-neutral-200 text-center text-xs font-medium text-neutral-600">
              Chat bloqueado automaticamente após a conclusão ou cancelamento da corrida.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
