import { PostgrestError } from "@supabase/supabase-js";

/**
 * Interface para erros tratados da aplicação
 */
export interface AppError {
  title: string;
  message: string;
  code?: string;
  technical?: string;
}

/**
 * Mapeia códigos de erro do PostgreSQL para mensagens amigáveis
 */
const POSTGRES_ERROR_MESSAGES: Record<string, string> = {
  "23505": "Este registro já existe no sistema",
  "23503": "Não é possível excluir este registro pois está sendo usado",
  "23502": "Alguns campos obrigatórios não foram preenchidos",
  "22P02": "Formato de dado inválido",
  "42501": "Você não tem permissão para realizar esta ação",
  "PGRST116": "Nenhum registro encontrado",
};

/**
 * Converte erro do Supabase em mensagem amigável
 */
export function parseSupabaseError(error: PostgrestError | Error | unknown): AppError {
  // Erro do Supabase (PostgrestError)
  if (error && typeof error === "object" && "code" in error) {
    const pgError = error as PostgrestError;

    return {
      title: "Erro na operação",
      message: POSTGRES_ERROR_MESSAGES[pgError.code] || pgError.message || "Ocorreu um erro inesperado",
      code: pgError.code,
      technical: pgError.details || pgError.hint,
    };
  }

  // Erro padrão do JavaScript
  if (error instanceof Error) {
    return {
      title: "Erro",
      message: error.message || "Ocorreu um erro inesperado",
      technical: error.stack,
    };
  }

  // Erro de rede
  if (error && typeof error === "object" && "message" in error) {
    const networkError = error as { message: string };

    if (networkError.message.includes("fetch")) {
      return {
        title: "Erro de conexão",
        message: "Não foi possível conectar ao servidor. Verifique sua conexão com a internet.",
      };
    }
  }

  // Erro desconhecido
  return {
    title: "Erro desconhecido",
    message: "Ocorreu um erro inesperado. Tente novamente.",
    technical: JSON.stringify(error),
  };
}

/**
 * Valida resposta do Supabase e lança erro se necessário
 */
export function validateSupabaseResponse<T>(
  data: T | null,
  error: PostgrestError | null,
  context?: string
): T {
  if (error) {
    const appError = parseSupabaseError(error);
    throw new Error(
      context
        ? `${context}: ${appError.message}`
        : appError.message
    );
  }

  if (!data) {
    throw new Error(
      context
        ? `${context}: Nenhum dado retornado`
        : "Nenhum dado retornado"
    );
  }

  return data;
}

/**
 * Tipos de erro categorizados
 */
export enum ErrorCategory {
  NETWORK = "network",
  VALIDATION = "validation",
  PERMISSION = "permission",
  NOT_FOUND = "not_found",
  SERVER = "server",
  UNKNOWN = "unknown",
}

/**
 * Categoriza o erro para tratamento específico
 */
export function categorizeError(error: unknown): ErrorCategory {
  const appError = parseSupabaseError(error);

  if (appError.code === "PGRST116") return ErrorCategory.NOT_FOUND;
  if (appError.code === "42501") return ErrorCategory.PERMISSION;
  if (appError.code?.startsWith("23")) return ErrorCategory.VALIDATION;
  if (appError.message.includes("conexão") || appError.message.includes("fetch")) {
    return ErrorCategory.NETWORK;
  }
  if (appError.code) return ErrorCategory.SERVER;

  return ErrorCategory.UNKNOWN;
}

/**
 * Determina se erro é recuperável (usuário pode tentar novamente)
 */
export function isRecoverableError(error: unknown): boolean {
  const category = categorizeError(error);
  return [ErrorCategory.NETWORK, ErrorCategory.SERVER].includes(category);
}

/**
 * Formata erro para logging em produção
 */
export function formatErrorForLogging(error: unknown, context?: Record<string, unknown>) {
  const appError = parseSupabaseError(error);

  return {
    timestamp: new Date().toISOString(),
    error: {
      title: appError.title,
      message: appError.message,
      code: appError.code,
      technical: appError.technical,
    },
    context,
    category: categorizeError(error),
    recoverable: isRecoverableError(error),
  };
}
