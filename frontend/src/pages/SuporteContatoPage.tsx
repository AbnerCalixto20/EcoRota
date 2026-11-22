import { useEffect, useState } from 'react';
import { useAuth } from '../auth';
import { ApiError, apiRequest, formatDateTimeBR } from '../api';
import { Icon } from '../components/UI';

interface Chamado {
  numero_protocolo: number;
  categoria_assunto: string;
  mensagem: string;
  status_chamado: string;
  criado_em: string;
}

export function SuporteContatoPage() {
  const { user } = useAuth();
  const [nome, setNome] = useState(user?.nome_completo || '');
  const [email, setEmail] = useState(user?.email_institucional || '');
  const [categoria, setCategoria] = useState('Dúvida sobre caronas');
  const [mensagem, setMensagem] = useState('');
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Requerimento Especial ECR014: preenchimento automático para usuário autenticado
  useEffect(() => {
    if (user) {
      setNome(user.nome_completo);
      setEmail(user.email_institucional);
      apiRequest<{ chamados: Chamado[] }>('/suporte/meus')
        .then((res) => setChamados(res.chamados))
        .catch(() => {});
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setSubmitting(true);
    try {
      const res = await apiRequest<{ message: string; chamado: Chamado }>('/suporte', {
        method: 'POST',
        body: JSON.stringify({
          nome,
          email,
          categoria_assunto: categoria,
          mensagem,
        }),
      });
      setFeedback({ type: 'ok', text: res.message });
      setMensagem('');
      if (user) {
        setChamados((prev) => [res.chamado, ...prev]);
      }
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof ApiError ? err.message : 'Erro ao enviar solicitação.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-[1100px] mx-auto px-6 py-10 space-y-8">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          ECR014 • Atendimento e Suporte
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-black mt-1">
          Como podemos ajudar?
        </h1>
        <p className="text-sm text-neutral-600 mt-1">
          Envie dúvidas, relatos de falhas técnicas, denúncias ou solicitações de alteração cadastral.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-7 bg-white border border-neutral-200 rounded-2xl p-6 sm:p-8 space-y-4 shadow-sm"
        >
          <h2 className="text-lg font-bold text-black">Nova Mensagem</h2>

          {feedback && (
            <div
              className={`p-4 rounded-xl border text-xs font-medium ${
                feedback.type === 'ok'
                  ? 'bg-eco-soft border-eco-border text-eco-dark'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >
              {feedback.text}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-black mb-1">Nome *</label>
              <input
                type="text"
                required
                value={nome}
                readOnly={Boolean(user)}
                onChange={(e) => setNome(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl text-sm ${
                  user ? 'bg-neutral-100 text-neutral-600' : 'bg-[#f3f3f4] focus:bg-white border border-transparent focus:border-black'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-black mb-1">E-mail *</label>
              <input
                type="email"
                required
                value={email}
                readOnly={Boolean(user)}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl text-sm ${
                  user ? 'bg-neutral-100 text-neutral-600' : 'bg-[#f3f3f4] focus:bg-white border border-transparent focus:border-black'
                }`}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-black mb-1">Categoria do Assunto *</label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full px-4 py-3 bg-[#f3f3f4] rounded-xl text-sm focus:bg-white border border-transparent focus:border-black"
            >
              <option>Dúvida sobre caronas</option>
              <option>Relato de falha técnica</option>
              <option>Alteração de NUSP / E-mail institucional</option>
              <option>Denúncia de conduta ou segurança</option>
              <option>Sugestão de melhoria</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-black mb-1">Mensagem *</label>
            <textarea
              rows={4}
              required
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder="Descreva sua solicitação com o máximo de detalhes..."
              className="w-full px-4 py-3 bg-[#f3f3f4] rounded-xl text-sm focus:bg-white border border-transparent focus:border-black focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3 rounded-full bg-black text-white text-sm font-semibold hover:bg-neutral-800 inline-flex items-center gap-2"
          >
            <Icon name="send" className="text-[18px]" />
            {submitting ? 'Registrando...' : 'Enviar Mensagem'}
          </button>
        </form>

        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-3 shadow-sm">
            <h2 className="text-base font-bold text-black">Dúvidas Frequentes</h2>
            <div className="space-y-3 text-xs text-neutral-600">
              <div>
                <p className="font-bold text-black">Quem pode usar o EcoRota?</p>
                <p>Alunos, docentes e servidores com vínculo ativo e e-mail institucional @usp.br.</p>
              </div>
              <div>
                <p className="font-bold text-black">Como funciona o rateio de custos?</p>
                <p>
                  O valor por vaga nunca pode ultrapassar o custo operacional (combustível + pedágio)
                  dividido pelo total de ocupantes do carro.
                </p>
              </div>
              <div>
                <p className="font-bold text-black">Preciso alterar meu NUSP ou e-mail</p>
                <p>
                  Abra um chamado ao lado selecionando "Alteração de NUSP / E-mail institucional" para
                  validação segura.
                </p>
              </div>
            </div>
          </div>

          {user && chamados.length > 0 && (
            <div className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-3 shadow-sm">
              <h2 className="text-base font-bold text-black">Meus Protocolos ({chamados.length})</h2>
              <div className="space-y-2.5">
                {chamados.map((c) => (
                  <div key={c.numero_protocolo} className="p-3 rounded-xl bg-[#f9f9f9] text-xs space-y-1">
                    <div className="flex justify-between font-bold text-black">
                      <span>Protocolo #{c.numero_protocolo}</span>
                      <span>{c.status_chamado}</span>
                    </div>
                    <p className="font-medium text-neutral-700">{c.categoria_assunto}</p>
                    <p className="text-neutral-500">{formatDateTimeBR(c.criado_em)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
