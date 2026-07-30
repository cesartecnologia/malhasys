import type { Timestamp } from "firebase/firestore";

export type Perfil = "Administrador" | "Produção" | "Designer";
export type StatusPedido =
  | "Aguardando Arte"
  | "Arte Aprovada"
  | "Corte"
  | "Estamparia"
  | "Costura"
  | "Em Preparação"
  | "Enviado"
  | "Entregue"
  | "Cancelado";
export type Prioridade = "Normal" | "Alta" | "Urgente";

export type PedidoItem = {
  tipo: string;
  tamanho: string;
  quantidade: number;
  cor: string;
  gola: string;
};

export type PedidoArte = {
  id: string;
  nome: string;
  referenciaUrl?: string;
  referenciaPath?: string;
  arteFinalUrl?: string;
  arteFinalPath?: string;
};

export type Pedido = {
  id: string;
  clienteId: string;
  clienteNome: string;
  whatsapp: string;
  cidade: string;
  tipoEstampa: string;
  valorTotal: number;
  valorEntrada: number;
  valorPago: number;
  formaPagamento: string;
  prioridade: Prioridade;
  status: StatusPedido;
  observacoes: string;
  logoUrl?: string;
  logoPath?: string;
  arteFinalUrl?: string;
  arteFinalPath?: string;
  artes?: PedidoArte[];
  artesFinalizadas?: boolean;
  detalhesArte?: string;
  rastreio?: string;
  designer?: string;
  ativo?: boolean;
  itens: PedidoItem[];
  createdAt?: Timestamp;
};

export type Cliente = {
  id: string;
  nome: string;
  cidade: string;
  estado?: string;
  endereco: string;
  documento: string;
  email: string;
  whatsapp: string;
  ativo?: boolean;
  fotoUrl?: string;
  fotoPath?: string;
  createdAt?: Timestamp;
};

export type Meta = {
  id: string;
  nome: string;
  periodo: "Dia" | "Semana" | "Mês";
  valorAlvo: number;
  valorAtual: number;
  createdAt?: Timestamp;
};

export type Usuario = {
  id: string;
  uid?: string;
  nome: string;
  email: string;
  perfil: Perfil;
  cargo?: string;
  telefone?: string;
  ativo: boolean;
  createdAt?: Timestamp;
};

export type Empresa = {
  nome?: string;
  cnpj?: string;
  endereco?: string;
  telefone?: string;
  email?: string;
  logoUrl?: string;
  logoPath?: string;
  corPrimaria?: string;
  modoEscuro?: boolean;
  modoTema?: "system" | "light" | "dark";
};

export const etapas: StatusPedido[] = [
  "Aguardando Arte",
  "Arte Aprovada",
  "Corte",
  "Estamparia",
  "Costura",
  "Em Preparação",
  "Enviado",
  "Entregue",
  "Cancelado"
];
