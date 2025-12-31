/**
 * Constantes centralizadas do sistema VendaMax
 */

// Status de Vendas
export const VENDA_STATUS = {
  PAGO: "pago",
  PENDENTE: "pendente",
  PARCIAL: "parcial",
  CANCELADO: "cancelado",
} as const;

export type VendaStatus = (typeof VENDA_STATUS)[keyof typeof VENDA_STATUS];

// Status de Contas a Pagar
export const CONTA_PAGAR_STATUS = {
  PAGO: "PAGO",
  PENDENTE: "PENDENTE",
} as const;

export type ContaPagarStatus = (typeof CONTA_PAGAR_STATUS)[keyof typeof CONTA_PAGAR_STATUS];

// Formas de Pagamento
export const FORMA_PAGAMENTO = {
  DINHEIRO: "Dinheiro",
  CARTAO_CREDITO: "Cartão de Crédito",
  CARTAO_DEBITO: "Cartão de Débito",
  PIX: "PIX",
  TRANSFERENCIA: "Transferência Bancária",
  BOLETO: "Boleto",
} as const;

export type FormaPagamento = (typeof FORMA_PAGAMENTO)[keyof typeof FORMA_PAGAMENTO];

// Estados Brasileiros
export const ESTADOS_BRASILEIROS = [
  { uf: "AC", nome: "Acre" },
  { uf: "AL", nome: "Alagoas" },
  { uf: "AP", nome: "Amapá" },
  { uf: "AM", nome: "Amazonas" },
  { uf: "BA", nome: "Bahia" },
  { uf: "CE", nome: "Ceará" },
  { uf: "DF", nome: "Distrito Federal" },
  { uf: "ES", nome: "Espírito Santo" },
  { uf: "GO", nome: "Goiás" },
  { uf: "MA", nome: "Maranhão" },
  { uf: "MT", nome: "Mato Grosso" },
  { uf: "MS", nome: "Mato Grosso do Sul" },
  { uf: "MG", nome: "Minas Gerais" },
  { uf: "PA", nome: "Pará" },
  { uf: "PB", nome: "Paraíba" },
  { uf: "PR", nome: "Paraná" },
  { uf: "PE", nome: "Pernambuco" },
  { uf: "PI", nome: "Piauí" },
  { uf: "RJ", nome: "Rio de Janeiro" },
  { uf: "RN", nome: "Rio Grande do Norte" },
  { uf: "RS", nome: "Rio Grande do Sul" },
  { uf: "RO", nome: "Rondônia" },
  { uf: "RR", nome: "Roraima" },
  { uf: "SC", nome: "Santa Catarina" },
  { uf: "SP", nome: "São Paulo" },
  { uf: "SE", nome: "Sergipe" },
  { uf: "TO", nome: "Tocantins" },
] as const;

// Mensagens de Erro Padrão
export const ERROR_MESSAGES = {
  // Autenticação
  AUTH_REQUIRED: "Usuário não autenticado",
  SESSION_EXPIRED: "Sessão expirada. Faça login novamente",

  // Validação
  VALIDATION_ERROR: "Verifique os campos destacados",
  REQUIRED_FIELD: "Este campo é obrigatório",

  // Operações CRUD
  CREATE_SUCCESS: "Registro cadastrado com sucesso!",
  CREATE_ERROR: "Erro ao cadastrar. Tente novamente",
  UPDATE_SUCCESS: "Registro atualizado com sucesso!",
  UPDATE_ERROR: "Erro ao atualizar. Tente novamente",
  DELETE_SUCCESS: "Registro excluído com sucesso!",
  DELETE_ERROR: "Erro ao excluir. Tente novamente",
  LOAD_ERROR: "Erro ao carregar dados. Tente novamente",

  // Negócio
  PRECO_VENDA_MENOR: "Preço de venda não pode ser menor que preço de compra",
  ESTOQUE_INSUFICIENTE: "Estoque insuficiente",
  CLIENTE_NAO_ENCONTRADO: "Cliente não encontrado",
  PRODUTO_NAO_ENCONTRADO: "Produto não encontrado",
} as const;

// Configurações de Paginação
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
  MAX_PAGE_SIZE: 100,
} as const;

// Limites de Campos
export const FIELD_LIMITS = {
  NOME: { MIN: 2, MAX: 100 },
  DESCRICAO: { MAX: 500 },
  OBSERVACOES: { MAX: 1000 },
  EMAIL: { MAX: 255 },
  ENDERECO: { MAX: 200 },
  CPF: { LENGTH: 11 },
  CNPJ: { LENGTH: 14 },
  CEP: { LENGTH: 8 },
  TELEFONE: { MIN: 10, MAX: 11 },
  SENHA: { MIN: 8, MAX: 100 },
} as const;

// Regex Patterns
export const PATTERNS = {
  EMAIL: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$/,
  CPF: /^\d{3}\.\d{3}\.\d{3}-\d{2}$/,
  CNPJ: /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/,
  TELEFONE: /^\(\d{2}\) \d{4,5}-\d{4}$/,
  CEP: /^\d{5}-\d{3}$/,
} as const;

// Cores de Status (para badges/cards)
export const STATUS_COLORS = {
  success: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  danger: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  default: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
} as const;

// Query Keys (React Query)
export const QUERY_KEYS = {
  CURRENT_USER: ["currentUser"],
  CLIENTES: ["clientes"],
  FORNECEDORES: ["fornecedores"],
  PRODUTOS: ["produtos"],
  VENDAS: ["vendas"],
  CONTAS_PAGAR: ["contas_pagar"],
  DASHBOARD: ["dashboard"],
} as const;

// Configurações de Debounce
export const DEBOUNCE = {
  SEARCH: 300, // ms
  INPUT: 500, // ms
} as const;
