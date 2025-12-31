import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  message?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  fullScreen?: boolean;
}

/**
 * Componente LoadingState - Indicador de carregamento consistente
 *
 * @example
 * ```tsx
 * // Em uma página
 * <LoadingState message="Carregando clientes..." />
 *
 * // Em uma tabela
 * <TableRow>
 *   <TableCell colSpan={5}>
 *     <LoadingState />
 *   </TableCell>
 * </TableRow>
 *
 * // Tela cheia
 * <LoadingState fullScreen message="Carregando..." />
 * ```
 */
export function LoadingState({
  message = "Carregando...",
  className,
  size = "md",
  fullScreen = false,
}: LoadingStateProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  const containerClasses = fullScreen
    ? "flex min-h-screen items-center justify-center"
    : "flex items-center justify-center p-8";

  return (
    <div className={cn(containerClasses, className)}>
      <div className="flex flex-col items-center gap-3">
        <Loader2
          className={cn(
            "animate-spin text-primary",
            sizeClasses[size]
          )}
          aria-label="Carregando"
        />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

/**
 * Componente LoadingSpinner - Apenas o spinner sem mensagem
 * Útil para botões e espaços pequenos
 *
 * @example
 * ```tsx
 * <Button disabled={isLoading}>
 *   {isLoading && <LoadingSpinner className="mr-2" />}
 *   Salvar
 * </Button>
 * ```
 */
export function LoadingSpinner({
  className,
  size = "sm",
}: Pick<LoadingStateProps, "className" | "size">) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  return (
    <Loader2
      className={cn("animate-spin", sizeClasses[size], className)}
      aria-label="Carregando"
    />
  );
}
