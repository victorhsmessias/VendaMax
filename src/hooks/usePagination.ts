import { useState } from "react";

/**
 * Hook reutilizável para gerenciar estado de paginação
 *
 * @param totalItems - Total de itens disponíveis
 * @param pageSize - Número de itens por página (padrão: 10)
 * @returns Objeto com estado e funções de paginação
 *
 * @example
 * const { currentPage, totalPages, nextPage, previousPage, goToPage } = usePagination(100, 10);
 */
export function usePagination(totalItems: number = 0, pageSize: number = 10) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(totalItems / pageSize);

  const nextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const previousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const goToPage = (page: number) => {
    const pageNumber = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(pageNumber);
  };

  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  return {
    currentPage,
    totalPages,
    pageSize,
    totalItems,
    nextPage,
    previousPage,
    goToPage,
    hasNextPage,
    hasPreviousPage,
    setCurrentPage,
  };
}
