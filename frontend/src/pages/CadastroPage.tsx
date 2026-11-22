import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError, apiRequest } from '../api';

export function CadastroPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nome_completo: '',
    nusp: '',
    email_institucional: '',
    telefone: '',
    senha: '',
    termos_aceitos: false,
  });
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [activationToken, setActivationToken] = useState('');
  const [activating, setActivating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      const res = await apiRequest<{
        message: string;
        dev_activation_token?: string;
      }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setSuccessMsg(res.message);
      if (res.dev_activation_token) {
        setActivationToken(res.dev_activation_token);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao criar conta.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleActivate = async () => {
    if (!activationToken.trim()) return;
    setActivating(true);
    setError('');
    try {
      const res = await apiRequest<{ message: string }>('/auth/activate', {
        method: 'POST',
        body: JSON.stringify({ token: activationToken }),
      });
      setSuccessMsg(res.message);
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao ativar conta.');
    } finally {
      setActivating(false);
    }
  };

  if (import.meta.env.VITE_PUBLIC_DEMO === 'true') {
    return <div className="max-w-xl mx-auto p-10 text-center space-y-4">
      <h1 className="text-2xl font-bold">Demonstração pública</h1>
      <p>O cadastro está desabilitado nesta demonstração acadêmica. Utilize uma das contas fictícias disponíveis na tela de login.</p>
      <Link className="font-semibold underline" to="/login">Ir para o login de demonstração</Link>
    </div>;
  }

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center px-4 py-12 bg-white">
      <div className="w-full max-w-[520px] bg-[#f8f8f9] border border-[#e6e6e6] rounded-2xl p-6 sm:p-10 shadow-sm">
        <div className="mb-6">
          <span className="text-[11px] font-semibold tracking-wider text-[#5e5e5e] uppercase font-mono">
            ECR001 • Cadastro Institucional
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-black mt-1">Criar sua conta</h1>
          <p className="mt-2 text-sm text-[#5e5e5e]">
            Valide seu vínculo ativo na USP utilizando seu NUSP e e-mail <strong>@usp.br</strong>.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-700">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-5 p-4 rounded-xl bg-eco-soft border border-eco-border text-xs text-eco-dark space-y-3">
            <p className="font-semibold">{successMsg}</p>
            {activationToken && (
              <div className="space-y-2 pt-2 border-t border-eco-border">
                <p className="text-[11px]">
                  Modo desenvolvimento — token gerado em <code>Token_Usuario</code>:
                </p>
                <input
                  type="text"
                  value={activationToken}
                  onChange={(e) => setActivationToken(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-eco-border rounded-lg font-mono text-xs text-black"
                />
                <button
                  type="button"
                  onClick={handleActivate}
                  disabled={activating}
                  className="px-4 py-2 rounded-full bg-black text-white text-xs font-semibold hover:bg-neutral-800"
                >
                  {activating ? 'Ativando...' : 'Confirmar e-mail e ativar conta agora'}
                </button>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-black mb-1">Nome Completo *</label>
            <input
              type="text"
              required
              value={form.nome_completo}
              onChange={(e) => setForm({ ...form, nome_completo: e.target.value })}
              placeholder="Ex: Maria Clara Oliveira"
              className="w-full px-4 py-3 bg-white border border-[#d6d6d6] rounded-xl text-sm focus:outline-none focus:border-black"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-black mb-1">Número USP (NUSP) *</label>
              <input
                type="text"
                required
                value={form.nusp}
                onChange={(e) => setForm({ ...form, nusp: e.target.value })}
                placeholder="14745171"
                className="w-full px-4 py-3 bg-white border border-[#d6d6d6] rounded-xl text-sm focus:outline-none focus:border-black"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-black mb-1">Telefone (DDD)</label>
              <input
                type="tel"
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                placeholder="(11) 99999-0000"
                className="w-full px-4 py-3 bg-white border border-[#d6d6d6] rounded-xl text-sm focus:outline-none focus:border-black"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-black mb-1">E-mail institucional (@usp.br) *</label>
            <input
              type="email"
              required
              value={form.email_institucional}
              onChange={(e) => setForm({ ...form, email_institucional: e.target.value })}
              placeholder="seu.nome@usp.br"
              className="w-full px-4 py-3 bg-white border border-[#d6d6d6] rounded-xl text-sm focus:outline-none focus:border-black"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-black mb-1">Senha * (mín. 8 caracteres com letra e número)</label>
            <input
              type="password"
              required
              value={form.senha}
              onChange={(e) => setForm({ ...form, senha: e.target.value })}
              placeholder="Crie uma senha forte"
              className="w-full px-4 py-3 bg-white border border-[#d6d6d6] rounded-xl text-sm focus:outline-none focus:border-black"
            />
          </div>

          <label className="flex items-start gap-2.5 text-xs text-[#5e5e5e] cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={form.termos_aceitos}
              onChange={(e) => setForm({ ...form, termos_aceitos: e.target.checked })}
              className="mt-0.5 rounded border-neutral-400 text-black focus:ring-black"
            />
            <span>
              Li e aceito os <strong>Termos de Uso</strong> e a política de privacidade conforme a{' '}
              <strong>LGPD</strong>, comprometendo-me ao rateio solidário sem fins lucrativos.
            </span>
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-full bg-black text-white text-sm font-semibold hover:bg-neutral-800 disabled:opacity-60 transition-colors"
          >
            {submitting ? 'Registrando...' : 'Criar conta institucional'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-[#5e5e5e]">
          Já possui cadastro?{' '}
          <Link to="/login" className="font-semibold text-black underline">
            Fazer login
          </Link>
        </p>
      </div>
    </div>
  );
}
