import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUserId } from "@/hooks/useCurrentUser";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type ContaPagar = {
  id: string;
  descricao: string;
  valor: number;
  valor_pago: number;
  saldo_devedor: number;
  data_vencimento: string;
  status: string;
  fornecedor_id: string;
  fornecedores?: { nome: string };
  observacoes: string | null;
  parcela_numero?: number | null;
  parcela_total?: number | null;
  conta_pai_id?: string | null;
};

type ContasPorMes = {
  ano: number;
  mes: number;
  mes_nome: string;
  total_mes: number;
  quantidade_contas: number;
  total_pago: number;
  total_pendente: number;
};

/**
 * Hook para buscar todas as contas a pagar (sem paginação)
 */
export function useContasPagar() {
  const { data: userId } = useCurrentUserId();
  const { handleError } = useErrorHandler();

  return useQuery({
    queryKey: ["contas_pagar", userId],
    queryFn: async () => {
      if (!userId) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("contas_pagar_fornecedor")
        .select("*, fornecedores(nome)")
        .eq("user_id", userId)
        .order("data_vencimento", { ascending: false });

      if (error) throw error;
      return data as ContaPagar[];
    },
    enabled: !!userId,
    onError: (error) => {
      handleError(error, { context: "Ao carregar contas a pagar" });
    },
  });
}

export interface ContasPagarFilters {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string[];
  fornecedorId?: string;
}

/**
 * Hook para buscar contas a pagar com paginação e filtros avançados
 *
 * 📄 PAGINAÇÃO: Carrega apenas uma página de contas por vez para melhor performance
 * 🔍 BUSCA: Filtra por descrição ou nome do fornecedor (server-side)
 * 🔥 FILTROS AVANÇADOS: Data de vencimento, status, fornecedor
 *
 * @param page - Número da página (começa em 1)
 * @param pageSize - Número de itens por página (padrão: 10)
 * @param filters - Objeto com filtros avançados (search, dateFrom, dateTo, status, fornecedorId)
 * @returns Dados paginados com informações de totalPages e totalItems
 */
export function useContasPagarPaginated(page: number = 1, pageSize: number = 10, filters: ContasPagarFilters = {}) {
  const { data: userId } = useCurrentUserId();
  const { handleError } = useErrorHandler();

  return useQuery({
    queryKey: ["contas_pagar", "paginated", userId, page, pageSize, filters],
    queryFn: async () => {
      if (!userId) throw new Error("Usuário não autenticado");

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("contas_pagar_fornecedor")
        .select("*, fornecedores(nome)", { count: "exact" })
        .eq("user_id", userId)
        .order("data_vencimento", { ascending: false });

      // Filtro de busca por texto (apenas descrição)
      // Nota: Para buscar por fornecedor, use o filtro avançado de fornecedor
      if (filters.search) {
        query = query.ilike("descricao", `%${filters.search}%`);
      }

      // Filtro de data de vencimento inicial
      if (filters.dateFrom) {
        query = query.gte("data_vencimento", filters.dateFrom);
      }

      // Filtro de data de vencimento final
      if (filters.dateTo) {
        query = query.lte("data_vencimento", filters.dateTo);
      }

      // Filtro de status (múltiplos)
      if (filters.status && filters.status.length > 0) {
        query = query.in("status", filters.status);
      }

      // Filtro por fornecedor específico
      if (filters.fornecedorId) {
        query = query.eq("fornecedor_id", filters.fornecedorId);
      }

      const { data, error, count } = await query.range(from, to);

      if (error) throw error;

      return {
        data: data as ContaPagar[],
        totalPages: Math.ceil((count || 0) / pageSize),
        totalItems: count || 0,
        currentPage: page,
        pageSize,
      };
    },
    enabled: !!userId,
    placeholderData: (previousData) => previousData,
    staleTime: 2 * 60 * 1000, // 2 minutos - contas a pagar são importantes e mudam moderadamente
    gcTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: true, // Revalidar ao focar (dados financeiros importantes)
    onError: (error) => {
      handleError(error, { context: "Ao carregar contas a pagar" });
    },
  });
}

