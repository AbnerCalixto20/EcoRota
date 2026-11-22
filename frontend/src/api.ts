// Tipos do domínio EcoRota + cliente HTTP para a API Django

export type StatusConta = 'PENDENTE_ATIVACAO' | 'ATIVA' | 'BLOQUEADA' | 'INATIVA';
export type ModalidadeAprovacao = 'AUTOMATICA' | 'MANUAL';
export type StatusOferta = 'DISPONIVEL' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA';
export type StatusReserva =
  | 'PENDENTE_APROVACAO'
  | 'CONFIRMADO'
  | 'REJEITADO'
  | 'CANCELADO_PASSAGEIRO'
  | 'CANCELADO_MOTORISTA';

export interface Usuario {
  id_usuario: number;
  nome_completo: string;
  nusp: string;
  email_institucional: string;
  telefone?: string | null;
  status_conta: StatusConta;
  bio?: string | null;
  foto_data_url?: string | null;
  cadastrado_em?: string;
  reputacao: number;
  quantidade_avaliacoes: number;
  possui_veiculo?: boolean;
  notificacoes_nao_lidas?: number;
}

export interface Veiculo {
  id_veiculo: number;
  id_usuario: number;
  marca: string;
  modelo: string;
  cor?: string | null;
  placa: string;
  ano?: number | null;
  capacidade_passageiros: number;
  ativo: number;
}

export interface Destino {
  id_destino: number;
  tipo_destino: 'CAMPUS' | 'RESTAURANTE';
  campus: string;
  restaurante?: string | null;
  nome_destino: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface ParadaViagem {
  id_parada: number;
  ordem: number;
  descricao_local: string;
  latitude: number;
  longitude: number;
}

export interface Reserva {
  id_reserva: number;
  id_passageiro: number;
  id_viagem: number;
  status_reserva: StatusReserva;
  justificativa_cancelamento?: string | null;
  solicitada_em: string;
  decidida_em?: string | null;
  cancelada_em?: string | null;
}

export interface Viagem {
  id_viagem: number;
  id_motorista: number;
  id_veiculo: number;
  ponto_partida: string;
  latitude_partida: number;
  longitude_partida: number;
  id_destino: number;
  destino_final: string;
  tipo_destino: 'CAMPUS' | 'RESTAURANTE';
  campus: string;
  restaurante?: string | null;
  data_horario: string;
  previsao_chegada: string;
  vagas_total: number;
  vagas_disponiveis: number;
  modalidade_aprovacao: ModalidadeAprovacao;
  status_oferta: StatusOferta;
  custo_combustivel_previsto: number;
  custo_pedagio_previsto: number;
  valor_rateio: number;
  distancia_km: number;
  motorista_nome?: string;
  motorista_nusp?: string;
  motorista_bio?: string | null;
  motorista_reputacao?: number;
  motorista_avaliacoes?: number;
  veiculo_marca?: string;
  veiculo_modelo?: string;
  veiculo_cor?: string;
  veiculo_placa?: string;
  veiculo_ano?: number;
  paradas?: ParadaViagem[];
  desvio_km?: number | null;
  passageiros_confirmados?: Array<{
    id_reserva: number;
    id_usuario: number;
    nome_completo: string;
    reputacao: number;
  }>;
  minha_reserva?: Reserva | null;
  reservas?: Array<{
    id_reserva: number;
    id_passageiro: number;
    status_reserva: StatusReserva;
    solicitada_em: string;
    passageiro_nome: string;
    passageiro_nusp: string;
    passageiro_reputacao: number;
  }>;
}

export interface SolicitacaoPendente {
  id_reserva: number;
  id_viagem: number;
  id_passageiro: number;
  status_reserva: StatusReserva;
  solicitada_em: string;
  passageiro_nome: string;
  passageiro_nusp: string;
  passageiro_email: string;
  passageiro_bio?: string | null;
  passageiro_reputacao: number;
  passageiro_avaliacoes: number;
  ponto_partida: string;
  destino_final: string;
  data_horario: string;
  vagas_total: number;
  vagas_disponiveis: number;
}

export interface MensagemChat {
  id_mensagem: number;
  id_viagem: number;
  id_remetente: number;
  remetente_nome: string;
  conteudo: string;
  enviada_em: string;
}

export interface Notificacao {
  id_notificacao: number;
  id_viagem?: number | null;
  id_reserva?: number | null;
  tipo: string;
  conteudo: string;
  criada_em: string;
  lida_em?: string | null;
}

export interface HistoricoItem {
  id_usuario: number;
  papel: 'MOTORISTA' | 'PASSAGEIRO';
  id_viagem: number;
  ponto_partida: string;
  destino_final: string;
  data_horario: string;
  situacao: string;
  valor_rateio: number;
  participantes_passageiros: number;
}

const TOKEN_KEY = 'ecorota_jwt_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`/api${endpoint}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(data?.error || 'Não foi possível concluir a solicitação.', response.status);
  }
  return data as T;
}

export function formatCurrencyBRL(value: number): string {
  if (!value || value <= 0) return 'Gratuita';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatDateTimeBR(sqlDate: string): string {
  if (!sqlDate) return '—';
  const date = new Date(sqlDate.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return sqlDate;
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
