import { Link } from 'react-router-dom';
import { Icon } from '../components/UI';

export function SobreNosPage() {
  const membros = [
    { nome: 'Ábner Calixto Miranda Santos', nusp: '14745171' },
    { nome: 'Mikael Oliveira Carneiro', nusp: '14599342' },
    { nome: 'Pedro Tomasini', nusp: '13678074' },
    { nome: 'Yuri Leonardo Soares Ribeiro', nusp: '14612923' },
  ];

  return (
    <div className="bg-white">
      <section className="max-w-[1140px] mx-auto px-6 py-14 space-y-12">
        <div className="max-w-3xl space-y-4">
          <span className="inline-flex items-center gap-2 text-xs font-semibold bg-[#f3f3f4] px-3 py-1 rounded-full text-neutral-700">
            ECR013 • Informações Institucionais (Acesso Público)
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-black leading-tight">
            Transformando o trajeto até a USP
          </h1>
          <p className="text-base text-[#5e5e5e] leading-relaxed">
            O <strong>EcoRota</strong> nasceu no contexto da disciplina{' '}
            <strong>PMR3304 — Sistemas de Informação</strong> da Escola Politécnica da USP para
            enfrentar a inconstância e superlotação dos ônibus circulares, o excesso de veículos
            individuais nos estacionamentos e as emissões de CO₂ na Cidade Universitária.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: 'eco',
              title: 'Missão Ambiental',
              text: 'Otimizar a ocupação dos carros que já circulam pelo campus, tangibilizando o CO₂ economizado em um Dashboard Sustentável Multidimensional.',
            },
            {
              icon: 'handshake',
              title: 'Rateio Solidário',
              text: 'Sem fins lucrativos: a contribuição por vaga é limitada estritamente à divisão justa das despesas operacionais de combustível e pedágio.',
            },
            {
              icon: 'verified_user',
              title: 'Comunidade Verificada',
              text: 'Acesso exclusivo mediante validação institucional @usp.br e NUSP, com reputação bidirecional após cada viagem concluída.',
            },
          ].map((c) => (
            <div key={c.title} className="bg-[#f9f9f9] border border-neutral-200 rounded-2xl p-6 space-y-3">
              <div className="w-11 h-11 rounded-xl bg-black text-white flex items-center justify-center">
                <Icon name={c.icon} className="text-[22px]" />
              </div>
              <h2 className="text-lg font-bold text-black">{c.title}</h2>
              <p className="text-sm text-neutral-600 leading-relaxed">{c.text}</p>
            </div>
          ))}
        </div>

        <div className="bg-black text-white rounded-3xl p-8 sm:p-10 space-y-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              USP :: Poli :: Mecatrônica / PMR3304
            </span>
            <h2 className="text-2xl font-bold mt-1">Equipe de Desenvolvimento — Grupo O</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {membros.map((m) => (
              <div key={m.nusp} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
                <p className="font-bold text-sm text-white">{m.nome}</p>
                <p className="text-xs text-neutral-400 mt-1 font-mono">NUSP: {m.nusp}</p>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-neutral-800 flex flex-wrap gap-3">
            <Link
              to="/caronas"
              className="px-5 py-2.5 rounded-full bg-white text-black text-xs font-semibold hover:bg-neutral-200"
            >
              Explorar Caronas
            </Link>
            <Link
              to="/impacto"
              className="px-5 py-2.5 rounded-full bg-neutral-800 text-white text-xs font-semibold hover:bg-neutral-700"
            >
              Ver Dashboard Sustentável
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
