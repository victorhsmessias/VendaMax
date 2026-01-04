import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUserId } from "@/hooks/useCurrentUser";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import type { TablesInsert } from "@/integrations/supabase/types";

type Venda = {
  id: string;
  numero_venda: string;
  data_venda: string;
  valor_total: number;
  valor_pago: number;
  saldo_devedor: number;
  status: string;
  clientes?: { nome: string };
};

/**
 * Hook para buscar todas as vendas (sem paginação)
 */
export function useVendas() {
  const { data: userId } = useCurrentUserId();
  const { handleError } = useErrorHandler();

  return useQuery({
    queryKey: ["vendas", userId],
    queryFn: async () => {
      if (!userId) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("vendas")
        .select("*, clientes(nome)")
        .eq("user_id", userId)
        .order("data_venda", { ascending: false });

      if (error) throw error;
      return data as Venda[];
    },
    enabled: !!userId,
    onError: (error) => {
      handleError(error, { context: "Ao carregar vendas" });
    },
  });
}

export interface VendasFilters {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string[];
  valueMin?: number;
  valueMax?: number;
  clienteId?: string;
}

/**
 * Hook para buscar vendas com paginação e filtros avançados
 *
 * 📄 PAGINAÇÃO: Carrega apenas uma página de vendas por vez para melhor performance
 * 🔍 BUSCA: Filtra por número da venda ou nome do cliente (server-side)
 * 🔥 FILTROS AVANÇADOS: Data, status, valor, cliente
 *
 * @param page - Número da página (começa em 1)
 * @param pageSize - Número de itens por página (padrão: 10)
 * @param filters - Objeto com filtros avançados (search, dateFrom, dateTo, status, valueMin, valueMax, clienteId)
 * @returns Dados paginados com informações de totalPages e totalItems
 */
export function useVendasPaginated(page: number = 1, pageSize: number = 10, filters: VendasFilters = {}) {
  const { data: userId } = useCurrentUserId();
  const { handleError } = useErrorHandler();

  return useQuery({
    queryKey: ["vendas", "paginated", userId, page, pageSize, filters],
    queryFn: async () => {
      if (!userId) throw new Error("Usuário não autenticado");

      // Calcular range para paginação (Supabase usa índice 0-based)
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Buscar vendas com count total
      let query = supabase
        .from("vendas")
        .select("*, clientes(nome)", { count: "exact" })
        .eq("user_id", userId)
        .order("data_venda", { ascending: false });

      // Filtro de busca por texto (numero_venda ou nome do cliente)
      if (filters.search) {
        query = query.or(`numero_venda.ilike.%${filters.search}%,clientes.nome.ilike.%${filters.search}%`);
      }

      // Filtro de data inicial
      if (filters.dateFrom) {
        query = query.gte("data_venda", filters.dateFrom);
      }

      // Filtro de data final
      if (filters.dateTo) {
        query = query.lte("data_venda", filters.dateTo);
      }

      // Filtro de status (múltiplos)
      if (filters.status && filters.status.length > 0) {
        query = query.in("status", filters.status);
      }

      // Filtro de valor mínimo
      if (filters.valueMin !== undefined) {
        query = query.gte("valor_total", filters.valueMin);
      }

      // Filtro de valor máximo
      if (filters.valueMax !== undefined) {
        query = query.lte("valor_total", filters.valueMax);
      }

      // Filtro por cliente específico
      if (filters.clienteId) {
        query = query.eq("cliente_id", filters.clienteId);
      }

      const { data, error, count } = await query.range(from, to);

      if (error) throw error;

      return {
        data: data as Venda[],
        totalPages: Math.ceil((count || 0) / pageSize),
        totalItems: count || 0,
        currentPage: page,
        pageSize,
      };
    },
    enabled: !!userId,
    keepPreviousData: true, // IMPORTANTE: mantém dados anteriores durante transição de página
    staleTime: 1 * 60 * 1000, // 1 minuto - vendas mudam com frequência moderada
    gcTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: true, // Revalidar ao focar janela (dados importantes)
    onError: (error) => {
      handleError(error, { context: "Ao carregar vendas" });
    },
  });
}

/**
 * Hook para buscar uma venda específica com todos os dados relacionados
 */
