import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type Cliente = {
  id: string;
  nome: string;
  cpf: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  observacoes: string | null;
};

/**
 * Hook para buscar todos os clientes ativos
 */
export function useClientes() {
  const { handleError } = useErrorHandler();

  return useQuery({
    queryKey: ["clientes"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .eq("user_id", user.id)
        .eq("ativo", true)
        .order("nome");

      if (error) throw error;
      return data as Cliente[];
    },
    onError: (error) => {
      handleError(error, { context: "Ao carregar clientes" });
    },
  });
}

/**
 * Hook para criar novo cliente
 */
export function useCreateCliente() {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async (cliente: TablesInsert<"clientes">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("clientes")
        .insert({ ...cliente, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
    },
    onError: (error) => {
      handleError(error, { context: "Ao criar cliente" });
    },
  });
}

/**
 * Hook para atualizar cliente
 */
export function useUpdateCliente() {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async ({ id, ...cliente }: TablesUpdate<"clientes"> & { id: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("clientes")
        .update(cliente)
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
    },
    onError: (error) => {
      handleError(error, { context: "Ao atualizar cliente" });
    },
  });
}

/**
 * Hook para deletar cliente (soft delete)
 */
export function useDeleteCliente() {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("clientes")
        .update({ ativo: false })
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
    },
    onError: (error) => {
      handleError(error, { context: "Ao excluir cliente" });
    },
  });
}
