import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest, formatCurrencyBRL, formatDateTimeBR } from '../api';
import type { HistoricoItem } from '../api';
import { Icon } from '../components/UI';
import { StatusBadge } from '../components/UI';

interface DetalheHistorico {
  viagem: {
    id_viagem: number;
    ponto_partida: string;
    destino_final: string;
    data_horario: string;
    valor_rateio: number;
    distancia_km: number;
    motorista_nome: string;
  };
  participantes: Array<{ id_usuario: number; nome_completo: string; papel: string }>;
  avaliacoes: Array<{
    id_avaliacao: number;
    avaliador_nome: string;
    avaliado_nome: string;
    nota_quantitativa: number;
    observacao_qualitativa?: string | null;
  }>;
  fato_sustentavel?: {
    estimativa_co2_economizado_kg: number;
    veiculos_individuais_evitados: number;
  } | null;
}

export function HistoricoViagensPage() {
  const [itens, setItens] = useState<HistoricoItem[]>([]);
  const [papelFiltro, setPapelFiltro] = useState('');
  const [loading, setLoading] = useState(true);
  const [detalhe, setDetalhe] = useState<DetalheHistorico | null>(null);

  useEffect(() => {
    setLoading(true);
    const qs = papelFiltro ? `?papel=${papelFiltro}` : '';
    apiRequest<{ historico: HistoricoItem[] }>(`/historico${qs}`)
      .then((res) => setItens(res.historico))
      .catch(() => setItens([]))
      .finally(() => setLoading(false));
  }, [papelFiltro]);

  const abrirDetalhes = async (viagemId: number) => {
    try {
      const res = await apiRequest<DetalheHistorico>(`/historico/${viagemId}`);
      setDetalhe(res);
    } catch {
      setDetalhe(null);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            ECR016 • View_Historico_Usuario
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-black mt-1">
            Histórico de Viagens
          </h1>
          <p className="text-sm text-neutral-600 mt-1">
            Consulte corridas concluídas ou canceladas, avaliações trocadas e impacto gerado.
          </p>
        </div>

        <div className="inline-flex bg-[#efefef] p-1 rounded-full">
          {[
            { value: '', label: 'Todas' },
            { value: 'MOTORISTA', label: 'Como Motorista' },
            { value: 'PASSAGEIRO', label: 'Como Passageiro' },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setPapelFiltro(tab.value)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                papelFiltro === tab.value ? 'bg-black text-white' : 'text-black hover:bg-neutral-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-neutral-500">Carregando histórico...</p>
      ) : itens.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center space-y-2">
          <Icon name="history" className="text-[42px] text-neutral-400" />
          <h2 className="text-base font-bold text-black">Você ainda não possui histórico de viagens</h2>
          <p className="text-sm text-neutral-500">
            Quando você concluir ou cancelar viagens, elas aparecerão listadas aqui.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-3">
            {itens.map((item, idx) => (
              <div
                key={`${item.id_viagem}-${item.papel}-${idx}`}
                className="bg-white border border-neutral-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-black transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-black text-white">
                      {item.papel}
                    </span>
                    <StatusBadge status={item.situacao} />
                  </div>
                  <h2 className="text-base font-bold text-black">
                    {item.ponto_partida} → {item.destino_final}
                  </h2>
                  <p className="text-xs text-neutral-500">
                    {formatDateTimeBR(item.data_horario)} • {formatCurrencyBRL(item.valor_rateio)} •{' '}
                    {item.participantes_passageiros} passageiro(s)
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => abrirDetalhes(item.id_viagem)}
                    className="px-4 py-2 rounded-full bg-[#efefef] text-black text-xs font-semibold hover:bg-neutral-200"
                  >
                    Ficha Detalhada
                  </button>
                  {item.situacao === 'CONCLUIDA' && (
                    <Link
                      to={`/avaliar/${item.id_viagem}`}
                      className="px-4 py-2 rounded-full bg-black text-white text-xs font-semibold hover:bg-neutral-800"
                    >
                      Avaliar
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-5">
            {detalhe ? (
              <div className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-4 sticky top-24 shadow-sm">
                <span className="text-xs font-semibold uppercase text-neutral-500">
                  Ficha da Viagem #{detalhe.viagem.id_viagem}
                </span>
                <h3 className="text-lg font-bold text-black">
                  {detalhe.viagem.ponto_partida} → {detalhe.viagem.destino_final}
                </h3>
                <p className="text-xs text-neutral-500">
                  {formatDateTimeBR(detalhe.viagem.data_horario)} • {detalhe.viagem.distancia_km} km •{' '}
                  {formatCurrencyBRL(detalhe.viagem.valor_rateio)}
                </p>

                {detalhe.fato_sustentavel && (
                  <div className="p-3.5 rounded-xl bg-eco-soft border border-eco-border text-xs text-eco-dark font-semibold">
                    Impacto contabilizado: {detalhe.fato_sustentavel.estimativa_co2_economizado_kg} kg
                    de CO₂ evitados ({detalhe.fato_sustentavel.veiculos_individuais_evitados} veículo(s)
                    a menos).
                  </div>
                )}

                <div>
                  <p className="text-xs font-bold uppercase text-neutral-500 mb-2">Participantes</p>
                  <div className="flex flex-wrap gap-1.5">
                    {detalhe.participantes.map((p) => (
                      <span
                        key={`${p.id_usuario}-${p.papel}`}
                        className="px-3 py-1 rounded-full bg-[#f3f3f4] text-xs font-medium"
                      >
                        {p.nome_completo} ({p.papel})
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase text-neutral-500 mb-2">
                    Avaliações Trocadas ({detalhe.avaliacoes.length})
                  </p>
                  {detalhe.avaliacoes.length === 0 ? (
                    <p className="text-xs text-neutral-500">Nenhuma avaliação registrada ainda.</p>
                  ) : (
                    <div className="space-y-2">
                      {detalhe.avaliacoes.map((a) => (
                        <div key={a.id_avaliacao} className="p-3 rounded-xl bg-[#f9f9f9] text-xs space-y-1">
                          <div className="flex justify-between font-semibold text-black">
                            <span>
                              {a.avaliador_nome} → {a.avaliado_nome}
                            </span>
                            <span>★ {a.nota_quantitativa}/5</span>
                          </div>
                          {a.observacao_qualitativa && (
                            <p className="text-neutral-600">"{a.observacao_qualitativa}"</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white border border-dashed border-neutral-300 rounded-2xl p-8 text-center text-xs text-neutral-500">
                Selecione uma viagem na lista ao lado para visualizar a ficha detalhada e avaliações.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
