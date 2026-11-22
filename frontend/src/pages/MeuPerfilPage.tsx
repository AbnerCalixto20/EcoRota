import { useEffect, useState } from 'react';
import { useAuth } from '../auth';
import { ApiError, apiRequest } from '../api';
import type { Usuario, Veiculo } from '../api';
import { Icon } from '../components/UI';

export function MeuPerfilPage() {
  const { refreshUser } = useAuth();
  const [perfil, setPerfil] = useState<Usuario | null>(null);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [telefone, setTelefone] = useState('');
  const [bio, setBio] = useState('');
  const [fotoDataUrl, setFotoDataUrl] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [novoVeiculo, setNovoVeiculo] = useState({
    marca: '',
    modelo: '',
    cor: '',
    placa: '',
    ano: 2023,
    capacidade_passageiros: 3,
  });

  const load = async () => {
    const res = await apiRequest<{ perfil: Usuario; veiculos: Veiculo[] }>('/perfil');
    setPerfil(res.perfil);
    setVeiculos(res.veiculos);
    setTelefone(res.perfil.telefone || '');
    setBio(res.perfil.bio || '');
    setFotoDataUrl(res.perfil.foto_data_url || null);
  };

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setFeedback({ type: 'err', text: 'Envie apenas imagens nos formatos JPG ou PNG (ECR015).' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFeedback({ type: 'err', text: 'A imagem deve ter tamanho máximo de 5 MB (ECR015).' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setFotoDataUrl(String(reader.result));
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      const res = await apiRequest<{ message: string }>('/perfil', {
        method: 'PUT',
        body: JSON.stringify({ telefone, bio, foto_data_url: fotoDataUrl }),
      });
      setFeedback({ type: 'ok', text: res.message });
      await load();
      await refreshUser();
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof ApiError ? err.message : 'Erro ao atualizar perfil.',
      });
    }
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      const res = await apiRequest<{ message: string }>('/veiculos', {
        method: 'POST',
        body: JSON.stringify(novoVeiculo),
      });
      setFeedback({ type: 'ok', text: res.message });
      setNovoVeiculo({ marca: '', modelo: '', cor: '', placa: '', ano: 2023, capacidade_passageiros: 3 });
      await load();
      await refreshUser();
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof ApiError ? err.message : 'Erro ao cadastrar veículo.',
      });
    }
  };

  const handleDeleteVehicle = async (id: number) => {
    setFeedback(null);
    try {
      const res = await apiRequest<{ message: string }>(`/veiculos/${id}`, { method: 'DELETE' });
      setFeedback({ type: 'ok', text: res.message });
      await load();
      await refreshUser();
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof ApiError ? err.message : 'Erro ao remover veículo.',
      });
    }
  };

  if (!perfil) {
    return (
      <div className="max-w-[1100px] mx-auto px-6 py-16 text-sm text-neutral-500">
        Carregando perfil...
      </div>
    );
  }

  return (
    <div className="max-w-[1100px] mx-auto px-6 py-10 space-y-8">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          ECR015 • Gerenciar Perfil e Veículos
        </span>
        <h1 className="text-3xl font-extrabold tracking-tight text-black mt-1">Meu Perfil</h1>
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Dados Pessoais */}
        <form
          onSubmit={handleSaveProfile}
          className="lg:col-span-7 bg-white border border-neutral-200 rounded-2xl p-6 sm:p-8 space-y-5 shadow-sm"
        >
          <div className="flex items-center gap-4">
            {fotoDataUrl ? (
              <img
                src={fotoDataUrl}
                alt={perfil.nome_completo}
                className="w-16 h-16 rounded-full object-cover border border-neutral-300"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-black text-white flex items-center justify-center text-xl font-bold">
                {perfil.nome_completo.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-black">{perfil.nome_completo}</h2>
              <p className="text-xs text-neutral-500">
                Reputação comunitária: ★ {perfil.reputacao ? perfil.reputacao.toFixed(1) : 'Sem avaliações'} (
                {perfil.quantidade_avaliacoes} avaliações)
              </p>
              <label className="mt-2 inline-block text-xs font-semibold underline cursor-pointer">
                Alterar foto (JPG/PNG até 5 MB)
                <input type="file" accept="image/jpeg,image/png" onChange={handlePhotoSelect} className="hidden" />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-neutral-100">
            <div>
              <label className="block text-xs font-semibold text-neutral-500 mb-1">
                Número USP (NUSP — bloqueado)
              </label>
              <input
                type="text"
                value={perfil.nusp}
                disabled
                className="w-full px-4 py-3 bg-neutral-100 text-neutral-500 rounded-xl text-sm cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-500 mb-1">
                E-mail institucional (bloqueado)
              </label>
              <input
                type="text"
                value={perfil.email_institucional}
                disabled
                className="w-full px-4 py-3 bg-neutral-100 text-neutral-500 rounded-xl text-sm cursor-not-allowed"
              />
            </div>
          </div>

          <p className="text-[11px] text-neutral-500">
            NUSP e E-mail institucional dependem de validação institucional via suporte e não podem ser
            editados diretamente (regra ECR015).
          </p>

          <div>
            <label className="block text-xs font-semibold text-black mb-1">Telefone de contato</label>
            <input
              type="tel"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(11) 99999-0000"
              className="w-full px-4 py-3 bg-[#f3f3f4] rounded-xl text-sm focus:bg-white border border-transparent focus:border-black focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-black mb-1">Biografia</label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Fale sobre seu curso, instituto e rotina de deslocamento na USP..."
              className="w-full px-4 py-3 bg-[#f3f3f4] rounded-xl text-sm focus:bg-white border border-transparent focus:border-black focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="px-6 py-3 rounded-full bg-black text-white text-sm font-semibold hover:bg-neutral-800"
          >
            Salvar Alterações
          </button>
        </form>

        {/* Gestão de Veículos (para atuar como Motorista em ECR007) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-4 shadow-sm">
            <h2 className="text-lg font-bold text-black flex items-center gap-2">
              <Icon name="directions_car" /> Meus Veículos ({veiculos.length})
            </h2>
            {veiculos.length === 0 ? (
              <p className="text-xs text-neutral-500">
                Nenhum veículo cadastrado. Cadastre um abaixo para poder oferecer caronas.
              </p>
            ) : (
              <div className="space-y-2.5">
                {veiculos.map((v) => (
                  <div
                    key={v.id_veiculo}
                    className="p-3.5 rounded-xl bg-[#f9f9f9] border border-neutral-200 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-bold text-black">
                        {v.marca} {v.modelo} ({v.cor || '—'})
                      </p>
                      <p className="text-xs text-neutral-500">
                        Placa <strong className="font-mono">{v.placa}</strong> • {v.capacidade_passageiros} vagas
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteVehicle(v.id_veiculo)}
                      className="text-xs font-semibold text-red-600 hover:underline"
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleAddVehicle} className="pt-4 border-t border-neutral-100 space-y-3">
              <p className="text-xs font-bold uppercase text-neutral-500">Adicionar Novo Veículo</p>
              <div className="grid grid-cols-2 gap-2.5">
                <input
                  type="text"
                  required
                  placeholder="Marca (ex: Honda)"
                  value={novoVeiculo.marca}
                  onChange={(e) => setNovoVeiculo({ ...novoVeiculo, marca: e.target.value })}
                  className="px-3 py-2.5 bg-[#f3f3f4] rounded-xl text-xs"
                />
                <input
                  type="text"
                  required
                  placeholder="Modelo (ex: Fit)"
                  value={novoVeiculo.modelo}
                  onChange={(e) => setNovoVeiculo({ ...novoVeiculo, modelo: e.target.value })}
                  className="px-3 py-2.5 bg-[#f3f3f4] rounded-xl text-xs"
                />
                <input
                  type="text"
                  placeholder="Cor (ex: Preto)"
                  value={novoVeiculo.cor}
                  onChange={(e) => setNovoVeiculo({ ...novoVeiculo, cor: e.target.value })}
                  className="px-3 py-2.5 bg-[#f3f3f4] rounded-xl text-xs"
                />
                <input
                  type="text"
                  required
                  placeholder="Placa (ex: USP3C03)"
                  value={novoVeiculo.placa}
                  onChange={(e) => setNovoVeiculo({ ...novoVeiculo, placa: e.target.value })}
                  className="px-3 py-2.5 bg-[#f3f3f4] rounded-xl text-xs uppercase font-mono"
                />
                <input
                  type="number"
                  placeholder="Ano"
                  value={novoVeiculo.ano}
                  onChange={(e) => setNovoVeiculo({ ...novoVeiculo, ano: Number(e.target.value) })}
                  className="px-3 py-2.5 bg-[#f3f3f4] rounded-xl text-xs"
                />
                <input
                  type="number"
                  min={1}
                  max={8}
                  placeholder="Vagas"
                  value={novoVeiculo.capacidade_passageiros}
                  onChange={(e) =>
                    setNovoVeiculo({ ...novoVeiculo, capacidade_passageiros: Number(e.target.value) })
                  }
                  className="px-3 py-2.5 bg-[#f3f3f4] rounded-xl text-xs"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-full bg-black text-white text-xs font-semibold hover:bg-neutral-800"
              >
                Cadastrar Veículo
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
