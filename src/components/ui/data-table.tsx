import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyTableRow } from "@/components/ui/empty-state";

interface Column<T> {
  header: string;
  accessor?: keyof T;
  cell?: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  data: T[] | undefined;
  columns: Column<T>[];
  isLoading?: boolean;
  error?: Error | unknown;
  onRetry?: () => void;
  emptyMessage?: string;
  keyExtractor: (item: T) => string;
  className?: string;
}

/**
 * Componente DataTable - Tabela com estados integrados (loading, error, empty)
 *
 * @example
 * ```tsx
 * const columns: Column<Cliente>[] = [
 *   { header: "Nome", accessor: "nome" },
 *   { header: "CPF", accessor: "cpf" },
 *   {
 *     header: "Ações",
 *     cell: (cliente) => (
 *       <div className="flex gap-2">
 *         <Button onClick={() => onEdit(cliente.id)}>Editar</Button>
 *         <Button onClick={() => onDelete(cliente.id)}>Excluir</Button>
 *       </div>
 *     )
 *   }
 * ];
 *
 * <DataTable
 *   data={clientes}
 *   columns={columns}
 *   isLoading={isLoading}
 *   error={error}
 *   keyExtractor={(cliente) => cliente.id}
 *   emptyMessage="Nenhum cliente cadastrado"
 * />
 * ```
 */
export function DataTable<T>({
  data,
  columns,
  isLoading,
  error,
  onRetry,
  emptyMessage = "Nenhum item encontrado",
  keyExtractor,
  className,
}: DataTableProps<T>) {
  // Estado: Loading
  if (isLoading) {
    return (
      <div className="rounded-md border">
        <LoadingState message="Carregando dados..." />
      </div>
    );
  }

  // Estado: Error
  if (error) {
    return (
      <div className="rounded-md border p-4">
        <ErrorState error={error} retry={onRetry} compact />
      </div>
    );
  }

  // Renderização normal
  return (
    <div className="rounded-md border">
      <Table className={className}>
        <TableHeader>
          <TableRow>
            {columns.map((column, index) => (
              <TableHead key={index} className={column.className}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {!data || data.length === 0 ? (
            <EmptyTableRow colSpan={columns.length} message={emptyMessage} />
          ) : (
            data.map((item) => (
              <TableRow key={keyExtractor(item)}>
                {columns.map((column, colIndex) => (
                  <TableCell key={colIndex} className={column.className}>
                    {column.cell
                      ? column.cell(item)
                      : column.accessor
                      ? String(item[column.accessor] || "-")
                      : "-"}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * Helper para criar colunas simples baseadas em accessor
 *
 * @example
 * ```tsx
 * const columns = [
 *   createColumn("Nome", "nome"),
 *   createColumn("Email", "email"),
 *   { header: "Ações", cell: (item) => <Button>Editar</Button> }
 * ];
 * ```
 */
export function createColumn<T>(
  header: string,
  accessor: keyof T,
  className?: string
): Column<T> {
  return { header, accessor, className };
}
