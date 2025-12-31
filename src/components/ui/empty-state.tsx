import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

/**
 * Componente EmptyState - Estado vazio quando não há dados
 *
 * @example
 * ```tsx
 * import { Users } from "lucide-react";
 *
 * <EmptyState
 *   icon={Users}
 *   title="Nenhum cliente cadastrado"
 *   description="Clique em 'Novo Cliente' para começar"
 *   action={{
 *     label: "Novo Cliente",
 *     onClick: () => setOpen(true)
 *   }}
 * />
 * ```
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 text-center", className)}>
      {Icon && (
        <div className="rounded-full bg-muted p-4 mb-4">
          <Icon className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        </div>
      )}

      <h3 className="text-lg font-semibold mb-2">{title}</h3>

      {description && (
        <p className="text-sm text-muted-foreground mb-6 max-w-sm">
          {description}
        </p>
      )}

      {action && (
        <Button onClick={action.onClick} variant="outline">
          {action.label}
        </Button>
      )}
    </div>
  );
}

/**
 * Componente EmptyTableRow - Estado vazio para uso em tabelas
 *
 * @example
 * ```tsx
 * <TableBody>
 *   {data.length === 0 ? (
 *     <EmptyTableRow colSpan={5} message="Nenhum cliente encontrado" />
 *   ) : (
 *     data.map(item => <TableRow key={item.id}>...</TableRow>)
 *   )}
 * </TableBody>
 * ```
 */
interface EmptyTableRowProps {
  colSpan: number;
  message: string;
}

export function EmptyTableRow({ colSpan, message }: EmptyTableRowProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="h-24 text-center">
        <p className="text-sm text-muted-foreground">{message}</p>
      </td>
    </tr>
  );
}
