import { useEffect, useState } from 'react';
import { ApiError, apiRequest, formatDateTimeBR } from '../api';
import type { SolicitacaoPendente } from '../api';
import { Icon } from '../components/UI';

export function PainelSolicitacoesPage() {
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoPendente[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ solicitacoes: SolicitacaoPendente[] }>('/reservas/pendentes');
      setSolicitacoes(res.solicitacoes);
    } catch {
      setSolicitacoes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDecidir = async (idReserva: number, decisao: 'ACEITAR' | 'REJEITAR') => {
    setFeedback(null);
    try {
      const res = await apiRequest<{ message: string }>(`/reservas/${idReserva}/decidir`, {
        method: 'PATCH',
        body: JSON.stringify({ decisao }),
      });
      setFeedback({ type: 'ok', text: res.message });
      await load();
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof ApiError ? err.message : 'Erro ao processar decisão.',
      });
    }
  };

  return (
    <div className="max-w-[1100px] mx-auto px-6 py-10 space-y-6">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          ECR005 • Painel do Motorista
        </span>
        <h1 className="text-3xl font-extrabold tracking-tight text-black mt-1">
          Solicitações Pendentes
        </h1>
        <p className="text-sm text-neutral-600 mt-1">
          Avalie o perfil e a reputação dos solicitantes nas suas caronas com aprovação manual.
        </p>
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
        <p className="text-sm text-neutral-500">Carregando solicitações...</p>
      ) : solicitacoes.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center space-y-2">
          <Icon name="check_circle" className="text-[42px] text-neutral-400" />
          <h2 className="text-base font-bold text-black">Nenhuma solicitação pendente</h2>
          <p className="text-sm text-neutral-500">
            Quando passageiros pedirem vaga em suas corridas manuais, elas aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {solicitacoes.map((s) => (
            <div
              key={s.id_reserva}
              className="bg-white border border-neutral-200 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-black">{s.passageiro_nome}</h2>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#f3f3f4] text-black">
                    ★ {s.passageiro_reputacao ? s.passageiro_reputacao.toFixed(1) : 'Novo'} ({s.passageiro_avaliacoes} aval.)
                  </span>
                </div>
                <p className="text-xs text-neutral-500">
                  NUSP {s.passageiro_nusp} • {s.passageiro_email}
                </p>
                {s.passageiro_bio && <p className="text-xs text-neutral-600">{s.passageiro_bio}</p>}
                <div className="pt-2 text-xs text-neutral-700 font-medium">
                  Carona #{s.id_viagem}: <strong>{s.ponto_partida}</strong> →{' '}
                  <strong>{s.destino_final}</strong> ({formatDateTimeBR(s.data_horario)}) •{' '}
                  {s.vagas_disponiveis}/{s.vagas_total} vagas livres
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDecidir(s.id_reserva, 'REJEITAR')}
                  className="px-5 py-2.5 rounded-full bg-[#efefef] text-black text-xs font-semibold hover:bg-red-50 hover:text-red-700 transition-colors"
                >
                  Rejeitar
                </button>
                <button
                  type="button"
                  onClick={() => handleDecidir(s.id_reserva, 'ACEITAR')}
                  className="px-5 py-2.5 rounded-full bg-black text-white text-xs font-semibold hover:bg-neutral-800 transition-colors"
                >
                  Aceitar Passageiro
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