/**
 * Hook para buscar uma conta a pagar específica por ID
 */
export function useContaPagar(id: string | undefined) {
  const { data: userId } = useCurrentUserId();
  const { handleError } = useErrorHandler();

  return useQuery({
    queryKey: ["contas_pagar", id, userId],
    queryFn: async () => {
      if (!id || !userId) return null;

      const { data, error } = await supabase
        .from("contas_pagar_fornecedor")
        .select("*, fornecedores(nome)")
        .eq("id", id)
        .eq("user_id", userId)
        .single();

      if (error) throw error;
      return data as ContaPagar;
    },
    enabled: !!id && !!userId,
    onError: (error) => {
      handleError(error, { context: "Ao carregar conta a pagar" });
    },
  });
}

/**
 * Hook para criar nova conta a pagar
 */
export function useCreateContaPagar() {
  const { data: userId } = useCurrentUserId();
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async (conta: TablesInsert<"contas_pagar_fornecedor">) => {
      if (!userId) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("contas_pagar_fornecedor")
        .insert({ ...conta, user_id: userId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contas_pagar"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => {
      handleError(error, { context: "Ao criar conta a pagar" });
    },
  });
}

/**
 * Hook para atualizar conta a pagar
 */
export function useUpdateContaPagar() {
  const { data: userId } = useCurrentUserId();
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async ({ id, ...conta }: TablesUpdate<"contas_pagar_fornecedor"> & { id: string }) => {
      if (!userId) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("contas_pagar_fornecedor")
        .update(conta)
        .eq("id", id)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["contas_pagar"] });
      queryClient.invalidateQueries({ queryKey: ["contas_pagar", data.id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => {
      handleError(error, { context: "Ao atualizar conta a pagar" });
    },
  });
}

/**
 * Hook para deletar conta a pagar
 */
export function useDeleteContaPagar() {
  const { data: userId } = useCurrentUserId();
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("contas_pagar_fornecedor")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

      if (error) throw error;
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contas_pagar"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => {
      handleError(error, { context: "Ao excluir conta a pagar" });
    },
  });
}

/**
 * Hook para registrar pagamento parcial ou total de uma conta
 *
 * 🚀 OPTIMISTIC UPDATE: Atualiza valor_pago e saldo_devedor instantaneamente
 * antes da resposta do servidor, com rollback automático em caso de erro
 */
