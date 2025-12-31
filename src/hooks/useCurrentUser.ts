import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

/**
 * Hook para obter o usuário autenticado atual
 *
 * @description
 * Centraliza a lógica de autenticação e cacheia o resultado usando React Query.
 * O cache é mantido indefinidamente (staleTime: Infinity) pois o usuário não muda
 * durante a sessão. Apenas é invalidado quando o usuário faz logout.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { data: user, isLoading, error } = useCurrentUser();
 *
 *   if (isLoading) return <div>Carregando...</div>;
 *   if (error) return <div>Erro ao carregar usuário</div>;
 *   if (!user) return <div>Não autenticado</div>;
 *
 *   return <div>Olá, {user.email}</div>;
 * }
 * ```
 *
 * @returns Query com o usuário atual ou null se não autenticado
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: ["currentUser"],
    queryFn: async (): Promise<User> => {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error) {
        throw new Error(`Erro ao obter usuário: ${error.message}`);
      }

      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      return user;
    },
    // Cache infinito - usuário não muda durante a sessão
    staleTime: Infinity,
    // Não refetch automaticamente
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    // Retry apenas 1 vez em caso de erro
    retry: 1,
  });
}

/**
 * Hook para obter apenas o ID do usuário atual
 *
 * @description
 * Versão otimizada que retorna apenas o user_id (UUID).
 * Útil quando você só precisa do ID para queries/mutations.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { data: userId } = useCurrentUserId();
 *
 *   const { data: clientes } = useQuery({
 *     queryKey: ["clientes", userId],
 *     queryFn: () => fetchClientes(userId),
 *     enabled: !!userId,
 *   });
 * }
 * ```
 *
 * @returns Query com o UUID do usuário ou undefined se não autenticado
 */
export function useCurrentUserId() {
  const { data: user, ...rest } = useCurrentUser();

  return {
    data: user?.id,
    ...rest,
  };
}

/**
 * Hook para verificar se o usuário está autenticado
 *
 * @description
 * Versão simplificada que retorna apenas boolean.
 * Útil para renderização condicional.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isAuthenticated, isLoading } = useIsAuthenticated();
 *
 *   if (isLoading) return <Spinner />;
 *   if (!isAuthenticated) return <LoginPrompt />;
 *
 *   return <Dashboard />;
 * }
 * ```
 *
 * @returns Objeto com isAuthenticated (boolean) e isLoading
 */
export function useIsAuthenticated() {
  const { data: user, isLoading, isError } = useCurrentUser();

  return {
    isAuthenticated: !isLoading && !isError && !!user,
    isLoading,
  };
}

/**
 * Helper para invalidar o cache do usuário atual
 *
 * @description
 * Use esta função quando o usuário fizer logout ou quando
 * os dados do usuário mudarem (ex: atualização de perfil).
 *
 * @example
 * ```tsx
 * import { useQueryClient } from "@tanstack/react-query";
 * import { invalidateCurrentUser } from "@/hooks/useCurrentUser";
 *
 * function LogoutButton() {
 *   const queryClient = useQueryClient();
 *
 *   const handleLogout = async () => {
 *     await supabase.auth.signOut();
 *     invalidateCurrentUser(queryClient);
 *   };
 * }
 * ```
 */
export function invalidateCurrentUser(queryClient: any) {
  queryClient.invalidateQueries({ queryKey: ["currentUser"] });
}
