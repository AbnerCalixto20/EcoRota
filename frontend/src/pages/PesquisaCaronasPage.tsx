import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiRequest, formatCurrencyBRL, formatDateTimeBR } from '../api';
import type { Destino, Viagem } from '../api';
import { DestinoSelect, Icon, StatusBadge } from '../components/UI';

export function PesquisaCaronasPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [destinos, setDestinos] = useState<Destino[]>([]);
  const [viagens, setViagens] = useState<Viagem[]>([]);
  const [loading, setLoading] = useState(true);

  const [idOrigem, setIdOrigem] = useState(searchParams.get('id_origem') || '');
  const [origemTexto, setOrigemTexto] = useState(searchParams.get('origem') || '');
  const [idDestino, setIdDestino] = useState(searchParams.get('id_destino') || '');
  const [destinoTexto, setDestinoTexto] = useState(searchParams.get('destino') || '');
  const [data, setData] = useState(searchParams.get('data') || '');
  const [vagasMin, setVagasMin] = useState(searchParams.get('vagas_min') || '1');
  const [modalidade, setModalidade] = useState('');
  const [somenteGratuitas, setSomenteGratuitas] = useState(false);

  const buscar = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (idOrigem) {
        qs.set('id_origem', idOrigem);
      } else if (origemTexto.trim()) {
        qs.set('origem', origemTexto.trim());
      }
      if (idDestino) qs.set('id_destino', idDestino);
      if (destinoTexto.trim()) qs.set('destino', destinoTexto.trim());
      if (data) qs.set('data', data);
      if (vagasMin) qs.set('vagas_min', vagasMin);
      if (modalidade) qs.set('modalidade', modalidade);
      if (somenteGratuitas) qs.set('somente_gratuitas', 'true');

      const res = await apiRequest<{ viagens: Viagem[] }>(`/viagens?${qs.toString()}`);
      setViagens(res.viagens);
    } catch {
      setViagens([]);
    } finally {
      setLoading(false);
    }
  }, [idOrigem, origemTexto, idDestino, destinoTexto, data, vagasMin, modalidade, somenteGratuitas]);

  useEffect(() => {
    apiRequest<{ destinos: Destino[] }>('/destinos')
      .then((d) => {
        setDestinos(d.destinos);
        if (!searchParams.get('id_origem') && searchParams.get('origem')) {
          const term = searchParams.get('origem')!.trim().toLowerCase();
          const match = d.destinos.find((item) => item.nome_destino.toLowerCase() === term);
          if (match) setIdOrigem(String(match.id_destino));
        }
      })
      .catch(() => {});
  }, [searchParams]);

  useEffect(() => {
    buscar();
  }, [buscar]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams();
    if (idOrigem) next.set('id_origem', idOrigem);
    else if (origemTexto.trim()) next.set('origem', origemTexto.trim());
    if (idDestino) next.set('id_destino', idDestino);
    if (data) next.set('data', data);
    setSearchParams(next);
    buscar();
  };

  const handleSwap = () => {
    setIdOrigem(idDestino);
    setIdDestino(idOrigem);
    setOrigemTexto('');
    setDestinoTexto('');
  };

  return (
    <div>
      {/* Painel de Busca (Uber-inspired High-Contrast) */}
      <section className="w-full bg-white border-b border-neutral-200 py-10">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="max-w-3xl mb-6">
            <div className="inline-flex items-center gap-2 bg-[#efefef] px-3 py-1 rounded-full mb-3">
              <span className="w-2 h-2 rounded-full bg-black" />
              <span className="text-xs text-[#5e5e5e] font-medium">
                ECR003 • Rede Oficial Universitária USP Butantã
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-black">
              Para onde você quer ir hoje?
            </h1>
            <p className="text-base text-[#5e5e5e] mt-1">
              Pesquise ofertas ativas ordenadas por proximidade de rota e horário.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm space-y-4"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
              <div className="lg:col-span-4 bg-[#f3f3f4] rounded-xl px-4 py-2.5">
                <div className="flex items-center justify-between mb-0.5">
                  <label className="block text-[11px] font-semibold uppercase text-neutral-500">
                    Ponto de Partida (USP / Metrô SP / Bandejão)
                  </label>
                  {(idOrigem || idDestino) && (
                    <button
                      type="button"
                      onClick={handleSwap}
                      title="Inverter ponto de partida e destino"
                      className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-neutral-500 hover:text-black transition-colors"
                    >
                      <Icon name="swap_horiz" className="text-[15px]" />
                      Inverter
                    </button>
                  )}
                </div>
                <DestinoSelect
                  destinos={destinos}
                  value={idOrigem}
                  excludeId={idDestino}
                  onChange={(val) => {
                    setIdOrigem(val);
                    setOrigemTexto('');
                    if (val && val === idDestino) setIdDestino('');
                  }}
                  allLabel="Qualquer ponto de partida"
                />
              </div>

              <div className="lg:col-span-4 bg-[#f3f3f4] rounded-xl px-4 py-2.5">
                <label className="block text-[11px] font-semibold uppercase text-neutral-500 mb-0.5">
                  Destino (USP / Metrô SP / Bandejão)
                </label>
                <DestinoSelect
                  destinos={destinos}
                  value={idDestino}
                  excludeId={idOrigem}
                  onChange={(val) => {
                    setIdDestino(val);
                    setDestinoTexto('');
                    if (val && val === idOrigem) setIdOrigem('');
                  }}
                  allLabel="Todos os destinos (USP e Metrô SP)"
                />
              </div>

              <div className="lg:col-span-2 bg-[#f3f3f4] rounded-xl px-4 py-2.5">
                <label className="block text-[11px] font-semibold uppercase text-neutral-500">
                  Data
                </label>
                <input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="w-full bg-transparent text-sm font-semibold text-black focus:outline-none mt-0.5"
                />
              </div>

              <div className="lg:col-span-2 bg-[#f3f3f4] rounded-xl px-4 py-2.5">
                <label className="block text-[11px] font-semibold uppercase text-neutral-500">
                  Vagas mín.
                </label>
                <select
                  value={vagasMin}
                  onChange={(e) => setVagasMin(e.target.value)}
                  className="w-full bg-transparent text-sm font-semibold text-black focus:outline-none mt-0.5"
                >
                  {[1, 2, 3, 4].map((v) => (
                    <option key={v} value={v}>
                      {v} {v === 1 ? 'vaga' : 'vagas'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-neutral-500 mr-1">Filtros rápidos:</span>
                <button
                  type="button"
                  onClick={() => {
                    setModalidade('');
                    setSomenteGratuitas(false);
                    setDestinoTexto('');
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    !modalidade && !somenteGratuitas
                      ? 'bg-black text-white'
                      : 'bg-[#efefef] text-black hover:bg-neutral-200'
                  }`}
                >
                  Todas
                </button>
                <button
                  type="button"
                  onClick={() => setModalidade(modalidade === 'AUTOMATICA' ? '' : 'AUTOMATICA')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    modalidade === 'AUTOMATICA'
                      ? 'bg-black text-white'
                      : 'bg-[#efefef] text-black hover:bg-neutral-200'
                  }`}
                >
                  Aprovação Automática
                </button>
                <button
                  type="button"
                  onClick={() => setSomenteGratuitas(!somenteGratuitas)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    somenteGratuitas
                      ? 'bg-black text-white'
                      : 'bg-[#efefef] text-black hover:bg-neutral-200'
                  }`}
                >
                  Somente Gratuitas
                </button>
              </div>

              <button
                type="submit"
                className="px-6 py-2.5 rounded-full bg-black text-white text-sm font-semibold hover:bg-neutral-800 transition-colors inline-flex items-center gap-2"
              >
                <Icon name="search" className="text-[18px]" />
                Pesquisar Caronas
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Resultados */}
      <section className="max-w-[1200px] mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-black">
            {loading
              ? 'Buscando caronas disponíveis...'
              : `${viagens.length} ${viagens.length === 1 ? 'carona disponível' : 'caronas disponíveis'}`}
          </h2>
          <Link
            to="/oferecer"
            className="text-xs font-semibold px-4 py-2 rounded-full bg-white border border-neutral-300 hover:border-black transition-colors"
          >
            + Oferecer minha carona
          </Link>
        </div>

        {!loading && viagens.length === 0 ? (
          <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center space-y-3">
            <Icon name="directions_car" className="text-[40px] text-neutral-400" />
            <h3 className="text-base font-bold text-black">Nenhuma carona encontrada com esses filtros</h3>
            <p className="text-sm text-neutral-500">
              Tente limpar os filtros de data/origem ou cadastre uma nova oferta se estiver dirigindo.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {viagens.map((v) => (
              <div
                key={v.id_viagem}
                className="bg-white border border-neutral-200 rounded-2xl p-6 hover:border-black transition-all flex flex-col justify-between gap-4 shadow-sm"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={v.modalidade_aprovacao} />
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-eco-soft text-eco-dark border border-eco-border">
                        {v.vagas_disponiveis} de {v.vagas_total} vagas livres
                      </span>
                    </div>
                    <span className="text-lg font-extrabold text-black shrink-0">
                      {formatCurrencyBRL(v.valor_rateio)}
                    </span>
                  </div>

                  {/* Itinerário */}
                  <div className="relative pl-5 space-y-2 before:content-[''] before:absolute before:left-[5px] before:top-2 before:bottom-2 before:w-[2px] before:bg-neutral-300">
                    <div className="relative">
                      <span className="absolute -left-5 top-1.5 w-3 h-3 rounded-full bg-black" />
                      <p className="text-xs text-neutral-500">Partida</p>
                      <p className="text-sm font-bold text-black">{v.ponto_partida}</p>
                    </div>
                    {v.paradas && v.paradas.length > 0 && (
                      <div className="text-xs text-neutral-500 pl-1">
                        Paradas: {v.paradas.map((p) => p.descricao_local).join(' • ')}
                      </div>
                    )}
                    <div className="relative">
                      <span className="absolute -left-5 top-1.5 w-3 h-3 bg-black" />
                      <p className="text-xs text-neutral-500">Destino ({v.tipo_destino})</p>
                      <p className="text-sm font-bold text-black">{v.destino_final}</p>
                    </div>
                  </div>

                  {/* Data, veículo e motorista */}
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-neutral-100 text-xs text-neutral-600">
                    <div className="flex items-center gap-1.5">
                      <Icon name="schedule" className="text-[16px] text-black" />
                      <span>{formatDateTimeBR(v.data_horario)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Icon name="directions_car" className="text-[16px] text-black" />
                      <span>
                        {v.veiculo_marca} {v.veiculo_modelo} ({v.veiculo_cor})
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-neutral-100 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-black">{v.motorista_nome}</p>
                    <p className="text-xs text-neutral-500 flex items-center gap-1">
                      <Icon name="star" filled className="text-[14px] text-black" />
                      {v.motorista_reputacao ? v.motorista_reputacao.toFixed(1) : 'Novo'} ({v.motorista_avaliacoes || 0} aval.) • {v.distancia_km} km
                    </p>
                  </div>
                  <Link
                    to={`/caronas/${v.id_viagem}`}
                    className="px-5 py-2.5 rounded-full bg-black text-white text-xs font-semibold hover:bg-neutral-800 transition-colors"
                  >
                    Ver detalhes
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
