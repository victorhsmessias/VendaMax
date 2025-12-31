import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  totalItems?: number;
  pageSize?: number;
}

/**
 * Componente de controles de paginação reutilizável
 *
 * Features:
 * - Botões de navegação (primeira, anterior, próxima, última)
 * - Indicador de página atual
 * - Informações de itens exibidos
 * - Responsivo
 */
export function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
  hasNextPage,
  hasPreviousPage,
  totalItems,
  pageSize,
}: PaginationControlsProps) {
  const handleFirstPage = () => onPageChange(1);
  const handleLastPage = () => onPageChange(totalPages);
  const handlePreviousPage = () => onPageChange(currentPage - 1);
  const handleNextPage = () => onPageChange(currentPage + 1);

  // Calcular range de itens exibidos
  const startItem = totalItems && pageSize ? (currentPage - 1) * pageSize + 1 : null;
  const endItem = totalItems && pageSize ? Math.min(currentPage * pageSize, totalItems) : null;

  if (totalPages <= 1) {
    return null; // Não mostrar paginação se só tem 1 página
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
      {/* Informação de itens */}
      {totalItems !== undefined && startItem !== null && endItem !== null && (
        <div className="text-sm text-muted-foreground">
          Mostrando <span className="font-medium">{startItem}</span> a{" "}
          <span className="font-medium">{endItem}</span> de{" "}
          <span className="font-medium">{totalItems}</span> {totalItems === 1 ? "item" : "itens"}
        </div>
      )}

      {/* Controles de navegação */}
      <div className="flex items-center gap-2">
        {/* Primeira página */}
        <Button
          variant="outline"
          size="icon"
          onClick={handleFirstPage}
          disabled={!hasPreviousPage}
          className="h-8 w-8"
          title="Primeira página"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>

        {/* Página anterior */}
        <Button
          variant="outline"
          size="icon"
          onClick={handlePreviousPage}
          disabled={!hasPreviousPage}
          className="h-8 w-8"
          title="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Indicador de página atual */}
        <div className="flex items-center gap-2 px-2">
          <span className="text-sm text-muted-foreground">Página</span>
          <span className="text-sm font-medium">
            {currentPage} de {totalPages}
          </span>
        </div>

        {/* Próxima página */}
        <Button
          variant="outline"
          size="icon"
          onClick={handleNextPage}
          disabled={!hasNextPage}
          className="h-8 w-8"
          title="Próxima página"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Última página */}
        <Button
          variant="outline"
          size="icon"
          onClick={handleLastPage}
          disabled={!hasNextPage}
          className="h-8 w-8"
          title="Última página"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
