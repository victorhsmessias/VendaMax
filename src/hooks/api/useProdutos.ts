import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUserId } from "@/hooks/useCurrentUser";
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
  quantidade_estoque: number;
  estoque_minimo: number;
  fornecedores?: { nome: string };
};

type ProdutoEstoqueBaixo = {
  id: string;
  nome: string;
  codigo: string | null;
  quantidade_estoque: number;
  estoque_minimo: number;
  diferenca: number;
};

/**
 * Hook para buscar todos os produtos ativos do usuário (sem paginação)
 */
export function useProdutos() {
  const { data: userId } = useCurrentUserId();
  const { handleError } = useErrorHandler();

  return useQuery({
    queryKey: ["produtos", userId],
    queryFn: async () => {
      if (!userId) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("produtos")
        .select("*, fornecedores(nome)")
        .eq("user_id", userId)
        .eq("ativo", true)
        .order("nome");

      if (error) throw error;
      return data as Produto[];
    },
    enabled: !!userId,
    onError: (error) => {
      handleError(error, { context: "Ao carregar produtos" });
    },
  });
}

/**
 * Hook para buscar produtos com paginação
 *
 * 📄 PAGINAÇÃO: Carrega apenas uma página de produtos por vez para melhor performance
 * 🔍 BUSCA: Filtra por nome ou código do produto (server-side)
 *
 * @param page - Número da página (começa em 1)
 * @param pageSize - Número de itens por página (padrão: 10)
 * @param search - Termo de busca (filtra por nome ou código)
 * @returns Dados paginados com informações de totalPages e totalItems
 */
export function useProdutosPaginated(page: number = 1, pageSize: number = 10, search: string = "") {
  const { data: userId } = useCurrentUserId();
  const { handleError } = useErrorHandler();

  return useQuery({
    queryKey: ["produtos", "paginated", userId, page, pageSize, search],
    queryFn: async () => {
      if (!userId) throw new Error("Usuário não autenticado");

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("produtos")
        .select("*, fornecedores(nome)", { count: "exact" })
        .eq("user_id", userId)
        .eq("ativo", true)
        .order("nome");

      // Adicionar filtro de busca se fornecido (busca por nome OU código)
      if (search) {
        query = query.or(`nome.ilike.%${search}%,codigo.ilike.%${search}%`);
      }

      const { data, error, count } = await query.range(from, to);

      if (error) throw error;

      return {
        data: data as Produto[],
        totalPages: Math.ceil((count || 0) / pageSize),
        totalItems: count || 0,
        currentPage: page,
        pageSize,
      };
    },
    enabled: !!userId,
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000, // 5 minutos - produtos mudam raramente
    gcTime: 10 * 60 * 1000, // 10 minutos
    refetchOnWindowFocus: false, // Não revalidar ao focar (dados estáveis)
    onError: (error) => {
      handleError(error, { context: "Ao carregar produtos" });
    },
  });
}

/**
 * Hook para buscar um produto específico por ID
 */
export function useProduto(id: string | undefined) {
  const { data: userId } = useCurrentUserId();
  const { handleError } = useErrorHandler();

  return useQuery({
    queryKey: ["produtos", id, userId],
    queryFn: async () => {
      if (!id || !userId) return null;

      const { data, error } = await supabase
        .from("produtos")
        .select("*, fornecedores(nome)")
        .eq("id", id)
        .eq("user_id", userId)
        .single();

      if (error) throw error;
      return data as Produto;
    },
    enabled: !!id && !!userId,
    onError: (error) => {
      handleError(error, { context: "Ao carregar produto" });
    },
  });
}

/**
 * Hook para criar um novo produto
 *
 * 🚀 OPTIMISTIC UPDATE: Adiciona produto instantaneamente à lista
 * antes da resposta do servidor, com rollback automático em caso de erro
 */
