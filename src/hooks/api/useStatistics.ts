import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUserId } from "@/hooks/useCurrentUser";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { subDays, format } from "date-fns";

/**
 * Interface para estatísticas de vendas ao longo do tempo
 */
export interface SalesOverTime {
  date: string;
  total: number;
  count: number;
}

/**
 * Interface para distribuição de status
 */
export interface StatusDistribution {
  status: string;
  count: number;
  total: number;
}

/**
 * Interface para top produtos vendidos
 */
export interface TopProduct {
  produto_id: string;
  produto_nome: string;
  quantidade_total: number;
  valor_total: number;
}

/**
 * Interface para estatísticas gerais de vendas
 */
export interface VendasStatistics {
  totalVendas: number;
  totalValor: number;
  ticketMedio: number;
  taxaConversao: number;
  totalPendente: number;
  totalPago: number;
}

/**
 * Hook para buscar vendas ao longo do tempo (últimos N dias)
 *
 * @param days - Número de dias para buscar (padrão: 30)
 * @returns Array com vendas agregadas por dia
 */
export function useSalesOverTime(days: number = 30) {
  const { data: userId } = useCurrentUserId();
  const { handleError } = useErrorHandler();

  return useQuery({
    queryKey: ["statistics", "sales-over-time", userId, days],
    queryFn: async () => {
      if (!userId) throw new Error("Usuário não autenticado");

      const startDate = subDays(new Date(), days).toISOString();

      const { data, error } = await supabase
        .from("vendas")
        .select("data_venda, valor_total")
        .eq("user_id", userId)
        .gte("data_venda", startDate)
        .order("data_venda");

      if (error) throw error;

      // Agrupar vendas por data
      const groupedByDate = (data || []).reduce((acc, venda) => {
        const date = format(new Date(venda.data_venda), "dd/MM");

        if (!acc[date]) {
          acc[date] = { date, total: 0, count: 0 };
        }

        acc[date].total += venda.valor_total;
        acc[date].count += 1;

        return acc;
      }, {} as Record<string, SalesOverTime>);

      return Object.values(groupedByDate);
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutos
    onError: (error) => {
      handleError(error, { context: "Ao carregar estatísticas de vendas" });
    },
  });
}

/**
 * Hook para buscar distribuição de vendas por status
 */
export function useStatusDistribution() {
  const { data: userId } = useCurrentUserId();
  const { handleError } = useErrorHandler();

  return useQuery({
    queryKey: ["statistics", "status-distribution", userId],
    queryFn: async () => {
      if (!userId) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("vendas")
        .select("status, valor_total")
        .eq("user_id", userId);

      if (error) throw error;

      // Agrupar por status
      const groupedByStatus = (data || []).reduce((acc, venda) => {
        const status = venda.status;

        if (!acc[status]) {
          acc[status] = { status, count: 0, total: 0 };
        }

        acc[status].count += 1;
        acc[status].total += venda.valor_total;

        return acc;
      }, {} as Record<string, StatusDistribution>);

      return Object.values(groupedByStatus);
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
    onError: (error) => {
      handleError(error, { context: "Ao carregar distribuição de status" });
    },
  });
}

/**
 * Hook para buscar top produtos mais vendidos
 *
 * @param limit - Número de produtos a retornar (padrão: 5)
 */
export function useTopProducts(limit: number = 5) {
  const { data: userId } = useCurrentUserId();
  const { handleError } = useErrorHandler();

  return useQuery({
    queryKey: ["statistics", "top-products", userId, limit],
    queryFn: async () => {
      if (!userId) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("itens_venda")
        .select(`
          produto_id,
          quantidade,
          preco_unitario,
          produtos (
            nome
          )
        `)
        .eq("produtos.user_id", userId);

      if (error) throw error;

      // Agrupar por produto
      const groupedByProduct = (data || []).reduce((acc, item) => {
        const produtoId = item.produto_id;
        const produtoNome = (item.produtos as any)?.nome || "Desconhecido";

        if (!acc[produtoId]) {
          acc[produtoId] = {
            produto_id: produtoId,
            produto_nome: produtoNome,
            quantidade_total: 0,
            valor_total: 0,
          };
        }

        acc[produtoId].quantidade_total += item.quantidade;
        acc[produtoId].valor_total += item.quantidade * item.preco_unitario;

        return acc;
      }, {} as Record<string, TopProduct>);

      // Ordenar por quantidade e limitar
      return Object.values(groupedByProduct)
        .sort((a, b) => b.quantidade_total - a.quantidade_total)
        .slice(0, limit);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutos (produtos mudam menos)
    onError: (error) => {
      handleError(error, { context: "Ao carregar top produtos" });
    },
  });
}

/**
 * Hook para buscar estatísticas gerais de vendas
 */
export function useVendasStatistics() {
  const { data: userId } = useCurrentUserId();
  const { handleError } = useErrorHandler();

  return useQuery({
    queryKey: ["statistics", "vendas-general", userId],
    queryFn: async () => {
      if (!userId) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("vendas")
        .select("valor_total, status")
        .eq("user_id", userId);

      if (error) throw error;

      const vendas = data || [];

      // Calcular estatísticas
      const totalVendas = vendas.length;
      const totalValor = vendas.reduce((sum, v) => sum + v.valor_total, 0);
      const ticketMedio = totalVendas > 0 ? totalValor / totalVendas : 0;

      const totalPago = vendas.filter((v) => v.status === "PAGO").length;
      const totalPendente = vendas.filter((v) => v.status === "PENDENTE").length;
      const totalCancelado = vendas.filter((v) => v.status === "CANCELADO").length;

      // Taxa de conversão: vendas pagas / total de vendas (exceto canceladas)
      const vendasValidas = totalVendas - totalCancelado;
      const taxaConversao = vendasValidas > 0 ? (totalPago / vendasValidas) * 100 : 0;

      return {
        totalVendas,
        totalValor,
        ticketMedio,
        taxaConversao,
        totalPendente,
        totalPago,
      } as VendasStatistics;
    },
    enabled: !!userId,
    staleTime: 1 * 60 * 1000, // 1 minuto
    onError: (error) => {
      handleError(error, { context: "Ao carregar estatísticas de vendas" });
    },
  });
}
