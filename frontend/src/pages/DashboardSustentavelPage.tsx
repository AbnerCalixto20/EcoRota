import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth';
import { apiRequest } from '../api';
import type { Destino } from '../api';
import { DestinoSelect, Icon } from '../components/UI';

type EscopoDashboard = 'global' | 'usuario';

interface DimensoesResponse {
  destinos: Destino[];
  tempos: Array<{ id_tempo: number; ano: number; mes: number; nome_mes: string; mes_referencia: string }>;
  turnos: Array<{ id_turno: number; nome_turno: string; hora_inicio: string; hora_fim: string }>;
  parametroAmbiental: { kg_co2_por_km: number; kg_co2_por_arvore: number };
}

interface EvolucaoItem {
  id_tempo: number;
  nome_mes: string;
  mes_referencia: string;
  total_viagens_concluidas: number;
  total_passageiros_transportados: number;
  co2_economizado_kg: number;
}

interface ResumoResponse {
  plataforma: {
    total_viagens_concluidas: number;
    total_passageiros_transportados: number;
    veiculos_individuais_evitados: number;
    km_de_deslocamento_individual_evitados: number;
    estimativa_total_co2_economizado_kg: number;
    equivalencia_arvores: number;
  };
  usuario: {
    total_viagens_realizadas: number;
    total_km_compartilhados: number;
    estimativa_co2_economizado_kg: number;
    equivalencia_arvores: number;
  } | null;
  evolucao_mensal: EvolucaoItem[];
}

interface MultiResponse {
  escopo: EscopoDashboard;
  totais: {
    total_viagens_concluidas: number;
    total_passageiros_transportados: number;
    total_veiculos_individuais_evitados: number;
    km_evitados: number;
    co2_economizado_kg: number;
    equivalencia_arvores: number;
  };
  evolucao_mensal: EvolucaoItem[];
  por_turno: Array<{ id_turno: number; turno: string; viagens: number; passageiros: number; co2_kg: number }>;
  por_destino: Array<{
    id_destino: number;
    nome_destino: string;
    tipo_destino: string;
    viagens: number;
    passageiros: number;
    co2_kg: number;
  }>;
  registros: Array<{
    mes_referencia: string;
    nome_mes: string;
    nome_destino: string;
    tipo_destino: string;
    turno: string;
    total_viagens_concluidas: number;
    total_passageiros_transportados: number;
    total_veiculos_individuais_evitados: number;
    estimativa_total_co2_economizado_kg: number;
  }>;
}

