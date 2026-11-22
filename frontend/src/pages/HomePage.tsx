import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api';
import type { Destino } from '../api';
import { DestinoSelect, Icon } from '../components/UI';

interface ImpactoResumo {
  plataforma: {
    total_viagens_concluidas: number;
    total_passageiros_transportados: number;
    veiculos_individuais_evitados: number;
    estimativa_total_co2_economizado_kg: number;
    equivalencia_arvores: number;
  };
}

export function HomePage() {
  const navigate = useNavigate();
  const [idOrigem, setIdOrigem] = useState('');
  const [idDestino, setIdDestino] = useState('');
  const [destinos, setDestinos] = useState<Destino[]>([]);
  const [impacto, setImpacto] = useState<ImpactoResumo['plataforma'] | null>(null);

  useEffect(() => {
    apiRequest<{ destinos: Destino[] }>('/destinos')
      .then((d) => setDestinos(d.destinos))
      .catch(() => {});
    apiRequest<ImpactoResumo>('/dashboard/resumo')
      .then((r) => setImpacto(r.plataforma))
      .catch(() => {});
  }, []);

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const qs = new URLSearchParams();
    if (idOrigem) qs.set('id_origem', idOrigem);
    if (idDestino) qs.set('id_destino', idDestino);
    navigate(`/caronas?${qs.toString()}`);
  };

  const features = [
    {
      title: 'Carona Imediata',
      desc: 'Vá para qualquer instituto ou estação do metrô com aprovação automática ou manual.',
      icon: 'directions_car',
      to: '/caronas',
    },
    {
      title: 'Oferecer Vagas',
      desc: 'Cadastre seu veículo e compartilhe assentos vazios com rateio solidário justo.',
      icon: 'add_road',
      to: '/oferecer',
    },
    {
      title: 'Caronas para os Bandejões',
      desc: 'Rotas rápidas nos horários de almoço e jantar para Central, Física, Química e PCO.',
      icon: 'restaurant',
      to: '/caronas?destino=Bandej%C3%A3o',
    },
    {
      title: 'Dashboard Sustentável',
      desc: 'Análise multidimensional por mês, destino e turno do CO₂ evitado no campus.',
      icon: 'eco',
      to: '/impacto',
    },
    {
      title: 'Chat Interativo',
      desc: 'Comunicação em tempo real via WebSocket para combinar pontos de encontro com segurança.',
      icon: 'chat',
      to: '/minhas-viagens',
    },
    {
      title: 'Comunidade @usp.br',
      desc: 'Acesso validado por NUSP e reputação mútua pós-viagem entre motoristas e passageiros.',
      icon: 'verified_user',
      to: '/sobre',
    },
  ];

  return (
    <div className="bg-white">
      {/* HERO SECTION (Uber-inspired clean high-contrast) */}
      <section className="w-full border-b border-neutral-200 bg-white">
        <div className="max-w-[1240px] mx-auto px-6 py-14 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 bg-eco-soft border border-eco-border text-eco-dark px-3 py-1 rounded-full text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-eco" />
              {import.meta.env.VITE_PUBLIC_DEMO === 'true' ? 'Projeto acadêmico de demonstração • Não oficial' : 'Rede Oficial de Caronas Solidárias • USP Butantã'}
            </div>

            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-black leading-[1.12]">
              Vá a qualquer lugar na USP compartilhando rotas
            </h1>

            <p className="text-base sm:text-lg text-[#5e5e5e] leading-relaxed">
              Conectamos assentos vazios de veículos que já circulam pelo campus a estudantes que
              precisam do mesmo trajeto — menos trânsito, menor custo e menos CO₂.
            </p>

            {/* Quick Search Card */}
            <form
              onSubmit={handleQuickSearch}
              className="bg-[#f9f9f9] border border-neutral-200 rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm"
            >
              <div className="flex items-center gap-3 bg-white border border-neutral-200 rounded-xl px-3.5 py-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-black shrink-0" />
                <DestinoSelect
                  destinos={destinos}
                  value={idOrigem}
                  excludeId={idDestino}
                  onChange={(val) => {
                    setIdOrigem(val);
                    if (val && val === idDestino) setIdDestino('');
                  }}
                  allLabel="Ponto de partida (qualquer unidade USP, metrô ou bandejão)"
                  className="w-full min-w-0"
                />
              </div>

              <div className="flex items-center gap-3 bg-white border border-neutral-200 rounded-xl px-3.5 py-2.5">
                <span className="w-2.5 h-2.5 bg-black shrink-0" />
                <DestinoSelect
                  destinos={destinos}
                  value={idDestino}
                  excludeId={idOrigem}
                  onChange={(val) => {
                    setIdDestino(val);
                    if (val && val === idOrigem) setIdOrigem('');
                  }}
                  allLabel="Destino (qualquer unidade USP, metrô ou bandejão)"
                  className="w-full min-w-0"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="submit"
                  className="px-6 py-3 rounded-full bg-black text-white text-sm font-semibold hover:bg-neutral-800 transition-colors"
                >
                  Procurar caronas
                </button>
                <Link
                  to="/oferecer"
                  className="px-6 py-3 rounded-full bg-[#efefef] text-black text-sm font-semibold hover:bg-[#e2e2e2] transition-colors"
                >
                  Oferecer carona
                </Link>
              </div>
            </form>
          </div>

          {/* Right Panel: Live Sustainability Impact Card */}
          <div className="lg:col-span-6">
            <div className="bg-black text-white rounded-3xl p-8 sm:p-10 space-y-8 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                    Impacto Real do Banco EcoRota
                  </span>
                  <h2 className="text-2xl font-bold mt-1">Descarbonização no Campus</h2>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-eco">
                  <Icon name="eco" className="text-[28px]" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
                  <p className="text-xs text-neutral-400">CO₂ Evitado</p>
                  <p className="text-3xl font-extrabold mt-1">
                    {impacto ? `${impacto.estimativa_total_co2_economizado_kg} kg` : '...'}
                  </p>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
                  <p className="text-xs text-neutral-400">Veículos Evitados</p>
                  <p className="text-3xl font-extrabold mt-1">
                    {impacto ? impacto.veiculos_individuais_evitados : '...'}
                  </p>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
                  <p className="text-xs text-neutral-400">Caronas Concluídas</p>
                  <p className="text-3xl font-extrabold mt-1">
                    {impacto ? impacto.total_viagens_concluidas : '...'}
                  </p>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
                  <p className="text-xs text-neutral-400">Passageiros Transportados</p>
                  <p className="text-3xl font-extrabold mt-1">
                    {impacto ? impacto.total_passageiros_transportados : '...'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
                <p className="text-xs text-neutral-400">
                  Alimentado pelo Esquema Estrela (<code className="text-neutral-200">Fato_Dashboard_Sustentavel</code>)
                </p>
                <Link
                  to="/impacto"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-black text-xs font-semibold hover:bg-neutral-200 transition-colors"
                >
                  Ver Dashboard
                  <Icon name="arrow_forward" className="text-[16px]" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES GRID (Descubra o que você pode fazer com o EcoRota) */}
      <section className="w-full bg-[#f9f9f9] py-16 border-b border-neutral-200">
        <div className="max-w-[1240px] mx-auto px-6">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-black mb-8 tracking-tight">
            Descubra o que você pode fazer com o EcoRota
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-white border border-neutral-200 rounded-2xl p-5 flex items-center justify-between gap-4 hover:border-neutral-300 hover:shadow-md transition-all"
              >
                <div className="flex flex-col gap-2">
                  <h3 className="text-base font-bold text-black">{f.title}</h3>
                  <p className="text-xs text-neutral-600 leading-relaxed">{f.desc}</p>
                  <Link
                    to={f.to}
                    className="mt-2 bg-black text-white text-xs font-semibold px-4 py-1.5 rounded-full w-fit hover:bg-neutral-800 transition-colors"
                  >
                    Acessar
                  </Link>
                </div>
                <div className="w-16 h-16 bg-neutral-100 rounded-xl flex items-center justify-center shrink-0">
                  <Icon name={f.icon} className="text-[36px] text-black" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA (3 Passos) */}
      <section className="w-full bg-white py-16">
        <div className="max-w-[1240px] mx-auto px-6">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-black mb-8 tracking-tight">
            Como funciona o ciclo da carona
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: '1',
                icon: 'pin_drop',
                title: 'Valide seu vínculo USP',
                text: 'Cadastre-se com seu NUSP e e-mail @usp.br. Alterne livremente entre Passageiro e Motorista.',
              },
              {
                step: '2',
                icon: 'commute',
                title: 'Reserve ou publique rotas',
                text: 'Encontre rotas por origem, instituto ou bandejão, combine detalhes pelo chat em tempo real e divida apenas os custos operacionais.',
              },
              {
                step: '3',
                icon: 'eco',
                title: 'Conclua, avalie e meça o impacto',
                text: 'Ao finalizar a corrida, todos se avaliam e o banco calcula automaticamente o CO₂ evitado no Dashboard Sustentável.',
              },
            ].map((s) => (
              <div key={s.step} className="bg-[#f9f9f9] border border-neutral-200 rounded-2xl p-6 space-y-3">
                <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center">
                  <Icon name={s.icon} className="text-[20px]" />
                </div>
                <h3 className="text-lg font-bold text-black">{s.title}</h3>
                <p className="text-sm text-neutral-600 leading-relaxed">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
