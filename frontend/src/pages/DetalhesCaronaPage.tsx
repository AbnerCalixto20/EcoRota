import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth';
import { ApiError, apiRequest, formatCurrencyBRL, formatDateTimeBR } from '../api';
import type { Viagem } from '../api';
import { Icon } from '../components/UI';
import { StatusBadge } from '../components/UI';

export function DetalhesCaronaPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = (location.state as { from?: string } | null)?.from || '/caronas';
  const backLabel = fromPath === '/minhas-viagens' ? 'Voltar para Minhas Viagens' : 'Voltar para caronas';

  const [viagem, setViagem] = useState<Viagem | null>(null);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const loadViagem = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ viagem: Viagem }>(`/viagens/${id}`);
      setViagem(res.viagem);
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof ApiError ? err.message : 'Carona não encontrada.',
      });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadViagem();
  }, [loadViagem]);

  const handleReservar = async () => {
    if (!user) {
      navigate('/login', { state: { from: `/caronas/${id}` } });
      return;
    }
    setReserving(true);
    setFeedback(null);
    try {
      const res = await apiRequest<{ message: string }>('/reservas', {
        method: 'POST',
        body: JSON.stringify({ id_viagem: Number(id) }),
      });
      setFeedback({ type: 'ok', text: res.message });
      await loadViagem();
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof ApiError ? err.message : 'Erro ao solicitar reserva.',
      });
    } finally {
      setReserving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-[1100px] mx-auto px-6 py-16 text-sm text-neutral-500">
        Carregando detalhes da carona...
      </div>
    );
  }

  if (!viagem) {
    return (
      <div className="max-w-[1100px] mx-auto px-6 py-16 space-y-4">
        <p className="text-red-600 font-semibold">{feedback?.text || 'Carona não encontrada.'}</p>
        <Link to="/caronas" className="text-sm font-semibold underline">
          Voltar para pesquisa
        </Link>
      </div>
    );
  }

  const isMotorista = user?.id_usuario === viagem.id_motorista;
  const minhaReserva = viagem.minha_reserva;
  const canOpenChat =
    (isMotorista || minhaReserva?.status_reserva === 'CONFIRMADO') &&
    viagem.status_oferta !== 'CANCELADA';

  return (
    <div className="max-w-[1100px] mx-auto px-6 py-10 space-y-8">
      <div>
        <Link to={fromPath} className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-600 hover:text-black mb-3">
          <Icon name="arrow_back" className="text-[16px]" />
          {backLabel}
        </Link>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            ECR004 • Detalhes da Oferta #{viagem.id_viagem}
          </span>
          <StatusBadge status={viagem.status_oferta} />
          <StatusBadge status={viagem.modalidade_aprovacao} />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-black tracking-tight">
          {viagem.ponto_partida} → {viagem.destino_final}
        </h1>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-sm font-medium ${
            feedback.type === 'ok'
              ? 'bg-eco-soft border-eco-border text-eco-dark'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {feedback.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Coluna Esquerda: Itinerário, Veículo e Passageiros */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-5">
            <h2 className="text-lg font-bold text-black flex items-center gap-2">
              <Icon name="route" /> Itinerário Detalhado
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#f9f9f9] p-4 rounded-xl text-sm">
              <div>
                <span className="text-xs text-neutral-500 block">Saída prevista</span>
                <strong className="text-black">{formatDateTimeBR(viagem.data_horario)}</strong>
              </div>
              <div>
                <span className="text-xs text-neutral-500 block">Previsão de chegada</span>
                <strong className="text-black">{formatDateTimeBR(viagem.previsao_chegada)}</strong>
              </div>
              <div>
                <span className="text-xs text-neutral-500 block">Distância estimada</span>
                <strong className="text-black">{viagem.distancia_km} km</strong>
              </div>
              <div>
                <span className="text-xs text-neutral-500 block">Campus / Tipo</span>
                <strong className="text-black">
                  {viagem.campus} ({viagem.tipo_destino})
                </strong>
              </div>
            </div>

            {viagem.paradas && viagem.paradas.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase text-neutral-500 mb-2">
                  Pontos de Parada Intermediários
                </p>
                <ul className="space-y-2">
                  {viagem.paradas.map((p) => (
                    <li key={p.id_parada} className="flex items-center gap-2 text-sm text-black">
                      <span className="w-6 h-6 rounded-full bg-neutral-100 text-xs font-bold flex items-center justify-center">
                        {p.ordem}
                      </span>
                      {p.descricao_local}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-black flex items-center gap-2">
              <Icon name="directions_car" /> Motorista e Veículo
            </h2>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-base font-bold text-black">{viagem.motorista_nome}</p>
                <p className="text-xs text-neutral-500">NUSP {viagem.motorista_nusp} • Conta institucional verificada</p>
                {viagem.motorista_bio && (
                  <p className="text-sm text-neutral-600 mt-2">{viagem.motorista_bio}</p>
                )}
              </div>
              <div className="bg-[#f9f9f9] border border-neutral-200 rounded-xl px-4 py-3 text-right shrink-0">
                <p className="text-lg font-extrabold text-black flex items-center justify-end gap-1">
                  <Icon name="star" filled className="text-[18px]" />
                  {viagem.motorista_reputacao ? viagem.motorista_reputacao.toFixed(1) : '—'}
                </p>
                <p className="text-xs text-neutral-500">{viagem.motorista_avaliacoes || 0} avaliações</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-neutral-100 text-xs">
              <div>
                <span className="text-neutral-500 block">Veículo</span>
                <strong className="text-black">
                  {viagem.veiculo_marca} {viagem.veiculo_modelo}
                </strong>
              </div>
              <div>
                <span className="text-neutral-500 block">Cor / Ano</span>
                <strong className="text-black">
                  {viagem.veiculo_cor || '—'} {viagem.veiculo_ano ? `(${viagem.veiculo_ano})` : ''}
                </strong>
              </div>
              <div>
                <span className="text-neutral-500 block">Placa</span>
                <strong className="text-black font-mono">{viagem.veiculo_placa}</strong>
              </div>
              <div>
                <span className="text-neutral-500 block">Vagas</span>
                <strong className="text-black">
                  {viagem.vagas_disponiveis} livres / {viagem.vagas_total} totais
                </strong>
              </div>
            </div>
          </div>

          <div className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-3">
            <h2 className="text-lg font-bold text-black flex items-center gap-2">
              <Icon name="groups" /> Passageiros Confirmados ({viagem.passageiros_confirmados?.length || 0})
            </h2>
            {!viagem.passageiros_confirmados || viagem.passageiros_confirmados.length === 0 ? (
              <p className="text-sm text-neutral-500">Ainda não há passageiros confirmados nesta carona.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {viagem.passageiros_confirmados.map((p) => (
                  <div
                    key={p.id_reserva}
                    className="px-3.5 py-2 rounded-full bg-[#f3f3f4] text-xs font-semibold text-black flex items-center gap-2"
                  >
                    <span>{p.nome_completo}</span>
                    <span className="text-neutral-500">★ {p.reputacao ? p.reputacao.toFixed(1) : 'Novo'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Coluna Direita: Card de Ação / Rateio Solidário */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm space-y-5 sticky top-24">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-semibold uppercase text-neutral-500">Rateio solidário / vaga</span>
              <span className="text-3xl font-extrabold text-black">
                {formatCurrencyBRL(viagem.valor_rateio)}
              </span>
            </div>

            <div className="bg-eco-soft border border-eco-border rounded-xl p-3.5 text-xs text-eco-dark space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <Icon name="eco" className="text-[16px]" />
                Impacto desta carona
              </p>
              <p>
                Cada passageiro confirmado evita aproximadamente{' '}
                <strong>{(viagem.distancia_km * 0.12).toFixed(2)} kg de CO₂</strong> na atmosfera.
              </p>
            </div>

            <div className="text-xs text-neutral-600 space-y-1.5 border-t border-neutral-100 pt-4">
              <div className="flex justify-between">
                <span>Combustível previsto</span>
                <strong>R$ {viagem.custo_combustivel_previsto.toFixed(2)}</strong>
              </div>
              <div className="flex justify-between">
                <span>Pedágio previsto</span>
                <strong>R$ {viagem.custo_pedagio_previsto.toFixed(2)}</strong>
              </div>
              <div className="flex justify-between">
                <span>Modalidade de aceite</span>
                <strong>{viagem.modalidade_aprovacao}</strong>
              </div>
            </div>

            {isMotorista ? (
              <div className="space-y-2">
                <p className="text-xs text-center text-neutral-500">Você é o motorista desta carona.</p>
                <Link
                  to="/minhas-viagens"
                  className="block w-full text-center py-3 rounded-full bg-black text-white text-sm font-semibold hover:bg-neutral-800"
                >
                  Gerenciar em Minhas Viagens
                </Link>
              </div>
            ) : minhaReserva ? (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-[#f3f3f4] text-center space-y-1">
                  <span className="text-xs text-neutral-500 block">Status da sua reserva</span>
                  <StatusBadge status={minhaReserva.status_reserva} />
                </div>
                {canOpenChat && (
                  <Link
                    to={`/chat/${viagem.id_viagem}`}
                    className="block w-full text-center py-3 rounded-full bg-black text-white text-sm font-semibold hover:bg-neutral-800"
                  >
                    Abrir Chat da Carona
                  </Link>
                )}
                <Link
                  to="/minhas-viagens"
                  className="block w-full text-center py-2.5 rounded-full bg-[#efefef] text-black text-xs font-semibold hover:bg-neutral-200"
                >
                  Ver em Minhas Viagens
                </Link>
              </div>
            ) : viagem.status_oferta === 'DISPONIVEL' && viagem.vagas_disponiveis > 0 ? (
              <button
                type="button"
                disabled={reserving}
                onClick={handleReservar}
                className="w-full py-3.5 rounded-full bg-black text-white text-sm font-semibold hover:bg-neutral-800 disabled:opacity-60 transition-colors"
              >
                {reserving
                  ? 'Processando...'
                  : viagem.modalidade_aprovacao === 'AUTOMATICA'
                  ? 'Confirmar Vaga Imediatamente'
                  : 'Solicitar Reserva de Vaga'}
              </button>
            ) : (
              <div className="p-3 rounded-xl bg-neutral-100 text-center text-xs text-neutral-600 font-medium">
                Esta oferta não possui mais vagas abertas para reserva.
              </div>
            )}

            {canOpenChat && isMotorista && (
              <Link
                to={`/chat/${viagem.id_viagem}`}
                className="block w-full text-center py-2.5 rounded-full bg-[#efefef] text-black text-xs font-semibold hover:bg-neutral-200"
              >
                Abrir Chat da Viagem (UC012)
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
