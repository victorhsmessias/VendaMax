import { useState, useEffect, useCallback } from "react";
import type { FilterConfig } from "@/lib/utils/filters";
import {
  saveFiltersToStorage,
  loadFiltersFromStorage,
  clearFiltersFromStorage,
  hasActiveFilters,
  resetFilters as resetFiltersUtil,
  countActiveFilters,
} from "@/lib/utils/filters";

/**
 * Hook para gerenciar filtros com persistência em localStorage
 *
 * @param key - Chave única para identificar os filtros no localStorage
 * @param initialFilters - Valores iniciais dos filtros (opcional)
 *
 * @example
 * ```tsx
 * const {
 *   filters,
 *   setFilter,
 *   resetFilters,
 *   hasFilters,
 *   activeCount
 * } = useFilters("vendas", {
 *   dateFrom: undefined,
 *   dateTo: undefined,
 *   status: [],
 * });
 * ```
 */
export function useFilters(key: string, initialFilters: FilterConfig = {}) {
  // Estado dos filtros
  const [filters, setFilters] = useState<FilterConfig>(() => {
    // Tenta carregar do localStorage ao inicializar
    const stored = loadFiltersFromStorage(key);
    return stored || initialFilters;
  });

  // Atualizar localStorage quando filtros mudarem
  useEffect(() => {
    if (hasActiveFilters(filters)) {
      saveFiltersToStorage(key, filters);
    } else {
      clearFiltersFromStorage(key);
    }
  }, [key, filters]);

  /**
   * Atualiza um filtro específico
   */
  const setFilter = useCallback(
    <K extends keyof FilterConfig>(filterKey: K, value: FilterConfig[K]) => {
      setFilters((prev) => ({
        ...prev,
        [filterKey]: value,
      }));
    },
    []
  );

  /**
   * Atualiza múltiplos filtros de uma vez
   */
  const setMultipleFilters = useCallback((newFilters: Partial<FilterConfig>) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
    }));
  }, []);

  /**
   * Reseta todos os filtros para valores padrão
   */
  const resetFilters = useCallback(() => {
    const defaultFilters = resetFiltersUtil();
    setFilters({ ...initialFilters, ...defaultFilters });
    clearFiltersFromStorage(key);
  }, [key, initialFilters]);

  /**
   * Verifica se há filtros ativos
   */
  const hasFilters = hasActiveFilters(filters);

  /**
   * Conta quantos filtros estão ativos
   */
  const activeCount = countActiveFilters(filters);

  return {
    filters,
    setFilter,
    setMultipleFilters,
    resetFilters,
    hasFilters,
    activeCount,
  };
}