export function DashboardSustentavelPage() {
  const { user } = useAuth();
  const [escopo, setEscopo] = useState<EscopoDashboard>('global');
  const [dimensoes, setDimensoes] = useState<DimensoesResponse | null>(null);
  const [resumo, setResumo] = useState<ResumoResponse | null>(null);
  const [multi, setMulti] = useState<MultiResponse | null>(null);

  const [idTempo, setIdTempo] = useState('');
  const [idDestino, setIdDestino] = useState('');
  const [tipoDestino, setTipoDestino] = useState('');
  const [idTurno, setIdTurno] = useState('');

  useEffect(() => {
    apiRequest<DimensoesResponse>('/destinos/dimensoes').then(setDimensoes).catch(() => {});
    apiRequest<ResumoResponse>('/dashboard/resumo').then(setResumo).catch(() => {});
  }, [user]);

  const loadMulti = useCallback(async () => {
    if (escopo === 'usuario' && !user) {
      setMulti(null);
      return;
    }
    const qs = new URLSearchParams();
    qs.set('escopo', escopo);
    if (idTempo) qs.set('id_tempo', idTempo);
    if (idDestino) qs.set('id_destino', idDestino);
    if (tipoDestino) qs.set('tipo_destino', tipoDestino);
    if (idTurno) qs.set('id_turno', idTurno);
    const data = await apiRequest<MultiResponse>(`/dashboard/multidimensional?${qs.toString()}`);
    setMulti(data);
  }, [escopo, user, idTempo, idDestino, tipoDestino, idTurno]);

  useEffect(() => {
    loadMulti().catch(() => setMulti(null));
  }, [loadMulti]);

  const isUsuario = escopo === 'usuario';
  const evolucaoAtual = multi?.evolucao_mensal || [];
  const maxMonthlyCo2 = Math.max(
    ...(evolucaoAtual.map((m) => m.co2_economizado_kg) || [1]),
    0.1
  );

  const participacaoPercentual =
    resumo?.usuario && resumo.plataforma.estimativa_total_co2_economizado_kg > 0
      ? (
          (resumo.usuario.estimativa_co2_economizado_kg /
            resumo.plataforma.estimativa_total_co2_economizado_kg) *
          100
        ).toFixed(1)
      : '0.0';

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-10 space-y-8">
      {/* Cabeçalho */}
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-eco-dark bg-eco-soft border border-eco-border px-3 py-1 rounded-full">
            <Icon name="eco" className="text-[16px]" />
            ECR010 • Entidade Multidimensional (Esquema Estrela)
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-black tracking-tight">
            Dashboard Sustentável
          </h1>
          <p className="text-sm text-[#5e5e5e]">
            Alterne entre o <strong>impacto global</strong> de toda a comunidade USP e o{' '}
            <strong>seu dashboard individual</strong>, com análise cruzada por Mês, Destino e Turno.
          </p>
        </div>

        {dimensoes?.parametroAmbiental && (
          <div className="bg-white border border-neutral-200 rounded-2xl px-5 py-3 text-xs text-neutral-600">
            <p className="font-bold text-black">Fórmula de Emissão (Parametro_Ambiental)</p>
            <p>
              <code>passageiros × distância_km × {dimensoes.parametroAmbiental.kg_co2_por_km} kg CO₂/km</code> •{' '}
              1 árvore ≈ {dimensoes.parametroAmbiental.kg_co2_por_arvore} kg CO₂/ano
            </p>
          </div>
        )}
      </section>

      {/* Alternador de Visão: Global vs. Individual */}
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex p-1.5 rounded-full bg-[#efefef] border border-neutral-200">
          <button
            type="button"
            onClick={() => setEscopo('global')}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
              escopo === 'global'
                ? 'bg-black text-white shadow-sm'
                : 'text-neutral-600 hover:text-black'
            }`}
          >
            <Icon name="public" className="text-[18px]" />
            Impacto Global do App
          </button>
          <button
            type="button"
            onClick={() => setEscopo('usuario')}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
              escopo === 'usuario'
                ? 'bg-black text-white shadow-sm'
                : 'text-neutral-600 hover:text-black'
            }`}
          >
            <Icon name="person" className="text-[18px]" />
            Meu Dashboard{user ? ` (${user.nome_completo.split(' ')[0]})` : ''}
          </button>
        </div>

        <span className="text-xs text-neutral-500">
          {isUsuario
            ? 'Exibindo apenas as caronas concluídas com a sua participação (motorista ou passageiro).'
            : 'Exibindo o impacto consolidado de todos os usuários do EcoRota USP.'}
        </span>
      </section>

      {/* Card Resumo do Escopo Ativo */}
      {!isUsuario && resumo?.plataforma && (
        <section className="bg-black text-white rounded-3xl p-6 sm:p-8 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-xs uppercase tracking-wider text-neutral-400 font-semibold">
                Impacto Global Acumulado • Todos os Usuários
              </span>
              <h2 className="text-xl font-bold mt-0.5">Comunidade EcoRota USP</h2>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-neutral-900 border border-neutral-700 text-eco">
              View_Impacto_Total_Plataforma
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
              <span className="text-xs text-neutral-400">CO₂ Total Evitado</span>
              <p className="text-2xl font-extrabold mt-1">
                {resumo.plataforma.estimativa_total_co2_economizado_kg.toFixed(2)} kg
              </p>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
              <span className="text-xs text-neutral-400">Árvores Equivalentes</span>
              <p className="text-2xl font-extrabold mt-1">
                {resumo.plataforma.equivalencia_arvores.toFixed(2)}
              </p>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
              <span className="text-xs text-neutral-400">Veículos Evitados</span>
              <p className="text-2xl font-extrabold mt-1">
                {resumo.plataforma.veiculos_individuais_evitados}
              </p>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
              <span className="text-xs text-neutral-400">Viagens / Passageiros</span>
              <p className="text-2xl font-extrabold mt-1">
                {resumo.plataforma.total_viagens_concluidas} /{' '}
                {resumo.plataforma.total_passageiros_transportados}
              </p>
            </div>
          </div>
        </section>
      )}

      {isUsuario && !user && (
        <section className="bg-white border border-neutral-200 rounded-3xl p-8 text-center space-y-4 shadow-sm">
          <Icon name="lock" className="text-[40px] text-neutral-400" />
          <h2 className="text-xl font-bold text-black">Entre com sua conta USP para ver seu impacto</h2>
          <p className="text-sm text-neutral-600 max-w-md mx-auto">
            O dashboard individual reúne apenas as viagens concluídas em que você participou como
            motorista ou passageiro confirmado.
          </p>
          <div className="flex items-center justify-center gap-3 pt-1">
            <Link
              to="/login"
              className="px-6 py-3 rounded-full bg-black text-white text-sm font-semibold hover:bg-neutral-800 transition-colors"
            >
              Fazer login (@usp.br)
            </Link>
            <button
              type="button"
              onClick={() => setEscopo('global')}
              className="px-6 py-3 rounded-full bg-[#efefef] text-black text-sm font-semibold hover:bg-neutral-200 transition-colors"
            >
              Ver Impacto Global
            </button>
          </div>
        </section>
      )}

      {isUsuario && user && resumo?.usuario && (
        <section className="bg-black text-white rounded-3xl p-6 sm:p-8 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-xs uppercase tracking-wider text-neutral-400 font-semibold">
                Seu Impacto Individual ({user.nome_completo})
              </span>
              <h2 className="text-xl font-bold mt-0.5">Participação em Caronas Concluídas</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs px-3 py-1 rounded-full bg-eco/20 border border-eco/40 text-eco font-semibold">
                {participacaoPercentual}% do CO₂ global da USP
              </span>
              <span className="text-xs px-3 py-1 rounded-full bg-neutral-900 border border-neutral-700 text-neutral-300">
                View_Dashboard_Sustentavel_Usuario
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
              <span className="text-xs text-neutral-400">CO₂ Evitado (sua cota)</span>
              <p className="text-2xl font-extrabold mt-1">
                {resumo.usuario.estimativa_co2_economizado_kg.toFixed(2)} kg
              </p>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
              <span className="text-xs text-neutral-400">Árvores Conservadas</span>
              <p className="text-2xl font-extrabold mt-1">
                {resumo.usuario.equivalencia_arvores.toFixed(2)}
              </p>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
              <span className="text-xs text-neutral-400">Km Compartilhados</span>
              <p className="text-2xl font-extrabold mt-1">
                {resumo.usuario.total_km_compartilhados.toFixed(1)} km
              </p>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
              <span className="text-xs text-neutral-400">Suas Viagens Concluídas</span>
              <p className="text-2xl font-extrabold mt-1">{resumo.usuario.total_viagens_realizadas}</p>
            </div>
          </div>
        </section>
      )}

      {/* Análise Multidimensional (exibida para Global ou para Usuário autenticado) */}
      {(!isUsuario || user) && (
        <>
          {/* Filtros Dinâmicos Multidimensionais */}
          <section className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-black flex items-center gap-2">
                <Icon name="tune" /> Filtros Multidimensionais —{' '}
                {isUsuario ? 'Seu Impacto' : 'Impacto Global'}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setIdTempo('');
                  setIdDestino('');
                  setTipoDestino('');
                  setIdTurno('');
                }}
                className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[#efefef] hover:bg-neutral-200"
              >
                Limpar filtros
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase text-neutral-500 mb-1">
                  Mês (Dim_Tempo)
                </label>
                <select
                  value={idTempo}
                  onChange={(e) => setIdTempo(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#f3f3f4] rounded-xl text-sm font-medium focus:bg-white border border-transparent focus:border-black"
                >
                  <option value="">Todos os meses</option>
                  {dimensoes?.tempos.map((t) => (
                    <option key={t.id_tempo} value={t.id_tempo}>
                      {t.nome_mes} / {t.ano} ({t.mes_referencia})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-neutral-500 mb-1">
                  Tipo de Destino
                </label>
                <select
                  value={tipoDestino}
                  onChange={(e) => setTipoDestino(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#f3f3f4] rounded-xl text-sm font-medium focus:bg-white border border-transparent focus:border-black"
                >
                  <option value="">Todos (USP, Metrô SP e Bandejões)</option>
                  <option value="CAMPUS">Somente Unidades / Metrô SP</option>
                  <option value="RESTAURANTE">Somente Restaurantes (Bandejões)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-neutral-500 mb-1">
                  Destino Específico (Dim_Destino)
                </label>
                <div className="w-full px-3.5 py-2.5 bg-[#f3f3f4] rounded-xl border border-transparent focus-within:bg-white focus-within:border-black">
                  <DestinoSelect
                    destinos={dimensoes?.destinos || []}
                    value={idDestino}
                    onChange={setIdDestino}
                    allLabel="Todos os destinos"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-neutral-500 mb-1">
                  Turno (Dim_Turno)
                </label>
                <select
                  value={idTurno}
                  onChange={(e) => setIdTurno(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#f3f3f4] rounded-xl text-sm font-medium focus:bg-white border border-transparent focus:border-black"
                >
                  <option value="">Todos os turnos</option>
                  {dimensoes?.turnos.map((tu) => (
                    <option key={tu.id_turno} value={tu.id_turno}>
                      {tu.nome_turno} ({tu.hora_inicio}–{tu.hora_fim})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* KPIs Filtrados */}
            {multi && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-3">
                <div className="bg-[#f9f9f9] border border-neutral-200 rounded-2xl p-5">
                  <div className="flex items-center justify-between text-neutral-500 mb-2">
                    <span className="text-xs font-semibold">
                      {isUsuario ? 'CO₂ Evitado (sua cota)' : 'CO₂ Evitado'}
                    </span>
                    <Icon name="cloud_off" />
                  </div>
                  <p className="text-3xl font-extrabold text-black">
                    {multi.totais.co2_economizado_kg.toFixed(2)}{' '}
                    <span className="text-base font-bold">kg</span>
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    ≈ {multi.totais.equivalencia_arvores.toFixed(2)} árvores/ano
                  </p>
                </div>

                <div className="bg-[#f9f9f9] border border-neutral-200 rounded-2xl p-5">
                  <div className="flex items-center justify-between text-neutral-500 mb-2">
                    <span className="text-xs font-semibold">
                      {isUsuario ? 'Passageiros nas suas Caronas' : 'Passageiros Transportados'}
                    </span>
                    <Icon name="groups" />
                  </div>
                  <p className="text-3xl font-extrabold text-black">
                    {multi.totais.total_passageiros_transportados}
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    Em {multi.totais.total_viagens_concluidas} viagens concluídas
                  </p>
                </div>

                <div className="bg-[#f9f9f9] border border-neutral-200 rounded-2xl p-5">
                  <div className="flex items-center justify-between text-neutral-500 mb-2">
                    <span className="text-xs font-semibold">Veículos Evitados</span>
                    <Icon name="no_crash" />
                  </div>
                  <p className="text-3xl font-extrabold text-black">
                    {multi.totais.total_veiculos_individuais_evitados}
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    {isUsuario ? 'Nas viagens em que participou' : 'Carros a menos no campus'}
                  </p>
                </div>

                <div className="bg-[#f9f9f9] border border-neutral-200 rounded-2xl p-5">
                  <div className="flex items-center justify-between text-neutral-500 mb-2">
                    <span className="text-xs font-semibold">
                      {isUsuario ? 'Km Compartilhados' : 'Km Individuais Evitados'}
                    </span>
                    <Icon name="route" />
                  </div>
                  <p className="text-3xl font-extrabold text-black">
                    {multi.totais.km_evitados.toFixed(1)}{' '}
                    <span className="text-base font-bold">km</span>
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    {isUsuario ? 'Distância em caronas concluídas' : 'Deslocamento consolidado'}
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* Gráficos de Evolução Mensal & Por Turno */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-white border border-neutral-200 rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-bold text-black">
                Evolução Mensal de CO₂ Evitado (kg){isUsuario ? ' — Sua Cota' : ' — Global'}
              </h2>
              {evolucaoAtual.length ? (
                <div className="space-y-3">
                  {evolucaoAtual.map((m) => (
                    <div key={m.id_tempo} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span>
                          {m.nome_mes} ({m.mes_referencia})
                        </span>
                        <span>
                          {m.co2_economizado_kg.toFixed(2)} kg • {m.total_viagens_concluidas}{' '}
                          viagem(ns)
                        </span>
                      </div>
                      <div className="w-full h-3 rounded-full bg-[#efefef] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-black transition-all"
                          style={{
                            width: `${Math.max(8, (m.co2_economizado_kg / maxMonthlyCo2) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-neutral-500">
                  Nenhuma viagem concluída para os filtros aplicados.
                </p>
              )}
            </div>

            <div className="lg:col-span-5 bg-white border border-neutral-200 rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-bold text-black">
                Distribuição por Turno{isUsuario ? ' (Suas Viagens)' : ''}
              </h2>
              {multi?.por_turno.length ? (
                <div className="space-y-3">
                  {multi.por_turno.map((t) => (
                    <div
                      key={t.id_turno}
                      className="p-4 rounded-xl bg-[#f9f9f9] border border-neutral-200 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-bold text-black">{t.turno}</p>
                        <p className="text-xs text-neutral-500">
                          {t.viagens} viagem(ns) • {t.passageiros} passageiro(s)
                        </p>
                      </div>
                      <span className="text-sm font-extrabold text-eco-dark bg-eco-soft border border-eco-border px-3 py-1 rounded-full">
                        {t.co2_kg.toFixed(2)} kg CO₂
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-neutral-500">Sem registros para a combinação de filtros.</p>
              )}
            </div>
          </section>

          {/* Tabela Analítica Completa */}
          <section className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
              <h2 className="text-base font-bold text-black">
                Detalhamento Multidimensional —{' '}
                {isUsuario ? (
                  <span>Suas Viagens Concluídas</span>
                ) : (
                  <code>View_Dashboard_Sustentavel</code>
                )}
              </h2>
              <span className="text-xs text-neutral-500">{multi?.registros.length || 0} linhas</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f3f3f4] text-neutral-600 font-semibold uppercase">
                  <tr>
                    <th className="px-5 py-3">Mês</th>
                    <th className="px-5 py-3">Destino</th>
                    <th className="px-5 py-3">Tipo</th>
                    <th className="px-5 py-3">Turno</th>
                    <th className="px-5 py-3 text-right">Viagens</th>
                    <th className="px-5 py-3 text-right">Passageiros</th>
                    <th className="px-5 py-3 text-right">
                      {isUsuario ? 'Sua Cota CO₂ (kg)' : 'CO₂ Evitado (kg)'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {multi?.registros.map((r, idx) => (
                    <tr key={idx} className="hover:bg-[#fafafa]">
                      <td className="px-5 py-3 font-medium whitespace-nowrap">{r.mes_referencia}</td>
                      <td className="px-5 py-3 font-semibold text-black">{r.nome_destino}</td>
                      <td className="px-5 py-3">{r.tipo_destino}</td>
                      <td className="px-5 py-3">{r.turno}</td>
                      <td className="px-5 py-3 text-right">{r.total_viagens_concluidas}</td>
                      <td className="px-5 py-3 text-right">{r.total_passageiros_transportados}</td>
                      <td className="px-5 py-3 text-right font-bold text-eco-dark">
                        {r.estimativa_total_co2_economizado_kg.toFixed(3)}
                      </td>
                    </tr>
                  ))}
                  {(!multi || multi.registros.length === 0) && (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-neutral-500">
                        Nenhum fato sustentável encontrado para os filtros aplicados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
