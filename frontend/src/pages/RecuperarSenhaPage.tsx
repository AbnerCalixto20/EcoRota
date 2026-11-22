import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError, apiRequest } from '../api';

export function RecuperarSenhaPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const res = await apiRequest<{ message: string; dev_reset_token?: string }>(
        '/auth/forgot-password',
        { method: 'POST', body: JSON.stringify({ email_institucional: email }) }
      );
      setMessage(res.message);
      if (res.dev_reset_token) setToken(res.dev_reset_token);
      setStep('reset');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao solicitar recuperação.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (novaSenha !== confirmarSenha) {
      setError('A confirmação de senha não confere.');
      return;
    }
    setLoading(true);
    try {
      const res = await apiRequest<{ message: string }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, nova_senha: novaSenha }),
      });
      setMessage(res.message);
      setTimeout(() => navigate('/login'), 1300);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao redefinir senha.');
    } finally {
      setLoading(false);
    }
  };

  if (import.meta.env.VITE_PUBLIC_DEMO === 'true') {
    return <div className="max-w-xl mx-auto p-10 text-center space-y-4">
      <h1 className="text-2xl font-bold">Demonstração pública</h1>
      <p>A recuperação de senha está desabilitada nesta demonstração. Use as credenciais fictícias da tela de login.</p>
      <Link className="font-semibold underline" to="/login">Voltar ao login de demonstração</Link>
    </div>;
  }

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center px-4 py-12 bg-white">
      <div className="w-full max-w-[460px] bg-[#f8f8f9] border border-[#e6e6e6] rounded-2xl p-6 sm:p-10 shadow-sm">
        <span className="text-[11px] font-semibold tracking-wider text-[#5e5e5e] uppercase font-mono">
          ECR011 • Recuperação de Credenciais
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-black mt-1">Recuperar senha</h1>
        <p className="mt-2 text-sm text-[#5e5e5e] mb-6">
          Envie seu e-mail institucional para receber um token de utilização única válido por 30 minutos.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-4 p-3 rounded-xl bg-eco-soft border border-eco-border text-xs text-eco-dark">
            {message}
          </div>
        )}

        {step === 'request' ? (
          <form onSubmit={handleRequestToken} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-black mb-1">E-mail institucional</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.nome@usp.br"
                className="w-full px-4 py-3 bg-white border border-[#d6d6d6] rounded-xl text-sm focus:outline-none focus:border-black"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-full bg-black text-white text-sm font-semibold hover:bg-neutral-800"
            >
              {loading ? 'Enviando...' : 'Enviar token de redefinição'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-black mb-1">Token recebido (validade 30 min)</label>
              <input
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-[#d6d6d6] rounded-xl font-mono text-xs focus:outline-none focus:border-black"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-black mb-1">Nova senha</label>
              <input
                type="password"
                required
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                placeholder="Mínimo 8 caracteres (letras e números)"
                className="w-full px-4 py-3 bg-white border border-[#d6d6d6] rounded-xl text-sm focus:outline-none focus:border-black"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-black mb-1">Confirmar nova senha</label>
              <input
                type="password"
                required
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-[#d6d6d6] rounded-xl text-sm focus:outline-none focus:border-black"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-full bg-black text-white text-sm font-semibold hover:bg-neutral-800"
            >
              {loading ? 'Redefinindo...' : 'Redefinir senha'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-[#5e5e5e]">
          Lembrou sua senha?{' '}
          <Link to="/login" className="font-semibold text-black underline">
            Voltar ao login
          </Link>
        </p>
      </div>
    </div>
  );
}
