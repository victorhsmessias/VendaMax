import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUserId } from "@/hooks/useCurrentUser";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type Fornecedor = {
  id: string;
  nome: string;
  cnpj: string | null;
  telefone: string | null;
  email: string | null;
  site: string | null;
  observacoes: string | null;
};

/**
 * Hook para buscar todos os fornecedores ativos
 */
export function useFornecedores() {
  const { data: userId } = useCurrentUserId();
  const { handleError } = useErrorHandler();

  return useQuery({
    queryKey: ["fornecedores", userId],
    queryFn: async () => {
      if (!userId) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("fornecedores")
        .select("*")
        .eq("user_id", userId)
        .eq("ativo", true)
        .order("nome");

      if (error) throw error;
      return data as Fornecedor[];
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutos - fornecedores mudam muito raramente
    gcTime: 15 * 60 * 1000, // 15 minutos
    refetchOnWindowFocus: false, // Não revalidar ao focar (dados muito estáveis)
    onError: (error) => {
      handleError(error, { context: "Ao carregar fornecedores" });
    },
  });
}

/**
 * Hook para criar novo fornecedor
 *
 * 🚀 OPTIMISTIC UPDATE: Adiciona fornecedor instantaneamente à lista
 * antes da resposta do servidor, com rollback automático em caso de erro
 */
export function useCreateFornecedor() {
  const { data: userId } = useCurrentUserId();
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async (fornecedor: TablesInsert<"fornecedores">) => {
      if (!userId) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("fornecedores")
        .insert({ ...fornecedor, user_id: userId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (newFornecedor) => {
      if (!userId) return;

      await queryClient.cancelQueries({ queryKey: ["fornecedores", userId] });

      const previousFornecedores = queryClient.getQueryData<Fornecedor[]>(["fornecedores", userId]);

      if (previousFornecedores) {
        const optimisticFornecedor: Fornecedor = {
          id: `temp-${Date.now()}`,
          nome: newFornecedor.nome || "",
          cnpj: newFornecedor.cnpj || null,
          telefone: newFornecedor.telefone || null,
          email: newFornecedor.email || null,
          site: newFornecedor.site || null,
          observacoes: newFornecedor.observacoes || null,
        };

        queryClient.setQueryData<Fornecedor[]>(
          ["fornecedores", userId],
          [...previousFornecedores, optimisticFornecedor]
        );
      }

      return { previousFornecedores };
    },
    onError: (error, newFornecedor, context) => {
      if (context?.previousFornecedores && userId) {
        queryClient.setQueryData(["fornecedores", userId], context.previousFornecedores);
      }
      handleError(error, { context: "Ao criar fornecedor" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["fornecedores"] });
    },
  });
}

/**
 * Hook para atualizar fornecedor
 *
 * 🚀 OPTIMISTIC UPDATE: Atualiza fornecedor instantaneamente na lista
 * antes da resposta do servidor, com rollback automático em caso de erro
 */
export function useUpdateFornecedor() {
  const { data: userId } = useCurrentUserId();
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async ({ id, ...fornecedor }: TablesUpdate<"fornecedores"> & { id: string }) => {
      if (!userId) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("fornecedores")
        .update(fornecedor)
        .eq("id", id)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (updatedData) => {
      if (!userId) return;

      await queryClient.cancelQueries({ queryKey: ["fornecedores", userId] });

      const previousFornecedores = queryClient.getQueryData<Fornecedor[]>(["fornecedores", userId]);

      if (previousFornecedores) {
        queryClient.setQueryData<Fornecedor[]>(
          ["fornecedores", userId],
          previousFornecedores.map((fornecedor) =>
            fornecedor.id === updatedData.id
              ? { ...fornecedor, ...updatedData }
              : fornecedor
          )
        );
      }

      return { previousFornecedores };
    },
    onError: (error, updatedData, context) => {
      if (context?.previousFornecedores && userId) {
        queryClient.setQueryData(["fornecedores", userId], context.previousFornecedores);
      }
      handleError(error, { context: "Ao atualizar fornecedor" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["fornecedores"] });
    },
  });
}

/**
 * Hook para deletar fornecedor (soft delete)
 *
 * 🚀 OPTIMISTIC UPDATE: Remove fornecedor instantaneamente da lista
 * antes da resposta do servidor, com rollback automático em caso de erro
 */
export function useDeleteFornecedor() {
  const { data: userId } = useCurrentUserId();
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("fornecedores")
        .update({ ativo: false })
        .eq("id", id)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (deletedId) => {
      if (!userId) return;

      await queryClient.cancelQueries({ queryKey: ["fornecedores", userId] });

      const previousFornecedores = queryClient.getQueryData<Fornecedor[]>(["fornecedores", userId]);

      if (previousFornecedores) {
        queryClient.setQueryData<Fornecedor[]>(
          ["fornecedores", userId],
          previousFornecedores.filter((fornecedor) => fornecedor.id !== deletedId)
        );
      }

      return { previousFornecedores };
    },
    onError: (error, deletedId, context) => {
      if (context?.previousFornecedores && userId) {
        queryClient.setQueryData(["fornecedores", userId], context.previousFornecedores);
      }
      handleError(error, { context: "Ao excluir fornecedor" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["fornecedores"] });
    },
  });
}
