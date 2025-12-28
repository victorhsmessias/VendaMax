import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  const { handleError } = useErrorHandler();

  return useQuery({
    queryKey: ["fornecedores"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("fornecedores")
        .select("*")
        .eq("user_id", user.id)
        .eq("ativo", true)
        .order("nome");

      if (error) throw error;
      return data as Fornecedor[];
    },
    onError: (error) => {
      handleError(error, { context: "Ao carregar fornecedores" });
    },
  });
}

/**
 * Hook para criar novo fornecedor
 */
export function useCreateFornecedor() {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async (fornecedor: TablesInsert<"fornecedores">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("fornecedores")
        .insert({ ...fornecedor, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fornecedores"] });
    },
    onError: (error) => {
      handleError(error, { context: "Ao criar fornecedor" });
    },
  });
}

/**
 * Hook para atualizar fornecedor
 */
export function useUpdateFornecedor() {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async ({ id, ...fornecedor }: TablesUpdate<"fornecedores"> & { id: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("fornecedores")
        .update(fornecedor)
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fornecedores"] });
    },
    onError: (error) => {
      handleError(error, { context: "Ao atualizar fornecedor" });
    },
  });
}

/**
 * Hook para deletar fornecedor (soft delete)
 */
export function useDeleteFornecedor() {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("fornecedores")
        .update({ ativo: false })
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fornecedores"] });
    },
    onError: (error) => {
      handleError(error, { context: "Ao excluir fornecedor" });
    },
  });
}
