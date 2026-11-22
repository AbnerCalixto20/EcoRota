import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError, apiRequest, formatDateTimeBR } from '../api';
import { Icon } from '../components/UI';

interface ParticipanteAvaliacao {
  id_usuario: number;
  nome_completo: string;
  nusp: string;
  papel: string;
  reputacao: number;
  avaliacao_enviada: {
    id_avaliacao: number;
    nota_quantitativa: number;
    observacao_qualitativa?: string | null;
  } | null;
}

interface AvaliacaoPayload {
  viagem: {
    id_viagem: number;
    ponto_partida: string;
    destino_final: string;
    data_horario: string;
    status_oferta: string;
  };
  participantes: ParticipanteAvaliacao[];
}

export function AvaliacaoPage() {
  const { viagemId } = useParams();
  const [data, setData] = useState<AvaliacaoPayload | null>(null);
  const [notas, setNotas] = useState<Record<number, number>>({});
  const [obs, setObs] = useState<Record<number, string>>({});
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<AvaliacaoPayload>(`/avaliacoes/viagem/${viagemId}`);
      setData(res);
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof ApiError ? err.message : 'Erro ao carregar participantes.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [viagemId]);

  const handleAvaliar = async (idAvaliado: number) => {
    const nota = notas[idAvaliado] || 5;
    setFeedback(null);
    try {
      const res = await apiRequest<{ message: string }>('/avaliacoes', {
        method: 'POST',
        body: JSON.stringify({
          id_viagem: Number(viagemId),
          id_avaliado: idAvaliado,
          nota_quantitativa: nota,
          observacao_qualitativa: obs[idAvaliado] || '',
        }),
      });
      setFeedback({ type: 'ok', text: res.message });
      await load();
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof ApiError ? err.message : 'Erro ao enviar avaliação.',
      });
    }
  };

  return (
    <div className="max-w-[820px] mx-auto px-6 py-10 space-y-6">
      <Link to="/historico" className="text-xs font-semibold text-neutral-600 hover:text-black inline-flex items-center gap-1">
        <Icon name="arrow_back" className="text-[16px]" /> Voltar ao Histórico
      </Link>

      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          ECR009 • Sistema de Reputação
        </span>
        <h1 className="text-3xl font-extrabold tracking-tight text-black mt-1">
          Avaliar Participantes
        </h1>
        {data && (
          <p className="text-sm text-neutral-600 mt-1">
            Viagem #{data.viagem.id_viagem}: <strong>{data.viagem.ponto_partida}</strong> →{' '}
            <strong>{data.viagem.destino_final}</strong> ({formatDateTimeBR(data.viagem.data_horario)})
          </p>
        )}
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border text-sm font-medium ${
            feedback.type === 'ok'
              ? 'bg-eco-soft border-eco-border text-eco-dark'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-neutral-500">Carregando participantes...</p>
      ) : !data || data.participantes.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-2xl p-8 text-sm text-neutral-500">
          Não há outros participantes confirmados nesta viagem para avaliar.
        </div>
      ) : (
        <div className="space-y-4">
          {data.participantes.map((p) => {
            const currentRating = notas[p.id_usuario] ?? 5;
            return (
              <div
                key={p.id_usuario}
                className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                      {p.papel} • NUSP {p.nusp}
                    </span>
                    <h2 className="text-lg font-bold text-black">{p.nome_completo}</h2>
                  </div>
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#f3f3f4]">
                    Reputação atual: ★ {p.reputacao ? p.reputacao.toFixed(1) : 'Novo'}
                  </span>
                </div>

                {p.avaliacao_enviada ? (
                  <div className="p-4 rounded-xl bg-eco-soft border border-eco-border text-xs text-eco-dark">
                    <p className="font-bold">
                      Avaliação registrada: {p.avaliacao_enviada.nota_quantitativa} / 5 estrelas
                    </p>
                    {p.avaliacao_enviada.observacao_qualitativa && (
                      <p className="mt-1">"{p.avaliacao_enviada.observacao_qualitativa}"</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setNotas((prev) => ({ ...prev, [p.id_usuario]: star }))}
                          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                            star <= currentRating
                              ? 'bg-black text-white'
                              : 'bg-[#efefef] text-neutral-400 hover:bg-neutral-200'
                          }`}
                          title={`${star} estrela(s)`}
                        >
                          <Icon name="star" filled={star <= currentRating} className="text-[20px]" />
                        </button>
                      ))}
                      <span className="text-xs font-semibold text-neutral-600 ml-2">
                        {currentRating} de 5 estrelas
                      </span>
                    </div>

                    <textarea
                      rows={2}
                      value={obs[p.id_usuario] || ''}
                      onChange={(e) => setObs((prev) => ({ ...prev, [p.id_usuario]: e.target.value }))}
                      placeholder="Observação qualitativa (opcional): pontualidade, respeito, conforto..."
                      className="w-full px-4 py-3 bg-[#f3f3f4] rounded-xl text-sm focus:bg-white border border-transparent focus:border-black focus:outline-none"
                    />

                    <button
                      type="button"
                      onClick={() => handleAvaliar(p.id_usuario)}
                      className="px-6 py-2.5 rounded-full bg-black text-white text-xs font-semibold hover:bg-neutral-800"
                    >
                      Enviar Avaliação
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
