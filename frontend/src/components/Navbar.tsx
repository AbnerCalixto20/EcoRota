import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { apiRequest, formatDateTimeBR, type Notificacao } from '../api';
import { Icon } from './UI';

export function Navbar() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [naoLidas, setNaoLidas] = useState(0);

  const loadNotifications = async () => {
    if (!user) return;
    try {
      const data = await apiRequest<{ notificacoes: Notificacao[]; nao_lidas: number }>('/notificacoes');
      setNotificacoes(data.notificacoes);
      setNaoLidas(data.nao_lidas);
    } catch {
      // ignora
    }
  };

  useEffect(() => {
    if (user) {
      setNaoLidas(user.notificacoes_nao_lidas || 0);
      loadNotifications();
    } else {
      setNotificacoes([]);
      setNaoLidas(0);
    }
  }, [user]);

  const handleMarkAllRead = async () => {
    await apiRequest('/notificacoes/ler-todas', { method: 'PATCH' });
    await loadNotifications();
    await refreshUser();
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? 'text-black font-semibold border-b-2 border-black py-[20px] transition-colors'
      : 'text-[#4b5563] hover:text-black font-medium py-[20px] transition-colors';

  const initials = user
    ? user.nome_completo.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
    : '';

  return (
    <header className="w-full bg-white border-b border-[#e5e7eb] sticky top-0 z-50">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 text-black font-bold text-xl tracking-tight">
          <span className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center text-sm font-bold shadow-sm">
            E
          </span>
          <span className="tracking-tight text-xl font-bold">EcoRota</span>
          <span className="text-[11px] font-semibold bg-[#f3f3f4] text-[#4b5563] px-2 py-0.5 rounded-full uppercase tracking-wider">
            USP
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-5 text-sm whitespace-nowrap">
          <NavLink to="/caronas" className={navLinkClass}>Procurar Carona</NavLink>
          <NavLink to="/oferecer" className={navLinkClass}>Oferecer Carona</NavLink>
          <NavLink to="/minhas-viagens" className={navLinkClass}>Minhas Viagens</NavLink>
          <NavLink to="/impacto" className={navLinkClass}>Impacto</NavLink>
          <NavLink to="/sobre" className={navLinkClass}>Sobre Nós</NavLink>
          <NavLink to="/suporte" className={navLinkClass}>Ajuda</NavLink>
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                to="/solicitacoes"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f3f3f4] hover:bg-[#e5e7eb] text-xs font-semibold text-black transition-colors"
              >
                <Icon name="inbox" className="text-[16px]" />
                Solicitações
              </Link>

              <div className="relative">
                <button
                  type="button"
                  aria-label="Notificações"
                  onClick={() => {
                    const next = !notifOpen;
                    setNotifOpen(next);
                    if (next) loadNotifications();
                  }}
                  className="relative w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#f3f3f4] text-black"
                >
                  <Icon name="notifications" className="text-[22px]" />
                  {naoLidas > 0 && (
                    <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-eco text-white text-[10px] font-bold flex items-center justify-center">
                      {naoLidas > 9 ? '9+' : naoLidas}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-[#e5e7eb] rounded-2xl shadow-xl z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-[#e5e7eb] flex items-center justify-between">
                      <span className="font-bold text-sm text-black">Notificações</span>
                      {naoLidas > 0 && (
                        <button type="button" onClick={handleMarkAllRead} className="text-xs font-semibold text-neutral-600 hover:text-black">
                          Marcar todas como lidas
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-[#f3f3f4]">
                      {notificacoes.length === 0 ? (
                        <div className="p-6 text-center text-xs text-neutral-500">Nenhuma notificação.</div>
                      ) : (
                        notificacoes.slice(0, 10).map((n) => (
                          <div key={n.id_notificacao} className={`px-4 py-3 text-sm ${n.lida_em ? 'bg-white text-neutral-600' : 'bg-[#f9fafb] text-black font-medium'}`}>
                            <p className="text-xs leading-relaxed">{n.conteudo}</p>
                            <span className="text-[11px] text-neutral-400 mt-1 block">{formatDateTimeBR(n.criada_em)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <Link to="/perfil" title={`Meu Perfil (${user.nome_completo})`} className="relative flex items-center rounded-full">
                <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold">
                  {initials}
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-eco border-2 border-white rounded-full" />
              </Link>

              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                className="hidden sm:inline-flex px-3 py-1.5 rounded-full text-xs font-semibold text-neutral-600 hover:bg-[#f3f3f4] hover:text-black"
              >
                Sair
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 text-sm font-medium">
              <Link to="/login" className="px-3 py-2 rounded-full hover:bg-[#f3f3f4] text-black">Fazer login</Link>
              {import.meta.env.VITE_PUBLIC_DEMO !== 'true' && (
                <Link to="/cadastro" className="px-4 py-2 rounded-full bg-black text-white hover:bg-neutral-800 shadow-sm">Cadastre-se</Link>
              )}
            </div>
          )}

          <button type="button" onClick={() => setMenuOpen(!menuOpen)} className="md:hidden w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#f3f3f4]">
            <Icon name={menuOpen ? 'close' : 'menu'} />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-white border-t border-[#e5e7eb] px-6 py-4 flex flex-col gap-3 text-sm font-medium">
          <Link to="/caronas" onClick={() => setMenuOpen(false)}>Procurar Carona</Link>
          <Link to="/oferecer" onClick={() => setMenuOpen(false)}>Oferecer Carona</Link>
          <Link to="/minhas-viagens" onClick={() => setMenuOpen(false)}>Minhas Viagens</Link>
          <Link to="/solicitacoes" onClick={() => setMenuOpen(false)}>Solicitações Pendentes</Link>
          <Link to="/historico" onClick={() => setMenuOpen(false)}>Histórico de Viagens</Link>
          <Link to="/impacto" onClick={() => setMenuOpen(false)}>Dashboard Sustentável</Link>
          <Link to="/sobre" onClick={() => setMenuOpen(false)}>Sobre Nós</Link>
          <Link to="/suporte" onClick={() => setMenuOpen(false)}>Suporte e Ajuda</Link>
          {user && (
            <button type="button" onClick={() => { logout(); setMenuOpen(false); navigate('/'); }} className="text-left text-red-600 font-semibold pt-2 border-t border-neutral-100">
              Sair da conta
            </button>
          )}
        </div>
      )}
    </header>
  );
}