export function useCreateProduto() {
  const { data: userId } = useCurrentUserId();
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async (produto: TablesInsert<"produtos">) => {
      if (!userId) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("produtos")
        .insert({ ...produto, user_id: userId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (newProduto) => {
      if (!userId) return;

      await queryClient.cancelQueries({ queryKey: ["produtos", userId] });

      const previousProdutos = queryClient.getQueryData<Produto[]>(["produtos", userId]);

      if (previousProdutos) {
        const optimisticProduto: Produto = {
          id: `temp-${Date.now()}`,
          nome: newProduto.nome || "",
          codigo: newProduto.codigo || null,
          descricao: newProduto.descricao || null,
          preco_compra: newProduto.preco_compra || 0,
          preco_venda: newProduto.preco_venda || 0,
          margem_lucro: null, // Calculado pelo banco
          fornecedor_id: newProduto.fornecedor_id || null,
        };

        queryClient.setQueryData<Produto[]>(
          ["produtos", userId],
          [...previousProdutos, optimisticProduto]
        );
      }

      return { previousProdutos };
    },
    onError: (error, newProduto, context) => {
      if (context?.previousProdutos && userId) {
        queryClient.setQueryData(["produtos", userId], context.previousProdutos);
      }
      handleError(error, { context: "Ao criar produto" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
    },
  });
}

/**
 * Hook para atualizar um produto existente
 *
 * 🚀 OPTIMISTIC UPDATE: Atualiza produto instantaneamente na lista
 * antes da resposta do servidor, com rollback automático em caso de erro
 */
export function useUpdateProduto() {
  const { data: userId } = useCurrentUserId();
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async ({ id, ...produto }: TablesUpdate<"produtos"> & { id: string }) => {
      if (!userId) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("produtos")
        .update(produto)
        .eq("id", id)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (updatedData) => {
      if (!userId) return;

      await queryClient.cancelQueries({ queryKey: ["produtos", userId] });
      await queryClient.cancelQueries({ queryKey: ["produtos", updatedData.id] });

      const previousProdutos = queryClient.getQueryData<Produto[]>(["produtos", userId]);

      if (previousProdutos) {
        queryClient.setQueryData<Produto[]>(
          ["produtos", userId],
          previousProdutos.map((produto) =>
            produto.id === updatedData.id
              ? { ...produto, ...updatedData }
              : produto
          )
        );
      }

      return { previousProdutos };
    },
    onError: (error, updatedData, context) => {
      if (context?.previousProdutos && userId) {
        queryClient.setQueryData(["produtos", userId], context.previousProdutos);
      }
      handleError(error, { context: "Ao atualizar produto" });
    },
    onSettled: (data) => {
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
      if (data) {
        queryClient.invalidateQueries({ queryKey: ["produtos", data.id] });
      }
    },
  });
}

/**
 * Hook para deletar (soft delete) um produto
 *
 * 🚀 OPTIMISTIC UPDATE: Remove produto instantaneamente da lista
 * antes da resposta do servidor, com rollback automático em caso de erro
 */
export function useDeleteProduto() {
  const { data: userId } = useCurrentUserId();
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("produtos")
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

      await queryClient.cancelQueries({ queryKey: ["produtos", userId] });

      const previousProdutos = queryClient.getQueryData<Produto[]>(["produtos", userId]);

      if (previousProdutos) {
        queryClient.setQueryData<Produto[]>(
          ["produtos", userId],
          previousProdutos.filter((produto) => produto.id !== deletedId)
        );
      }

      return { previousProdutos };
    },
    onError: (error, deletedId, context) => {
      if (context?.previousProdutos && userId) {
        queryClient.setQueryData(["produtos", userId], context.previousProdutos);
      }
      handleError(error, { context: "Ao excluir produto" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
    },
  });
}

/**
 * Hook para buscar produtos com estoque baixo
 *
 * 📦 ESTOQUE: Retorna produtos com quantidade <= estoque_minimo
 * Útil para alertas e notificações de reposição
 */
export function useProdutosEstoqueBaixo() {
  const { data: userId } = useCurrentUserId();
  const { handleError } = useErrorHandler();

  return useQuery({
    queryKey: ["produtos", "estoque-baixo", userId],
    queryFn: async () => {
      if (!userId) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase.rpc("get_produtos_estoque_baixo");

      if (error) throw error;
      return data as ProdutoEstoqueBaixo[];
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutos - estoque muda com frequência
    refetchOnWindowFocus: true, // Revalidar ao focar (dados importantes)
    onError: (error) => {
      handleError(error, { context: "Ao carregar produtos com estoque baixo" });
    },
  });
}

/**
 * Hook para ajustar estoque manualmente
 *
 * 📦 AJUSTE DE ESTOQUE: Registra entrada, saída ou ajuste de estoque
 * Atualiza automaticamente a quantidade e registra movimentação
 */
export function useAjustarEstoque() {
  const { data: userId } = useCurrentUserId();
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async ({
      produto_id,
      tipo,
      quantidade,
      motivo,
    }: {
      produto_id: string;
      tipo: "ENTRADA" | "SAIDA" | "AJUSTE";
      quantidade: number;
      motivo?: string;
    }) => {
      if (!userId) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase.rpc("registrar_movimentacao_estoque", {
        p_produto_id: produto_id,
        p_tipo: tipo,
        p_quantidade: quantidade,
        p_motivo: motivo || null,
        p_venda_id: null,
      });

      if (error) throw error;
      return data;
    },
    onError: (error) => {
      handleError(error, { context: "Ao ajustar estoque" });
    },
    onSuccess: () => {
      // Invalidar todas as queries de produtos para atualizar estoque
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
    },
  });
}
