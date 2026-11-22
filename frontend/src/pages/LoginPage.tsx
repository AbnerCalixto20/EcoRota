import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { ApiError } from '../api';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from || '/caronas';

  const [identificador, setIdentificador] = useState('ana.lima@usp.br');
  const [senha, setSenha] = useState('EcoRota@2026');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(identificador, senha);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao autenticar.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center px-4 py-12 bg-white">
      <div className="w-full max-w-[460px] bg-[#f8f8f9] border border-[#e6e6e6] rounded-2xl p-6 sm:p-10 shadow-sm">
        <div className="mb-7">
          <span className="text-[11px] font-semibold tracking-wider text-[#5e5e5e] uppercase font-mono">
            ECR002 • Universidade de São Paulo
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-black mt-1">Fazer login</h1>
          <p className="mt-2 text-sm text-[#5e5e5e]">
            Acesse sua conta institucional para solicitar ou oferecer caronas na comunidade USP.
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-black mb-1.5">
              E-mail institucional ou NUSP
            </label>
            <input
              type="text"
              required
              value={identificador}
              onChange={(e) => setIdentificador(e.target.value)}
              placeholder="seu.nome@usp.br ou 14745101"
              className="w-full px-4 py-3 bg-white border border-[#d6d6d6] rounded-xl text-sm text-black focus:outline-none focus:border-black"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-black">Senha</label>
              <Link to="/recuperar-senha" className="text-xs font-medium text-neutral-600 hover:text-black underline">
                Esqueci minha senha
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 pr-16 bg-white border border-[#d6d6d6] rounded-xl text-sm text-black focus:outline-none focus:border-black"
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-neutral-500 hover:text-black"
              >
                {showPwd ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-full bg-black text-white text-sm font-semibold hover:bg-neutral-800 disabled:opacity-60 transition-colors"
          >
            {submitting ? 'Autenticando...' : 'Entrar no EcoRota'}
          </button>
        </form>

        {/* Atalho de contas demo */}
        <div className="mt-6 pt-5 border-t border-neutral-200 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
            Contas de demonstração (senha: EcoRota@2026)
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Ana (Motorista)', email: 'ana.lima@usp.br' },
              { label: 'Bruno (Motorista)', email: 'bruno.silva@usp.br' },
              { label: 'Carla (Passageira)', email: 'carla.mendes@usp.br' },
              { label: 'Diego (Passageiro)', email: 'diego.ferreira@usp.br' },
            ].map((demo) => (
              <button
                key={demo.email}
                type="button"
                onClick={() => {
                  setIdentificador(demo.email);
                  setSenha('EcoRota@2026');
                }}
                className="px-3 py-1 rounded-full bg-white border border-neutral-300 text-xs font-medium text-black hover:bg-black hover:text-white transition-colors"
              >
                {demo.label}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-[#5e5e5e]">
          Ainda não tem conta?{' '}
          <Link to="/cadastro" className="font-semibold text-black underline">
            Cadastre-se com @usp.br
          </Link>
        </p>
      </div>
    </div>
  );
}