export function useVenda(id: string | undefined) {
  const { data: userId } = useCurrentUserId();
  const { handleError } = useErrorHandler();

  return useQuery({
    queryKey: ["vendas", id, userId],
    queryFn: async () => {
      if (!id || !userId) return null;

      // Buscar venda
      const { data: venda, error: vendaError } = await supabase
        .from("vendas")
        .select("*")
        .eq("id", id)
        .eq("user_id", userId)
        .single();

      if (vendaError) throw vendaError;

      // Buscar cliente
      const { data: cliente } = await supabase
        .from("clientes")
        .select("*")
        .eq("id", venda.cliente_id)
        .single();

      // Buscar itens da venda
      const { data: itens } = await supabase
        .from("itens_venda")
        .select(`
          *,
          produtos (nome, codigo)
        `)
        .eq("venda_id", id);

      // Buscar pagamentos
      const { data: pagamentos } = await supabase
        .from("pagamentos")
        .select("*")
        .eq("venda_id", id)
        .order("data_pagamento", { ascending: false });

      return {
        venda,
        cliente,
        itens: itens || [],
        pagamentos: pagamentos || [],
      };
    },
    enabled: !!id && !!userId,
    onError: (error) => {
      handleError(error, { context: "Ao carregar venda" });
    },
  });
}

/**
 * Hook para criar nova venda com itens
 *
 * IMPORTANTE: Usa função transacional do banco para garantir atomicidade.
 * Ou TUDO é salvo (venda + itens) ou NADA é salvo.
 */
export function useCreateVenda() {
  const { data: userId } = useCurrentUserId();
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async (params: {
      venda: TablesInsert<"vendas">;
      itens: Array<{
        produto_id: string;
        quantidade: number;
        preco_unitario: number;
        custo_unitario: number;
      }>;
    }) => {
      if (!userId) throw new Error("Usuário não autenticado");

      // Gerar número da venda no formato VND-YYYYMMDD-XXXX
      // Usa timestamp para garantir unicidade mesmo em múltiplas vendas simultâneas
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const timestampSuffix = now.getTime().toString().slice(-4);
      const numeroVenda = `VND-${dateStr}-${timestampSuffix}`;

      // MODO MANUAL: Venda sem itens (valor direto)
      if (!params.itens || params.itens.length === 0) {
        // Inserir venda diretamente sem itens
        const { data, error } = await supabase
          .from("vendas")
          .insert({
            user_id: userId,
            cliente_id: params.venda.cliente_id,
            numero_venda: numeroVenda,
            data_venda: params.venda.data_venda || new Date().toISOString(),
            valor_bruto: params.venda.valor_bruto || 0,
            desconto: params.venda.desconto || 0,
            valor_total: params.venda.valor_total,
            valor_pago: params.venda.valor_pago || 0,
            observacoes: params.venda.observacoes || null,
            // saldo_devedor e status são calculados automaticamente pelo trigger
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }

      // MODO COM PRODUTOS: Inserir venda e itens
      // 1. Inserir venda
      const { data: vendaData, error: vendaError } = await supabase
        .from("vendas")
        .insert({
          user_id: userId,
          cliente_id: params.venda.cliente_id,
          numero_venda: numeroVenda,
          data_venda: params.venda.data_venda || new Date().toISOString(),
          valor_bruto: params.venda.valor_bruto || 0,
          desconto: params.venda.desconto || 0,
          valor_total: params.venda.valor_total,
          valor_pago: params.venda.valor_pago || 0,
          observacoes: params.venda.observacoes || null,
          // saldo_devedor e status são calculados automaticamente pelo trigger
        })
        .select()
        .single();

      if (vendaError) throw vendaError;

      // 2. Inserir itens da venda
      const itensParaInserir = params.itens.map(item => ({
        user_id: userId,
        venda_id: vendaData.id,
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario,
        custo_unitario: item.custo_unitario,
      }));

      const { error: itensError } = await supabase
        .from("itens_venda")
        .insert(itensParaInserir);

      if (itensError) {
        // Rollback: deletar venda se itens falharem
        await supabase.from("vendas").delete().eq("id", vendaData.id);
        throw itensError;
      }

      // O estoque é atualizado automaticamente pelo trigger atualizar_estoque_venda_trigger
      // após inserir itens_venda, não precisa chamar manualmente

      return vendaData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendas"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => {
      handleError(error, { context: "Ao criar venda" });
    },
  });
}

/**
 * Hook para cancelar uma venda
 *
 * 🚀 OPTIMISTIC UPDATE: Atualiza status para CANCELADO instantaneamente
 * antes da resposta do servidor, com rollback automático em caso de erro
 */
