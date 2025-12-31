import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  error: Error | unknown;
  retry?: () => void;
  className?: string;
  title?: string;
  compact?: boolean;
}

/**
 * Componente ErrorState - Feedback de erro consistente
 *
 * @example
 * ```tsx
 * const { data, error, refetch } = useClientes();
 *
 * if (error) {
 *   return <ErrorState error={error} retry={refetch} />;
 * }
 * ```
 */
export function ErrorState({
  error,
  retry,
  className,
  title = "Erro ao carregar dados",
  compact = false,
}: ErrorStateProps) {
  const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido";

  if (compact) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Erro</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>{errorMessage}</span>
          {retry && (
            <Button
              variant="outline"
              size="sm"
              onClick={retry}
              className="ml-4"
            >
              <RefreshCw className="h-3 w-3 mr-2" />
              Tentar novamente
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={cn("flex flex-col items-center justify-center p-8 text-center", className)}>
      <div className="rounded-full bg-destructive/10 p-4 mb-4">
        <AlertCircle className="h-8 w-8 text-destructive" aria-hidden="true" />
      </div>

      <h3 className="text-lg font-semibold mb-2">{title}</h3>

      <p className="text-sm text-muted-foreground mb-6 max-w-md">
        {errorMessage}
      </p>

      {retry && (
        <Button onClick={retry} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Tentar novamente
        </Button>
      )}
    </div>
  );
}

/**
 * Componente ErrorBoundaryFallback - Para uso com React Error Boundaries
 *
 * @example
 * ```tsx
 * <ErrorBoundary fallback={<ErrorBoundaryFallback />}>
 *   <App />
 * </ErrorBoundary>
 * ```
 */
interface ErrorBoundaryFallbackProps {
  error?: Error;
  resetErrorBoundary?: () => void;
}

export function ErrorBoundaryFallback({
  error,
  resetErrorBoundary,
}: ErrorBoundaryFallbackProps) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="rounded-full bg-destructive/10 p-4 mb-4 inline-block">
          <AlertCircle className="h-12 w-12 text-destructive" />
        </div>

        <h1 className="text-2xl font-bold mb-2">Algo deu errado</h1>

        <p className="text-muted-foreground mb-6 max-w-md">
          {error?.message || "Ocorreu um erro inesperado na aplicação"}
        </p>

        {resetErrorBoundary && (
          <Button onClick={resetErrorBoundary}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Recarregar aplicação
          </Button>
        )}
      </div>
    </div>
  );
}
