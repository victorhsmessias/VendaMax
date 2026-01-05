import { format, isValid, parseISO } from "date-fns";

/**
 * Interface para filtros genéricos de listagens
 */
export interface FilterConfig {
  dateFrom?: string;
  dateTo?: string;
  status?: string[];
  valueMin?: number;
  valueMax?: number;
  search?: string;
  [key: string]: string | string[] | number | undefined;
}

/**
 * Salva filtros no localStorage
 */
export function saveFiltersToStorage(key: string, filters: FilterConfig): void {
  try {
    // Limpar valores vazios antes de salvar
    const cleaned: FilterConfig = {};

    Object.entries(filters).forEach(([filterKey, value]) => {
      // Ignorar strings vazias
      if (typeof value === "string" && value.trim() === "") {
        return;
      }

      // Ignorar arrays vazios
      if (Array.isArray(value) && value.length === 0) {
        return;
      }

      // Ignorar undefined/null
      if (value === undefined || value === null) {
        return;
      }

      // Manter valores válidos
      cleaned[filterKey] = value;
    });

    // Só salvar se houver filtros válidos
    if (Object.keys(cleaned).length > 0) {
      localStorage.setItem(`filters_${key}`, JSON.stringify(cleaned));
    } else {
      // Se não há filtros válidos, remover do localStorage
      localStorage.removeItem(`filters_${key}`);
    }
  } catch (error) {
    console.error("Erro ao salvar filtros:", error);
  }
}

/**
 * Recupera filtros do localStorage
 */
export function loadFiltersFromStorage(key: string): FilterConfig | null {
  try {
    const stored = localStorage.getItem(`filters_${key}`);
    if (!stored) return null;

    const parsed = JSON.parse(stored);

    // Limpar valores vazios/inválidos que podem causar problemas (especialmente no Safari)
    const cleaned: FilterConfig = {};

    Object.entries(parsed).forEach(([filterKey, value]) => {
      // Ignorar strings vazias
      if (typeof value === "string" && value.trim() === "") {
        return;
      }

      // Ignorar arrays vazios
      if (Array.isArray(value) && value.length === 0) {
        return;
      }

      // Ignorar undefined/null
      if (value === undefined || value === null) {
        return;
      }

      // Manter valores válidos
      cleaned[filterKey] = value;
    });

    return Object.keys(cleaned).length > 0 ? cleaned : null;
  } catch (error) {
    console.error("Erro ao carregar filtros:", error);
    return null;
  }
}

/**
 * Remove filtros do localStorage
 */
export function clearFiltersFromStorage(key: string): void {
  try {
    localStorage.removeItem(`filters_${key}`);
  } catch (error) {
    console.error("Erro ao limpar filtros:", error);
  }
}

/**
 * Verifica se há filtros ativos (diferentes dos valores padrão)
 */
export function hasActiveFilters(filters: FilterConfig): boolean {
  return Object.entries(filters).some(([key, value]) => {
    // Ignorar strings vazias
    if (typeof value === "string" && value.trim() === "") return false;

    // Ignorar arrays vazios
    if (Array.isArray(value) && value.length === 0) return false;

    // Ignorar undefined/null
    if (value === undefined || value === null) return false;

    return true;
  });
}

/**
 * Reseta todos os filtros para valores padrão
 */
export function resetFilters(): FilterConfig {
  return {
    dateFrom: undefined,
    dateTo: undefined,
    status: [],
    valueMin: undefined,
    valueMax: undefined,
    search: "",
  };
}

/**
 * Formata data para exibição
 */
export function formatFilterDate(date: string | undefined): string {
  if (!date) return "";
  try {
    const parsed = parseISO(date);
    if (!isValid(parsed)) return "";
    return format(parsed, "dd/MM/yyyy");
  } catch {
    return "";
  }
}

/**
 * Formata valor monetário para exibição
 */
export function formatFilterValue(value: number | undefined): string {
  if (value === undefined || value === null) return "";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/**
 * Conta quantos filtros estão ativos
 */
export function countActiveFilters(filters: FilterConfig): number {
  let count = 0;

  if (filters.dateFrom || filters.dateTo) count++;
  if (filters.status && filters.status.length > 0) count++;
  if (filters.valueMin !== undefined || filters.valueMax !== undefined) count++;
  if (filters.search && filters.search.trim() !== "") count++;

  // Conta filtros customizados (que não sejam os padrões)
  Object.entries(filters).forEach(([key, value]) => {
    if (!["dateFrom", "dateTo", "status", "valueMin", "valueMax", "search"].includes(key)) {
      if (value !== undefined && value !== null && value !== "") {
        count++;
      }
    }
  });

  return count;
}

/**
 * Valida range de datas (data inicial deve ser menor que final)
 */
export function validateDateRange(dateFrom?: string, dateTo?: string): boolean {
  if (!dateFrom || !dateTo) return true;

  try {
    const from = parseISO(dateFrom);
    const to = parseISO(dateTo);

    if (!isValid(from) || !isValid(to)) return false;

    return from <= to;
  } catch {
    return false;
  }
}

/**
 * Valida range de valores (min deve ser menor que max)
 */
export function validateValueRange(min?: number, max?: number): boolean {
  if (min === undefined || max === undefined) return true;
  return min <= max;
}