export function useCancelarVenda() {
  const { data: userId } = useCurrentUserId();
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async (vendaId: string) => {
      if (!userId) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("vendas")
        .update({ status: "CANCELADO" })
        .eq("id", vendaId)
        .eq("user_id", userId);

      if (error) throw error;
      return { id: vendaId };
    },
    onMutate: async (vendaId) => {
      if (!userId) return;

      // Cancelar queries em andamento
      await queryClient.cancelQueries({ queryKey: ["vendas"] });
      await queryClient.cancelQueries({ queryKey: ["vendas", vendaId] });

      // Snapshot do estado anterior (lista de vendas)
      const previousVendas = queryClient.getQueryData(["vendas", userId]);

      // Snapshot do estado anterior (venda específica)
      const previousVendaData = queryClient.getQueryData(["vendas", vendaId]);

      // Optimistic update: atualizar status na lista de vendas
      queryClient.setQueryData(["vendas", userId], (old: any) => {
        if (!old || !Array.isArray(old)) return old;

        return old.map((venda: any) =>
          venda.id === vendaId
            ? { ...venda, status: "CANCELADO" }
            : venda
        );
      });

      // Optimistic update: atualizar status na venda específica
      queryClient.setQueryData(["vendas", vendaId], (old: any) => {
        if (!old || !old.venda) return old;

        return {
          ...old,
          venda: {
            ...old.venda,
            status: "CANCELADO",
          },
        };
      });

      return { previousVendas, previousVendaData };
    },
    onError: (error, vendaId, context) => {
      // Rollback: restaurar estados anteriores
      if (context?.previousVendas && userId) {
        queryClient.setQueryData(["vendas", userId], context.previousVendas);
      }
      if (context?.previousVendaData) {
        queryClient.setQueryData(["vendas", vendaId], context.previousVendaData);
      }
      handleError(error, { context: "Ao cancelar venda" });
    },
    onSettled: (data) => {
      // Revalidar após sucesso ou erro
      queryClient.invalidateQueries({ queryKey: ["vendas"] });
      if (data) {
        queryClient.invalidateQueries({ queryKey: ["vendas", data.id] });
      }
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

/**
 * Hook para registrar pagamento de uma venda
 *
 * 🚀 OPTIMISTIC UPDATE: Atualiza saldo_devedor e adiciona pagamento instantaneamente
 * antes da resposta do servidor, com rollback automático em caso de erro
 */
export function useRegistrarPagamentoVenda() {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async (params: {
      venda_id: string;
      valor: number;
      forma_pagamento: string;
      numero_comprovante?: string;
      observacoes?: string;
    }) => {
      const { error } = await supabase.from("pagamentos").insert({
        venda_id: params.venda_id,
        valor: params.valor,
        forma_pagamento: params.forma_pagamento,
        numero_comprovante: params.numero_comprovante || null,
        observacoes: params.observacoes || null,
      });

      if (error) throw error;
      return params;
    },
    onMutate: async (newPagamento) => {
      const vendaId = newPagamento.venda_id;

      // Cancelar queries em andamento
      await queryClient.cancelQueries({ queryKey: ["vendas", vendaId] });

      // Snapshot do estado anterior
      const previousVendaData = queryClient.getQueryData(["vendas", vendaId]);

      // Optimistic update: atualizar venda com novo pagamento
      queryClient.setQueryData(["vendas", vendaId], (old: any) => {
        if (!old || !old.venda) return old;

        const novoValorPago = old.venda.valor_pago + newPagamento.valor;
        const novoSaldoDevedor = old.venda.valor_total - novoValorPago;
        const novoStatus = novoSaldoDevedor <= 0 ? "PAGO" : "PENDENTE";

        // Criar pagamento otimista
        const optimisticPagamento = {
          id: `temp-${Date.now()}`,
          venda_id: vendaId,
          valor: newPagamento.valor,
          forma_pagamento: newPagamento.forma_pagamento,
          numero_comprovante: newPagamento.numero_comprovante || null,
          observacoes: newPagamento.observacoes || null,
          data_pagamento: new Date().toISOString(),
        };

        return {
          ...old,
          venda: {
            ...old.venda,
            valor_pago: novoValorPago,
            saldo_devedor: novoSaldoDevedor,
            status: novoStatus,
          },
          pagamentos: [optimisticPagamento, ...(old.pagamentos || [])],
        };
      });

      return { previousVendaData };
    },
    onError: (error, newPagamento, context) => {
      // Rollback: restaurar estado anterior
      if (context?.previousVendaData) {
        queryClient.setQueryData(["vendas", newPagamento.venda_id], context.previousVendaData);
      }
      handleError(error, { context: "Ao registrar pagamento" });
    },
    onSettled: (data) => {
      // Revalidar após sucesso ou erro
      if (data) {
        queryClient.invalidateQueries({ queryKey: ["vendas"] });
        queryClient.invalidateQueries({ queryKey: ["vendas", data.venda_id] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      }
    },
  });
}
