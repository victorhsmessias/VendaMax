import { useState } from "react";

/**
 * Hook reutilizável para gerenciar estado de paginação
 * 
 * Gerencia apenas o estado da página atual (começa em 1).
 * O totalPages e totalItems vêm da query/resposta do servidor.
 *
 * @param initialPage - Página inicial (padrão: 1)
 * @param pageSize - Tamanho da página (mantido para compatibilidade, não usado internamente)
 * @returns Objeto com estado e funções de paginação
 *
 * @example
 * const { currentPage, goToPage } = usePagination(1, 10);
 */
export function usePagination(initialPage: number = 1, pageSize?: number) {
  const [currentPage, setCurrentPage] = useState(initialPage);

  const goToPage = (page: number) => {
    const pageNumber = Math.max(1, page); // Garantir que seja pelo menos 1
    setCurrentPage(pageNumber);
  };

  return {
    currentPage,
    goToPage,
    setCurrentPage,
  };
}
