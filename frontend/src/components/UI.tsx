import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth';
import type { Destino } from '../api';

export function Icon({
  name,
  className = 'text-[20px]',
  filled = false,
}: {
  name: string;
  className?: string;
  filled?: boolean;
}) {
  return (
    <span
      className={`material-symbols-outlined ${filled ? 'fill-icon' : ''} ${className}`}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}

const STATUS_STYLES: Record<string, { label: string; classes: string }> = {
  DISPONIVEL: { label: 'Disponível', classes: 'bg-eco-soft text-eco-dark border border-eco-border' },
  EM_ANDAMENTO: { label: 'Em andamento', classes: 'bg-black text-white border border-black' },
  CONCLUIDA: { label: 'Concluída', classes: 'bg-neutral-100 text-neutral-800 border border-neutral-300' },
  CANCELADA: { label: 'Cancelada', classes: 'bg-red-50 text-red-700 border border-red-200' },
  CONFIRMADO: { label: 'Confirmada', classes: 'bg-eco-soft text-eco-dark border border-eco-border' },
  PENDENTE_APROVACAO: { label: 'Pendente de aprovação', classes: 'bg-amber-50 text-amber-800 border border-amber-200' },
  REJEITADO: { label: 'Rejeitada', classes: 'bg-red-50 text-red-700 border border-red-200' },
  CANCELADO_PASSAGEIRO: { label: 'Cancelada pelo passageiro', classes: 'bg-red-50 text-red-700 border border-red-200' },
  CANCELADO_MOTORISTA: { label: 'Cancelada pelo motorista', classes: 'bg-red-50 text-red-700 border border-red-200' },
  AUTOMATICA: { label: 'Aprovação automática', classes: 'bg-neutral-100 text-black border border-neutral-200' },
  MANUAL: { label: 'Aprovação manual', classes: 'bg-neutral-100 text-neutral-700 border border-neutral-200' },
};

export function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_STYLES[status] || {
    label: status,
    classes: 'bg-neutral-100 text-neutral-700 border border-neutral-200',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.classes}`}>
      {cfg.label}
    </span>
  );
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-sm text-neutral-500">
        Validando sessão institucional...
      </div>
    );
  }
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return <>{children}</>;
}

function normalizeSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

interface DestinoSelectProps {
  destinos: Destino[];
  value: string;
  onChange: (value: string) => void;
  excludeId?: string;
  excludeIds?: string[];
  placeholder?: string;
  allowAll?: boolean;
  allLabel?: string;
  className?: string;
}

type DestinoCategoria = 'TODOS' | 'USP' | 'METRO' | 'BANDEJAO';

function getDestinoCategoria(d: Destino): Exclude<DestinoCategoria, 'TODOS'> {
  if (d.tipo_destino === 'RESTAURANTE') return 'BANDEJAO';
  if (d.campus.startsWith('Metrô') || d.nome_destino.startsWith('Metrô ')) return 'METRO';
  return 'USP';
}

const CATEGORIA_ORDEM: Record<Exclude<DestinoCategoria, 'TODOS'>, number> = {
  USP: 0,
  BANDEJAO: 1,
  METRO: 2,
};

export function DestinoSelect({
  destinos,
  value,
  onChange,
  excludeId = '',
  excludeIds = [],
  placeholder = 'Selecione um local...',
  allowAll = true,
  allLabel = 'Todos os locais (USP, Metrô SP e Bandejões)',
  className = '',
}: DestinoSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [categoria, setCategoria] = useState<DestinoCategoria>('TODOS');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const selected = useMemo(
    () => destinos.find((d) => String(d.id_destino) === String(value)) || null,
    [destinos, value]
  );

  const excludedSet = useMemo(() => {
    const s = new Set<string>();
    if (excludeId) s.add(String(excludeId));
    for (const id of excludeIds) {
      if (id) s.add(String(id));
    }
    return s;
  }, [excludeId, excludeIds]);

  const availableDestinos = useMemo(
    () =>
      excludedSet.size > 0
        ? destinos.filter((d) => !excludedSet.has(String(d.id_destino)))
        : destinos,
    [destinos, excludedSet]
  );

  const orderedDestinos = useMemo(
    () =>
      [...availableDestinos].sort((a, b) => {
        const diff = CATEGORIA_ORDEM[getDestinoCategoria(a)] - CATEGORIA_ORDEM[getDestinoCategoria(b)];
        if (diff !== 0) return diff;
        return a.nome_destino.localeCompare(b.nome_destino, 'pt-BR');
      }),
    [availableDestinos]
  );

  const counts = useMemo(() => {
    const c = { TODOS: availableDestinos.length, USP: 0, METRO: 0, BANDEJAO: 0 };
    for (const d of availableDestinos) c[getDestinoCategoria(d)] += 1;
    return c;
  }, [availableDestinos]);

  const filtered = useMemo(() => {
    const q = normalizeSearch(query.trim());
    return orderedDestinos.filter((d) => {
      if (categoria !== 'TODOS' && getDestinoCategoria(d) !== categoria) return false;
      if (!q) return true;
      return (
        normalizeSearch(d.nome_destino).includes(q) ||
        normalizeSearch(d.campus).includes(q) ||
        normalizeSearch(d.restaurante || '').includes(q)
      );
    });
  }, [orderedDestinos, categoria, query]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQuery('');
      setCategoria('TODOS');
    }
  }, [open]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 text-left text-sm font-semibold text-black focus:outline-none"
      >
        <span className={`truncate ${selected ? 'text-black' : 'text-neutral-600'}`}>
          {selected ? selected.nome_destino : allowAll ? allLabel : placeholder}
        </span>
        <span className="flex items-center gap-1 shrink-0">
          {allowAll && selected && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Limpar destino"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  onChange('');
                }
              }}
              className="w-5 h-5 rounded-full hover:bg-neutral-200 flex items-center justify-center text-neutral-500 hover:text-black"
            >
              <Icon name="close" className="text-[15px]" />
            </span>
          )}
          <Icon name={open ? 'expand_less' : 'expand_more'} className="text-[18px] text-neutral-500" />
        </span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 mt-2 bg-white border border-neutral-200 rounded-2xl shadow-xl z-50 overflow-hidden min-w-[300px]">
          <div className="p-2.5 border-b border-neutral-100 bg-[#f9f9f9] space-y-2">
            <div className="flex items-center gap-2 bg-white border border-neutral-300 focus-within:border-black rounded-xl px-3 py-2">
              <Icon name="search" className="text-[18px] text-neutral-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Pesquisar unidade (Poli, FEA...), metrô (Butantã, Linha 4...) ou bandejão"
                className="w-full bg-transparent text-xs font-medium text-black placeholder-neutral-400 focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="text-neutral-400 hover:text-black"
                  aria-label="Limpar busca"
                >
                  <Icon name="close" className="text-[15px]" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ['TODOS', `Todos (${counts.TODOS})`],
                  ['USP', `USP (${counts.USP})`],
                  ['METRO', `Metrô SP (${counts.METRO})`],
                  ['BANDEJAO', `Bandejões (${counts.BANDEJAO})`],
                ] as [DestinoCategoria, string][]
              ).map(([cat, label]) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoria(cat)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                    categoria === cat
                      ? 'bg-black text-white'
                      : 'bg-white border border-neutral-200 text-neutral-600 hover:border-black hover:text-black'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-neutral-100">
            {allowAll && !query.trim() && categoria === 'TODOS' && (
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-[#f3f3f4] transition-colors flex items-center justify-between ${
                  !value ? 'bg-black text-white hover:bg-black' : 'text-black'
                }`}
              >
                <span>{allLabel}</span>
                <span className={!value ? 'text-neutral-300' : 'text-neutral-400'}>
                  {availableDestinos.length} opções
                </span>
              </button>
            )}

            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-neutral-500">
                Nenhum destino encontrado para "{query}".
              </div>
            ) : (
              filtered.map((d) => {
                const isSelected = String(d.id_destino) === String(value);
                const cat = getDestinoCategoria(d);
                return (
                  <button
                    key={d.id_destino}
                    type="button"
                    onClick={() => {
                      onChange(String(d.id_destino));
                      setOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-xs transition-colors flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-black text-white font-semibold'
                        : 'text-black hover:bg-[#f3f3f4]'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{d.nome_destino}</p>
                      <p className={`text-[11px] truncate ${isSelected ? 'text-neutral-300' : 'text-neutral-500'}`}>
                        {d.campus}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        isSelected
                          ? 'bg-neutral-800 text-white'
                          : cat === 'BANDEJAO'
                          ? 'bg-eco-soft text-eco-dark border border-eco-border'
                          : cat === 'METRO'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-[#efefef] text-neutral-600'
                      }`}
                    >
                      {cat === 'BANDEJAO' ? 'Bandejão' : cat === 'METRO' ? 'Metrô' : 'Unidade'}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
