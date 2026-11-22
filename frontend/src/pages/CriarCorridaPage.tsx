import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError, apiRequest } from '../api';
import type { Destino, Veiculo } from '../api';
import { DestinoSelect, Icon } from '../components/UI';

function estimarDistanciaKm(a?: Destino | null, b?: Destino | null): number | null {
  if (!a || !b || a.latitude == null || a.longitude == null || b.latitude == null || b.longitude == null) {
    return null;
  }
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * sinLng * sinLng;
  const linhaReta = 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return Number(Math.max(1.0, linhaReta * 1.35).toFixed(1));
}

export function CriarCorridaPage() {
  const navigate = useNavigate();
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [destinos, setDestinos] = useState<Destino[]>([]);
  const [loadingInit, setLoadingInit] = useState(true);

  const [form, setForm] = useState({
    id_veiculo: '',
    id_origem: '',
    id_parada: '',
    id_destino: '',
    data: '2026-11-25',
    hora_saida: '07:45',
    hora_chegada: '08:20',
    vagas_total: 3,
    modalidade_aprovacao: 'AUTOMATICA',
    custo_combustivel_previsto: 16,
    custo_pedagio_previsto: 0,
    valor_rateio: 4,
    distancia_km: 4.5,
  });

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      apiRequest<{ veiculos: Veiculo[] }>('/veiculos'),
      apiRequest<{ destinos: Destino[] }>('/destinos'),
    ])
      .then(([vRes, dRes]) => {
        setVeiculos(vRes.veiculos);
        setDestinos(dRes.destinos);
        const defaultOrigem =
          dRes.destinos.find((d) => d.nome_destino === 'Metrô Butantã') || dRes.destinos[0];
        const defaultDestino =
          dRes.destinos.find(
            (d) =>
              d.nome_destino === 'Escola Politécnica (Poli)' &&
              d.id_destino !== defaultOrigem?.id_destino
          ) || dRes.destinos.find((d) => d.id_destino !== defaultOrigem?.id_destino);
        const est = estimarDistanciaKm(defaultOrigem, defaultDestino);

        setForm((prev) => ({
          ...prev,
          id_veiculo: vRes.veiculos[0] ? String(vRes.veiculos[0].id_veiculo) : '',
          vagas_total: vRes.veiculos[0] ? Math.min(3, vRes.veiculos[0].capacidade_passageiros) : 1,
          id_origem: defaultOrigem ? String(defaultOrigem.id_destino) : '',
          id_destino: defaultDestino ? String(defaultDestino.id_destino) : '',
          distancia_km: est ?? prev.distancia_km,
        }));
      })
      .finally(() => setLoadingInit(false));
  }, []);

  const selectedVehicle = useMemo(
    () => veiculos.find((v) => String(v.id_veiculo) === form.id_veiculo),
    [veiculos, form.id_veiculo]
  );

  const selectedOrigem = useMemo(
    () => destinos.find((d) => String(d.id_destino) === form.id_origem) || null,
    [destinos, form.id_origem]
  );

  const selectedParada = useMemo(
    () => destinos.find((d) => String(d.id_destino) === form.id_parada) || null,
    [destinos, form.id_parada]
  );

  const selectedDestino = useMemo(
    () => destinos.find((d) => String(d.id_destino) === form.id_destino) || null,
    [destinos, form.id_destino]
  );

  const atualizarRota = (novoIdOrigem: string, novoIdDestino: string, novoIdParada = form.id_parada) => {
    const paradaLimpa =
      novoIdParada && novoIdParada !== novoIdOrigem && novoIdParada !== novoIdDestino
        ? novoIdParada
        : '';
    const orig = destinos.find((d) => String(d.id_destino) === novoIdOrigem);
    const parada = destinos.find((d) => String(d.id_destino) === paradaLimpa);
    const dest = destinos.find((d) => String(d.id_destino) === novoIdDestino);

    let est: number | null = null;
    if (orig && parada && dest) {
      const d1 = estimarDistanciaKm(orig, parada);
      const d2 = estimarDistanciaKm(parada, dest);
      if (d1 !== null && d2 !== null) est = Number((d1 + d2).toFixed(1));
    } else {
      est = estimarDistanciaKm(orig, dest);
    }

    setForm((prev) => ({
      ...prev,
      id_origem: novoIdOrigem,
      id_parada: paradaLimpa,
      id_destino: novoIdDestino,
      distancia_km: est ?? prev.distancia_km,
    }));
  };

  const maxRateioSolidario = useMemo(() => {
    const total = Number(form.custo_combustivel_previsto || 0) + Number(form.custo_pedagio_previsto || 0);
    return Number((total / (Number(form.vagas_total || 1) + 1)).toFixed(2));
  }, [form.custo_combustivel_previsto, form.custo_pedagio_previsto, form.vagas_total]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.id_origem || !form.id_destino) {
      setError('Selecione o ponto de partida e o destino.');
      return;
    }
    if (form.id_origem === form.id_destino) {
      setError('O ponto de partida e o destino não podem ser o mesmo local.');
      return;
    }
    if (form.id_parada && (form.id_parada === form.id_origem || form.id_parada === form.id_destino)) {
      setError('A parada intermediária não pode ser igual ao ponto de partida ou ao destino.');
      return;
    }
    setSubmitting(true);
    try {
      const paradas = selectedParada
        ? [
            {
              id_destino: selectedParada.id_destino,
              descricao_local: selectedParada.nome_destino,
              latitude: selectedParada.latitude ?? undefined,
              longitude: selectedParada.longitude ?? undefined,
            },
          ]
        : [];

      const res = await apiRequest<{ viagem: { id_viagem: number } }>('/viagens', {
        method: 'POST',
        body: JSON.stringify({
          id_veiculo: Number(form.id_veiculo),
          id_origem: Number(form.id_origem),
          ponto_partida: selectedOrigem?.nome_destino || '',
          latitude_partida: selectedOrigem?.latitude ?? undefined,
          longitude_partida: selectedOrigem?.longitude ?? undefined,
          id_destino: Number(form.id_destino),
          data_horario: `${form.data} ${form.hora_saida}:00`,
          previsao_chegada: `${form.data} ${form.hora_chegada}:00`,
          vagas_total: Number(form.vagas_total),
          modalidade_aprovacao: form.modalidade_aprovacao,
          custo_combustivel_previsto: Number(form.custo_combustivel_previsto),
          custo_pedagio_previsto: Number(form.custo_pedagio_previsto),
          valor_rateio: Number(form.valor_rateio),
          distancia_km: Number(form.distancia_km),
          paradas,
        }),
      });
      navigate(`/caronas/${res.viagem.id_viagem}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao publicar corrida.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInit) {
    return (
      <div className="max-w-[1100px] mx-auto px-6 py-16 text-sm text-neutral-500">
        Carregando seus veículos e destinos USP...
      </div>
    );
  }

  return (
    <div className="max-w-[1140px] mx-auto px-6 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">
          <span>Módulo de Condutores</span>
          <span>•</span>
          <span>ECR007</span>
          <span>•</span>
          <span className="text-eco-dark bg-eco-soft px-2 py-0.5 rounded-full border border-eco-border">
            Rateio Solidário
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-black">
          Criar corrida solidária
        </h1>
        <p className="text-sm text-neutral-600 mt-1 max-w-2xl">
          Disponibilize os assentos vazios do seu trajeto para a comunidade USP. O valor de rateio é
          limitado estritamente à divisão de combustível e pedágio.
        </p>
      </div>

      {veiculos.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-2xl p-8 text-center space-y-4">
          <Icon name="directions_car" className="text-[44px] text-neutral-400" />
          <h2 className="text-lg font-bold text-black">Você precisa cadastrar um veículo primeiro</h2>
          <p className="text-sm text-neutral-600 max-w-md mx-auto">
            Conforme a pré-condição do caso de uso ECR007, para publicar uma carona é necessário
            possuir pelo menos um veículo ativo cadastrado em seu perfil.
          </p>
          <Link
            to="/perfil"
            className="inline-flex px-6 py-3 rounded-full bg-black text-white text-sm font-semibold hover:bg-neutral-800"
          >
            Cadastrar Veículo no Meu Perfil
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <form
            onSubmit={handleSubmit}
            className="lg:col-span-8 bg-white border border-neutral-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6"
          >
            {error && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-700">
                {error}
              </div>
            )}

            {/* Itinerário */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-black flex items-center gap-2">
                <Icon name="navigation" /> Itinerário da viagem
              </h2>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold uppercase text-neutral-600">
                    Ponto de Partida (USP / Metrô SP / Bandejão) *
                  </label>
                  <button
                    type="button"
                    onClick={() => atualizarRota(form.id_destino, form.id_origem)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-500 hover:text-black transition-colors"
                  >
                    <Icon name="swap_vert" className="text-[16px]" />
                    Inverter partida e destino
                  </button>
                </div>
                <div className="w-full px-4 py-3 bg-[#f3f3f4] rounded-xl border border-transparent focus-within:bg-white focus-within:border-black">
                  <DestinoSelect
                    destinos={destinos}
                    value={form.id_origem}
                    excludeIds={[form.id_destino, form.id_parada]}
                    onChange={(val) => atualizarRota(val, val === form.id_destino ? '' : form.id_destino)}
                    allowAll={false}
                    placeholder="Pesquisar e selecionar ponto de partida..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-neutral-600 mb-1">
                  Parada Intermediária (Opcional — USP / Metrô SP / Bandejão)
                </label>
                <div className="w-full px-4 py-3 bg-[#f3f3f4] rounded-xl border border-transparent focus-within:bg-white focus-within:border-black">
                  <DestinoSelect
                    destinos={destinos}
                    value={form.id_parada}
                    excludeIds={[form.id_origem, form.id_destino]}
                    onChange={(val) => atualizarRota(form.id_origem, form.id_destino, val)}
                    allowAll={true}
                    allLabel="Nenhuma parada intermediária"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase text-neutral-600 mb-1">
                    Destino (USP / Metrô SP / Bandejão) *
                  </label>
                  <div className="w-full px-4 py-3 bg-[#f3f3f4] rounded-xl border border-transparent focus-within:bg-white focus-within:border-black">
                    <DestinoSelect
                      destinos={destinos}
                      value={form.id_destino}
                      excludeIds={[form.id_origem, form.id_parada]}
                      onChange={(val) => atualizarRota(val === form.id_origem ? '' : form.id_origem, val)}
                      allowAll={false}
                      placeholder="Pesquisar e selecionar destino (USP ou Metrô SP)..."
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-neutral-600 mb-1">
                    Distância (km)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    value={form.distancia_km}
                    onChange={(e) => setForm({ ...form, distancia_km: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-[#f3f3f4] rounded-xl text-sm font-medium focus:bg-white border border-transparent focus:border-black focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Data e Horário */}
            <div className="pt-5 border-t border-neutral-200 space-y-4">
              <h2 className="text-lg font-bold text-black flex items-center gap-2">
                <Icon name="schedule" /> Data e Horário
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-neutral-600 mb-1">Data *</label>
                  <input
                    type="date"
                    required
                    value={form.data}
                    onChange={(e) => setForm({ ...form, data: e.target.value })}
                    className="w-full px-4 py-3 bg-[#f3f3f4] rounded-xl text-sm font-medium focus:bg-white border border-transparent focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-neutral-600 mb-1">Saída *</label>
                  <input
                    type="time"
                    required
                    value={form.hora_saida}
                    onChange={(e) => setForm({ ...form, hora_saida: e.target.value })}
                    className="w-full px-4 py-3 bg-[#f3f3f4] rounded-xl text-sm font-medium focus:bg-white border border-transparent focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-neutral-600 mb-1">Previsão Chegada *</label>
                  <input
                    type="time"
                    required
                    value={form.hora_chegada}
                    onChange={(e) => setForm({ ...form, hora_chegada: e.target.value })}
                    className="w-full px-4 py-3 bg-[#f3f3f4] rounded-xl text-sm font-medium focus:bg-white border border-transparent focus:border-black focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Veículo, Vagas e Modalidade */}
            <div className="pt-5 border-t border-neutral-200 space-y-4">
              <h2 className="text-lg font-bold text-black flex items-center gap-2">
                <Icon name="directions_car" /> Veículo, Vagas e Aprovação
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-neutral-600 mb-1">Veículo *</label>
                  <select
                    required
                    value={form.id_veiculo}
                    onChange={(e) => setForm({ ...form, id_veiculo: e.target.value })}
                    className="w-full px-4 py-3 bg-[#f3f3f4] rounded-xl text-sm font-medium focus:bg-white border border-transparent focus:border-black focus:outline-none"
                  >
                    {veiculos.map((v) => (
                      <option key={v.id_veiculo} value={v.id_veiculo}>
                        {v.marca} {v.modelo} ({v.placa})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-neutral-600 mb-1">
                    Vagas (máx. {selectedVehicle?.capacidade_passageiros || 4})
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={selectedVehicle?.capacidade_passageiros || 4}
                    value={form.vagas_total}
                    onChange={(e) => setForm({ ...form, vagas_total: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-[#f3f3f4] rounded-xl text-sm font-medium focus:bg-white border border-transparent focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-neutral-600 mb-1">
                    Aprovação
                  </label>
                  <select
                    value={form.modalidade_aprovacao}
                    onChange={(e) => setForm({ ...form, modalidade_aprovacao: e.target.value })}
                    className="w-full px-4 py-3 bg-[#f3f3f4] rounded-xl text-sm font-medium focus:bg-white border border-transparent focus:border-black focus:outline-none"
                  >
                    <option value="AUTOMATICA">Automática (instantânea)</option>
                    <option value="MANUAL">Manual (aprovar no painel)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Rateio Solidário */}
            <div className="pt-5 border-t border-neutral-200 space-y-4">
              <h2 className="text-lg font-bold text-black flex items-center gap-2">
                <Icon name="payments" /> Rateio Solidário de Custos
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-neutral-600 mb-1">
                    Combustível previsto (R$)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={form.custo_combustivel_previsto}
                    onChange={(e) =>
                      setForm({ ...form, custo_combustivel_previsto: Number(e.target.value) })
                    }
                    className="w-full px-4 py-3 bg-[#f3f3f4] rounded-xl text-sm font-medium focus:bg-white border border-transparent focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-neutral-600 mb-1">
                    Pedágio previsto (R$)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={form.custo_pedagio_previsto}
                    onChange={(e) =>
                      setForm({ ...form, custo_pedagio_previsto: Number(e.target.value) })
                    }
                    className="w-full px-4 py-3 bg-[#f3f3f4] rounded-xl text-sm font-medium focus:bg-white border border-transparent focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-neutral-600 mb-1">
                    Rateio por vaga (máx. R$ {maxRateioSolidario.toFixed(2)})
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max={maxRateioSolidario}
                    value={form.valor_rateio}
                    onChange={(e) => setForm({ ...form, valor_rateio: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-[#f3f3f4] rounded-xl text-sm font-medium focus:bg-white border border-transparent focus:border-black focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 rounded-full bg-black text-white text-sm font-semibold hover:bg-neutral-800 disabled:opacity-60 transition-colors"
            >
              {submitting ? 'Publicando carona...' : 'Confirmar e Publicar Corrida'}
            </button>
          </form>

          {/* Painel Lateral de Impacto Estimado */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-black text-white rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-eco">
                <Icon name="eco" />
                <span className="text-xs font-semibold uppercase tracking-wider">Estimativa Ambiental</span>
              </div>
              {selectedOrigem && selectedDestino && (
                <p className="text-xs text-neutral-300 border-l-2 border-eco pl-3">
                  {selectedOrigem.nome_destino}
                  {selectedParada ? ` → ${selectedParada.nome_destino}` : ''}
                  {` → ${selectedDestino.nome_destino}`}
                </p>
              )}
              <h3 className="text-xl font-bold">
                Até {(form.distancia_km * form.vagas_total * 0.12).toFixed(2)} kg de CO₂ evitados
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Com {form.vagas_total} passageiros confirmados em um trajeto de {form.distancia_km} km,
                esta corrida retira {form.vagas_total} veículos individuais das vias internas da USP.
              </p>
            </div>

            <div className="bg-white border border-neutral-200 rounded-2xl p-6 text-xs text-neutral-600 space-y-2">
              <p className="font-bold text-black text-sm">Validações Automáticas do Banco</p>
              <p>• Conflito de agenda bloqueado por trigger (<code>trg_viagem_validar_inclusao</code>).</p>
              <p>• Vagas nunca excedem a capacidade do veículo selecionado.</p>
              <p>• Teto solidário garantido em nível de constraint SQLite.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
