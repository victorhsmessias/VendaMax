import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type Produto = {
  id: string;
  nome: string;
  codigo: string | null;
  descricao: string | null;
  preco_compra: number;
  preco_venda: number;
  margem_lucro: number | null;
  fornecedor_id: string | null;
  fornecedores?: { nome: string };
};

/**
 * Hook para buscar todos os produtos ativos do usuário
 */
export function useProdutos() {
  const { handleError } = useErrorHandler();

  return useQuery({
    queryKey: ["produtos"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("produtos")
        .select("*, fornecedores(nome)")
        .eq("user_id", user.id)
        .eq("ativo", true)
        .order("nome");

      if (error) throw error;
      return data as Produto[];
    },
    onError: (error) => {
      handleError(error, { context: "Ao carregar produtos" });
    },
  });
}

/**
 * Hook para buscar um produto específico por ID
 */
export function useProduto(id: string | undefined) {
  const { handleError } = useErrorHandler();

  return useQuery({
    queryKey: ["produtos", id],
    queryFn: async () => {
      if (!id) return null;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("produtos")
        .select("*, fornecedores(nome)")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      return data as Produto;
    },
    enabled: !!id,
    onError: (error) => {
      handleError(error, { context: "Ao carregar produto" });
    },
  });
}

/**
 * Hook para criar um novo produto
 */
export function useCreateProduto() {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async (produto: TablesInsert<"produtos">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("produtos")
        .insert({ ...produto, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalida cache para forçar refetch
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
    },
    onError: (error) => {
      handleError(error, { context: "Ao criar produto" });
    },
  });
}

/**
 * Hook para atualizar um produto existente
 */
export function useUpdateProduto() {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async ({ id, ...produto }: TablesUpdate<"produtos"> & { id: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("produtos")
        .update(produto)
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalida queries relacionadas
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
      queryClient.invalidateQueries({ queryKey: ["produtos", data.id] });
    },
    onError: (error) => {
      handleError(error, { context: "Ao atualizar produto" });
    },
  });
}

/**
 * Hook para deletar (soft delete) um produto
 */
export function useDeleteProduto() {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("produtos")
        .update({ ativo: false })
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
    },
    onError: (error) => {
      handleError(error, { context: "Ao excluir produto" });
    },
  });
}
