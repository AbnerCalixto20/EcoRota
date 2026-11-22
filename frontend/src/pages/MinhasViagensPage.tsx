import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError, apiRequest, formatCurrencyBRL, formatDateTimeBR } from '../api';
import type { Viagem } from '../api';
import { Icon } from '../components/UI';
import { StatusBadge } from '../components/UI';

interface PassageiroViagem extends Viagem {
  id_reserva: number;
  status_reserva: string;
}

export function MinhasViagensPage() {
  const navigate = useNavigate();
  const [comoMotorista, setComoMotorista] = useState<Viagem[]>([]);
  const [comoPassageiro, setComoPassageiro] = useState<PassageiroViagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{
        como_motorista: Viagem[];
        como_passageiro: PassageiroViagem[];
      }>('/viagens/minhas');
      setComoMotorista(res.como_motorista);
      setComoPassageiro(res.como_passageiro);
    } catch {
      setComoMotorista([]);
      setComoPassageiro([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const runAction = async (endpoint: string, body?: object) => {
    setFeedback(null);
    try {
      const res = await apiRequest<{ message: string }>(endpoint, {
        method: 'PATCH',
        body: body ? JSON.stringify(body) : undefined,
      });
      setFeedback({ type: 'ok', text: res.message });
      await load();
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof ApiError ? err.message : 'Erro ao executar ação.',
      });
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            ECR006 & ECR008 • Gestão Operacional
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-black mt-1">Minhas Viagens</h1>
          <p className="text-sm text-neutral-600 mt-1">
            Gerencie suas caronas ativas como motorista ou passageiro, acesse o chat e registre conclusões.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/solicitacoes"
            className="px-4 py-2 rounded-full bg-white border border-neutral-300 text-xs font-semibold hover:border-black"
          >
            Solicitações Pendentes
          </Link>
          <Link
            to="/historico"
            className="px-4 py-2 rounded-full bg-black text-white text-xs font-semibold hover:bg-neutral-800"
          >
            Ver Histórico (ECR016)
          </Link>
        </div>
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
        <p className="text-sm text-neutral-500">Carregando viagens ativas...</p>
      ) : (
        <div className="space-y-10">
          {/* Como Motorista */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-black flex items-center gap-2">
              <Icon name="directions_car" /> Ofertas que estou conduzindo ({comoMotorista.length})
            </h2>
            {comoMotorista.length === 0 ? (
              <div className="bg-white border border-neutral-200 rounded-2xl p-8 text-sm text-neutral-500">
                Você não possui corridas ativas como motorista no momento.{' '}
                <Link to="/oferecer" className="text-black font-semibold underline">
                  Oferecer carona
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {comoMotorista.map((v) => (
                  <div
                    key={v.id_viagem}
                    onClick={() => navigate(`/caronas/${v.id_viagem}`, { state: { from: '/minhas-viagens' } })}
                    className="bg-white border border-neutral-200 hover:border-black rounded-2xl p-6 space-y-4 shadow-sm cursor-pointer transition-colors"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <StatusBadge status={v.status_oferta} />
                          <StatusBadge status={v.modalidade_aprovacao} />
                          <span className="text-xs text-neutral-500">
                            {v.vagas_disponiveis}/{v.vagas_total} vagas livres
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-black hover:underline">
                          {v.ponto_partida} → {v.destino_final}
                        </h3>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          {formatDateTimeBR(v.data_horario)} • {v.veiculo_marca} {v.veiculo_modelo} ({v.veiculo_placa}) •{' '}
                          {formatCurrencyBRL(v.valor_rateio)}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Link
                          to={`/caronas/${v.id_viagem}`}
                          state={{ from: '/minhas-viagens' }}
                          className="px-4 py-2 rounded-full bg-white border border-neutral-300 hover:border-black text-black text-xs font-semibold inline-flex items-center gap-1"
                        >
                          <Icon name="visibility" className="text-[16px]" /> Ver detalhes
                        </Link>
                        <Link
                          to={`/chat/${v.id_viagem}`}
                          className="px-4 py-2 rounded-full bg-[#efefef] text-black text-xs font-semibold hover:bg-neutral-200 inline-flex items-center gap-1"
                        >
                          <Icon name="chat" className="text-[16px]" /> Chat
                        </Link>
                        {v.status_oferta === 'DISPONIVEL' && (
                          <button
                            type="button"
                            onClick={() => runAction(`/viagens/${v.id_viagem}/iniciar`)}
                            className="px-4 py-2 rounded-full bg-black text-white text-xs font-semibold hover:bg-neutral-800"
                          >
                            Iniciar Corrida
                          </button>
                        )}
                        {v.status_oferta === 'EM_ANDAMENTO' && (
                          <button
                            type="button"
                            onClick={() => runAction(`/viagens/${v.id_viagem}/concluir`)}
                            className="px-4 py-2 rounded-full bg-eco text-white text-xs font-semibold hover:bg-eco-dark"
                          >
                            Concluir Corrida (ECR008)
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            const motivo = window.prompt('Informe o motivo do cancelamento da viagem:');
                            if (motivo !== null) {
                              runAction(`/viagens/${v.id_viagem}/cancelar`, {
                                motivo_cancelamento: motivo,
                              });
                            }
                          }}
                          className="px-4 py-2 rounded-full bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100"
                        >
                          Cancelar Viagem
                        </button>
                      </div>
                    </div>

                    {v.reservas && v.reservas.length > 0 && (
                      <div className="pt-3 border-t border-neutral-100">
                        <p className="text-xs font-semibold text-neutral-500 mb-2">
                          Passageiros vinculados:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {v.reservas.map((r) => (
                            <span
                              key={r.id_reserva}
                              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f9f9f9] border border-neutral-200 text-xs"
                            >
                              <strong>{r.passageiro_nome}</strong>
                              <StatusBadge status={r.status_reserva} />
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Como Passageiro */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-black flex items-center gap-2">
              <Icon name="airline_seat_recline_normal" /> Minhas reservas como passageiro ({comoPassageiro.length})
            </h2>
            {comoPassageiro.length === 0 ? (
              <div className="bg-white border border-neutral-200 rounded-2xl p-8 text-sm text-neutral-500">
                Você não possui reservas ativas no momento.{' '}
                <Link to="/caronas" className="text-black font-semibold underline">
                  Pesquisar caronas
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {comoPassageiro.map((r) => (
                  <div
                    key={r.id_reserva}
                    onClick={() => navigate(`/caronas/${r.id_viagem}`, { state: { from: '/minhas-viagens' } })}
                    className="bg-white border border-neutral-200 hover:border-black rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm cursor-pointer transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={r.status_reserva} />
                        <StatusBadge status={r.status_oferta} />
                      </div>
                      <h3 className="text-lg font-bold text-black hover:underline">
                        {r.ponto_partida} → {r.destino_final}
                      </h3>
                      <p className="text-xs text-neutral-500">
                        Motorista: <strong>{r.motorista_nome}</strong> • {formatDateTimeBR(r.data_horario)} •{' '}
                        {r.veiculo_marca} {r.veiculo_modelo} ({r.veiculo_placa}) • {formatCurrencyBRL(r.valor_rateio)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Link
                        to={`/caronas/${r.id_viagem}`}
                        state={{ from: '/minhas-viagens' }}
                        className="px-4 py-2 rounded-full bg-white border border-neutral-300 hover:border-black text-black text-xs font-semibold inline-flex items-center gap-1"
                      >
                        <Icon name="visibility" className="text-[16px]" /> Ver detalhes
                      </Link>
                      {r.status_reserva === 'CONFIRMADO' && (
                        <Link
                          to={`/chat/${r.id_viagem}`}
                          className="px-4 py-2 rounded-full bg-black text-white text-xs font-semibold hover:bg-neutral-800 inline-flex items-center gap-1"
                        >
                          <Icon name="chat" className="text-[16px]" /> Chat da Carona
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const just = window.prompt('Justificativa do cancelamento da reserva:');
                          if (just !== null) {
                            runAction(`/reservas/${r.id_reserva}/cancelar`, {
                              justificativa_cancelamento: just,
                            });
                          }
                        }}
                        className="px-4 py-2 rounded-full bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100"
                      >
                        Cancelar Reserva
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