export function useRegistrarPagamento() {
  const { data: userId } = useCurrentUserId();
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async (params: { contaId: string; valorPagamento: number }) => {
      if (!userId) throw new Error("Usuário não autenticado");

      // Buscar conta atual
      const { data: conta, error: fetchError } = await supabase
        .from("contas_pagar_fornecedor")
        .select("*")
        .eq("id", params.contaId)
        .eq("user_id", userId)
        .single();

      if (fetchError) throw fetchError;
      if (!conta) throw new Error("Conta não encontrada");

      // Calcular novo valor pago e saldo
      const novoValorPago = (conta.valor_pago || 0) + params.valorPagamento;
      const novoSaldoDevedor = conta.valor - novoValorPago;

      // Atualizar conta
      const { data, error: updateError } = await supabase
        .from("contas_pagar_fornecedor")
        .update({
          valor_pago: novoValorPago,
          saldo_devedor: novoSaldoDevedor,
          status: novoSaldoDevedor <= 0 ? "PAGO" : "PENDENTE",
        })
        .eq("id", params.contaId)
        .eq("user_id", userId)
        .select()
        .single();

      if (updateError) throw updateError;
      return data;
    },
    onMutate: async (params) => {
      if (!userId) return;

      // Cancelar queries em andamento
      await queryClient.cancelQueries({ queryKey: ["contas_pagar", userId] });

      // Snapshot do estado anterior
      const previousContas = queryClient.getQueryData(["contas_pagar", userId]);

      // Optimistic update: atualizar conta na lista
      queryClient.setQueryData(["contas_pagar", userId], (old: any) => {
        if (!old || !Array.isArray(old)) return old;

        return old.map((conta: any) => {
          if (conta.id === params.contaId) {
            const novoValorPago = (conta.valor_pago || 0) + params.valorPagamento;
            const novoSaldoDevedor = conta.valor - novoValorPago;
            const novoStatus = novoSaldoDevedor <= 0 ? "PAGO" : "PENDENTE";

            return {
              ...conta,
              valor_pago: novoValorPago,
              saldo_devedor: novoSaldoDevedor,
              status: novoStatus,
            };
          }
          return conta;
        });
      });

      return { previousContas };
    },
    onError: (error, params, context) => {
      // Rollback: restaurar estado anterior
      if (context?.previousContas && userId) {
        queryClient.setQueryData(["contas_pagar", userId], context.previousContas);
      }
      handleError(error, { context: "Ao registrar pagamento" });
    },
    onSettled: (data) => {
      // Revalidar após sucesso ou erro
      queryClient.invalidateQueries({ queryKey: ["contas_pagar"] });
      if (data) {
        queryClient.invalidateQueries({ queryKey: ["contas_pagar", data.id] });
      }
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

/**
 * Hook para criar conta parcelada
 *
 * Cria múltiplas contas (parcelas) automaticamente
 * Cada parcela terá vencimento mensal e valor dividido
 */
export function useCreateContaParcelada() {
  const { data: userId } = useCurrentUserId();
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async (params: {
      fornecedor_id: string | null;
      descricao: string;
      valor_total: number;
      data_primeira_parcela: string;
      parcelas: number;
      observacoes?: string | null;
    }) => {
      if (!userId) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase.rpc("criar_conta_parcelada", {
        p_fornecedor_id: params.fornecedor_id,
        p_descricao: params.descricao,
        p_valor_total: params.valor_total,
        p_data_primeira_parcela: params.data_primeira_parcela,
        p_parcelas: params.parcelas,
        p_observacoes: params.observacoes || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contas_pagar"] });
      queryClient.invalidateQueries({ queryKey: ["contas_por_mes"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => {
      handleError(error, { context: "Ao criar conta parcelada" });
    },
  });
}

/**
 * Hook para buscar total a pagar por mês
 *
 * Retorna resumo mensal com:
 * - Total do mês
 * - Quantidade de contas
 * - Total pago
 * - Total pendente
 */
export function useContasPorMes() {
  const { data: userId } = useCurrentUserId();
  const { handleError } = useErrorHandler();

  return useQuery({
    queryKey: ["contas_por_mes", userId],
    queryFn: async () => {
      if (!userId) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase.rpc("get_contas_pagar_por_mes");

      if (error) throw error;
      return data as ContasPorMes[];
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutos
    refetchOnWindowFocus: true,
    onError: (error) => {
      handleError(error, { context: "Ao carregar resumo mensal" });
    },
  });
}

/**
 * Hook para buscar contas de um mês específico
 */
export function useContasMes(ano: number | null, mes: number | null) {
  const { data: userId } = useCurrentUserId();
  const { handleError } = useErrorHandler();

  return useQuery({
    queryKey: ["contas_mes", userId, ano, mes],
    queryFn: async () => {
      if (!userId || !ano || !mes) return [];

      const { data, error } = await supabase.rpc("get_contas_mes", {
        p_ano: ano,
        p_mes: mes,
      });

      if (error) throw error;
      return data as ContaPagar[];
    },
    enabled: !!userId && !!ano && !!mes,
    staleTime: 2 * 60 * 1000,
    onError: (error) => {
      handleError(error, { context: "Ao carregar contas do mês" });
    },
  });
}
