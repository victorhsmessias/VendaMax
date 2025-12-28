import { useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { parseSupabaseError, formatErrorForLogging, isRecoverableError } from "@/lib/utils/errors";

/**
 * Hook para tratamento consistente de erros na aplicação
 *
 * @example
 * const { handleError, handleAsyncError } = useErrorHandler();
 *
 * // Uso síncrono
 * try {
 *   // código que pode falhar
 * } catch (error) {
 *   handleError(error, { context: "Ao salvar produto" });
 * }
 *
 * // Uso assíncrono (wrapper)
 * await handleAsyncError(
 *   async () => await supabase.from("produtos").insert(data),
 *   { context: "Ao salvar produto", successMessage: "Produto salvo!" }
 * );
 */
export function useErrorHandler() {
  const { toast } = useToast();

  /**
   * Trata erro e exibe notificação apropriada
   */
  const handleError = useCallback(
    (
      error: unknown,
      options?: {
        context?: string;
        silent?: boolean;
        onError?: (error: unknown) => void;
      }
    ) => {
      const appError = parseSupabaseError(error);
      const recoverable = isRecoverableError(error);

      // Log do erro (em produção, enviaria para serviço de logging)
      if (import.meta.env.PROD) {
        console.error(formatErrorForLogging(error, { context: options?.context }));
      } else {
        console.error("[ErrorHandler]", options?.context || "Error:", error);
      }

      // Exibe notificação se não for silencioso
      if (!options?.silent) {
        toast({
          title: appError.title,
          description: options?.context
            ? `${options.context}: ${appError.message}`
            : appError.message,
          variant: "destructive",
          duration: recoverable ? 5000 : 7000,
        });
      }

      // Callback customizado de erro
      if (options?.onError) {
        options.onError(error);
      }

      return appError;
    },
    [toast]
  );

  /**
   * Wrapper para funções assíncronas com tratamento de erro automático
   */
  const handleAsyncError = useCallback(
    async <T,>(
      asyncFn: () => Promise<T>,
      options?: {
        context?: string;
        successMessage?: string;
        silent?: boolean;
        onSuccess?: (data: T) => void;
        onError?: (error: unknown) => void;
      }
    ): Promise<T | null> => {
      try {
        const result = await asyncFn();

        // Mensagem de sucesso
        if (options?.successMessage) {
          toast({
            title: "Sucesso",
            description: options.successMessage,
          });
        }

        // Callback de sucesso
        if (options?.onSuccess) {
          options.onSuccess(result);
        }

        return result;
      } catch (error) {
        handleError(error, {
          context: options?.context,
          silent: options?.silent,
          onError: options?.onError,
        });
        return null;
      }
    },
    [handleError, toast]
  );

  /**
   * Wrapper para operações do Supabase
   */
  const handleSupabaseOperation = useCallback(
    async <T,>(
      operation: () => Promise<{ data: T | null; error: any }>,
      options?: {
        context?: string;
        successMessage?: string;
        onSuccess?: (data: T) => void;
      }
    ): Promise<T | null> => {
      try {
        const { data, error } = await operation();

        if (error) {
          throw error;
        }

        if (!data) {
          throw new Error("Nenhum dado retornado");
        }

        // Mensagem de sucesso
        if (options?.successMessage) {
          toast({
            title: "Sucesso",
            description: options.successMessage,
          });
        }

        // Callback de sucesso
        if (options?.onSuccess) {
          options.onSuccess(data);
        }

        return data;
      } catch (error) {
        handleError(error, { context: options?.context });
        return null;
      }
    },
    [handleError, toast]
  );

  return {
    handleError,
    handleAsyncError,
    handleSupabaseOperation,
  };
}
