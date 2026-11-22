import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="bg-black text-white mt-auto">
      <div className="max-w-[1240px] mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-neutral-800">
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center text-sm font-bold">
                E
              </span>
              <span className="text-xl font-bold tracking-tight">EcoRota</span>
              <span className="text-[11px] font-semibold bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded-full">
                USP
              </span>
            </div>
            <p className="text-sm text-neutral-400 max-w-md leading-relaxed">
              Plataforma de mobilidade colaborativa desenvolvida para PMR3304 — Sistemas de Informação
              (Poli-USP). Conectando assentos vazios a estudantes e reduzindo emissões de CO₂ no campus.
            </p>
          </div>
          <div className="space-y-2.5 text-sm">
            <h3 className="font-semibold text-white">Plataforma</h3>
            <ul className="space-y-2 text-neutral-400">
              <li><Link to="/caronas" className="hover:text-white">Procurar Carona</Link></li>
              <li><Link to="/oferecer" className="hover:text-white">Oferecer Carona</Link></li>
              <li><Link to="/impacto" className="hover:text-white">Dashboard Sustentável</Link></li>
              <li><Link to="/historico" className="hover:text-white">Histórico de Viagens</Link></li>
            </ul>
          </div>
          <div className="space-y-2.5 text-sm">
            <h3 className="font-semibold text-white">Institucional</h3>
            <ul className="space-y-2 text-neutral-400">
              <li><Link to="/sobre" className="hover:text-white">Sobre Nós</Link></li>
              <li><Link to="/suporte" className="hover:text-white">Suporte e Contato</Link></li>
              <li><Link to="/login" className="hover:text-white">Acesso @usp.br</Link></li>
            </ul>
          </div>
        </div>
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <p>© 2026 EcoRota USP — Grupo O (PMR3304 / Escola Politécnica da USP).</p>
          <p>Rateio solidário sem fins lucrativos • Exclusivo para comunidade @usp.br</p>
        </div>
      </div>
    </footer>
  );
}
