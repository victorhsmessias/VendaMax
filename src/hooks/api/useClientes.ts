import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUserId } from "@/hooks/useCurrentUser";
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
 * Hook para buscar todos os clientes ativos (sem paginação)
 */
export function useClientes() {
  const { data: userId } = useCurrentUserId();
  const { handleError } = useErrorHandler();

  return useQuery({
    queryKey: ["clientes", userId],
    queryFn: async () => {
      if (!userId) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .eq("user_id", userId)
        .eq("ativo", true)
        .order("nome");

      if (error) throw error;
      return data as Cliente[];
    },
    enabled: !!userId,
    onError: (error) => {
      handleError(error, { context: "Ao carregar clientes" });
    },
  });
}

export interface ClientesFilters {
  search?: string;
  cidade?: string;
  estado?: string;
}

/**
 * Hook para buscar clientes com paginação e filtros avançados
 *
 * 📄 PAGINAÇÃO: Carrega apenas uma página de clientes por vez para melhor performance
 * 🔍 BUSCA: Filtra por nome do cliente (server-side)
 * 🔥 FILTROS AVANÇADOS: Cidade, estado
 *
 * @param page - Número da página (começa em 1)
 * @param pageSize - Número de itens por página (padrão: 10)
 * @param filters - Objeto com filtros avançados (search, cidade, estado)
 * @returns Dados paginados com informações de totalPages e totalItems
 */
export function useClientesPaginated(page: number = 1, pageSize: number = 10, filters: ClientesFilters = {}) {
  const { data: userId } = useCurrentUserId();
  const { handleError } = useErrorHandler();

  return useQuery({
    queryKey: ["clientes", "paginated", userId, page, pageSize, filters],
    queryFn: async () => {
      if (!userId) throw new Error("Usuário não autenticado");

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("clientes")
        .select("*", { count: "exact" })
        .eq("user_id", userId)
        .eq("ativo", true)
        .order("nome");

      // Filtro de busca por nome
      if (filters.search) {
        query = query.ilike("nome", `%${filters.search}%`);
      }

      // Filtro por cidade
      if (filters.cidade) {
        query = query.eq("cidade", filters.cidade);
      }

      // Filtro por estado
      if (filters.estado) {
        query = query.eq("estado", filters.estado);
      }

      const { data, error, count } = await query.range(from, to);

      if (error) throw error;

      return {
        data: data as Cliente[],
        totalPages: Math.ceil((count || 0) / pageSize),
        totalItems: count || 0,
        currentPage: page,
        pageSize,
      };
    },
    enabled: !!userId,
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000, // 5 minutos - clientes mudam raramente
    gcTime: 10 * 60 * 1000, // 10 minutos
    refetchOnWindowFocus: false, // Não revalidar ao focar (dados estáveis)
    onError: (error) => {
      handleError(error, { context: "Ao carregar clientes" });
    },
  });
}

/**
 * Hook para criar novo cliente
 *
 * 🚀 OPTIMISTIC UPDATE: Adiciona cliente instantaneamente à lista
 * antes da resposta do servidor, com rollback automático em caso de erro
 */
export function useCreateCliente() {
  const { data: userId } = useCurrentUserId();
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async (cliente: TablesInsert<"clientes">) => {
      if (!userId) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("clientes")
        .insert({ ...cliente, user_id: userId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (newCliente) => {
      if (!userId) return;

      // Cancelar queries em andamento para evitar race conditions
      await queryClient.cancelQueries({ queryKey: ["clientes", userId] });

      // Snapshot do estado anterior
      const previousClientes = queryClient.getQueryData<Cliente[]>(["clientes", userId]);

      // Optimistic update: adicionar cliente com ID temporário
      if (previousClientes) {
        const optimisticCliente: Cliente = {
          id: `temp-${Date.now()}`, // ID temporário
          nome: newCliente.nome || "",
          cpf: newCliente.cpf || null,
          telefone: newCliente.telefone || null,
          email: newCliente.email || null,
          endereco: newCliente.endereco || null,
          bairro: newCliente.bairro || null,
          cidade: newCliente.cidade || null,
          estado: newCliente.estado || null,
          cep: newCliente.cep || null,
          observacoes: newCliente.observacoes || null,
        };

        queryClient.setQueryData<Cliente[]>(
          ["clientes", userId],
          [...previousClientes, optimisticCliente]
        );
      }

      // Retornar contexto com snapshot para rollback
      return { previousClientes };
    },
    onError: (error, newCliente, context) => {
      // Rollback: restaurar estado anterior em caso de erro
      if (context?.previousClientes && userId) {
        queryClient.setQueryData(["clientes", userId], context.previousClientes);
      }
      handleError(error, { context: "Ao criar cliente" });
    },
    onSettled: () => {
      // Revalidar após sucesso ou erro
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
    },
  });
}

/**
 * Hook para atualizar cliente
 *
 * 🚀 OPTIMISTIC UPDATE: Atualiza cliente instantaneamente na lista
 * antes da resposta do servidor, com rollback automático em caso de erro
 */
export function useUpdateCliente() {
  const { data: userId } = useCurrentUserId();
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async ({ id, ...cliente }: TablesUpdate<"clientes"> & { id: string }) => {
      if (!userId) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("clientes")
        .update(cliente)
        .eq("id", id)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (updatedData) => {
      if (!userId) return;

      // Cancelar queries em andamento
      await queryClient.cancelQueries({ queryKey: ["clientes", userId] });

      // Snapshot do estado anterior
      const previousClientes = queryClient.getQueryData<Cliente[]>(["clientes", userId]);

      // Optimistic update: atualizar cliente na lista
      if (previousClientes) {
        queryClient.setQueryData<Cliente[]>(
          ["clientes", userId],
          previousClientes.map((cliente) =>
            cliente.id === updatedData.id
              ? { ...cliente, ...updatedData }
              : cliente
          )
        );
      }

      // Retornar contexto com snapshot
      return { previousClientes };
    },
    onError: (error, updatedData, context) => {
      // Rollback: restaurar estado anterior em caso de erro
      if (context?.previousClientes && userId) {
        queryClient.setQueryData(["clientes", userId], context.previousClientes);
      }
      handleError(error, { context: "Ao atualizar cliente" });
    },
    onSettled: () => {
      // Revalidar após sucesso ou erro
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
    },
  });
}

/**
 * Hook para deletar cliente (soft delete)
 *
 * 🚀 OPTIMISTIC UPDATE: Remove cliente instantaneamente da lista
 * antes da resposta do servidor, com rollback automático em caso de erro
 */
export function useDeleteCliente() {
  const { data: userId } = useCurrentUserId();
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("clientes")
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

      // Cancelar queries em andamento
      await queryClient.cancelQueries({ queryKey: ["clientes", userId] });

      // Snapshot do estado anterior
      const previousClientes = queryClient.getQueryData<Cliente[]>(["clientes", userId]);

      // Optimistic update: remover cliente da lista
      if (previousClientes) {
        queryClient.setQueryData<Cliente[]>(
          ["clientes", userId],
          previousClientes.filter((cliente) => cliente.id !== deletedId)
        );
      }

      // Retornar contexto com snapshot
      return { previousClientes };
    },
    onError: (error, deletedId, context) => {
      // Rollback: restaurar estado anterior em caso de erro
      if (context?.previousClientes && userId) {
        queryClient.setQueryData(["clientes", userId], context.previousClientes);
      }
      handleError(error, { context: "Ao excluir cliente" });
    },
    onSettled: () => {
      // Revalidar após sucesso ou erro
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
    },
  });
}
