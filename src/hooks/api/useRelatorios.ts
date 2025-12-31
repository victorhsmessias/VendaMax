import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUserId } from "@/hooks/useCurrentUser";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { startOfMonth, endOfMonth, format } from "date-fns";

/**
 * Tipos de dados para relatórios
 */

export type RelatorioVendas = {
  periodo: string;
  totalVendas: number;
  valorTotal: number;
  valorPago: number;
  saldoDevedor: number;
  ticketMedio: number;
  taxaConversao: number;
  vendasPorStatus: {
    status: string;
    quantidade: number;
    valor: number;
  }[];
  vendasPorDia: {
    data: string;
    quantidade: number;
    valor: number;
  }[];
};

export type RelatorioFluxoCaixa = {
  periodo: string;
  entradas: number;
  saidas: number;
  saldo: number;
  recebimentosVendas: number;
  pagamentosFornecedores: number;
  detalhesEntradas: {
    data: string;
    descricao: string;
    valor: number;
  }[];
  detalhesSaidas: {
    data: string;
    descricao: string;
    valor: number;
  }[];
};

export type RelatorioProdutos = {
  periodo: string;
  totalProdutosVendidos: number;
  valorTotalVendido: number;
  custoTotalProdutos: number;
  lucroTotalProdutos: number;
  margemLucroMedia: number;
  produtosMaisVendidos: {
    produto_id: string;
    produto_nome: string;
    quantidade_vendida: number;
    valor_total: number;
    custo_total: number;
    lucro: number;
    margem_lucro: number;
  }[];
};

/**
 * Hook para relatório de vendas por período
 *
 * 📊 RELATÓRIO: Demonstrativo completo de vendas
 * Inclui métricas gerais, vendas por status e evolução diária
 */
export function useRelatorioVendas(dataInicio: Date, dataFim: Date) {
  const { data: userId } = useCurrentUserId();
  const { handleError } = useErrorHandler();

  return useQuery({
    queryKey: ["relatorios", "vendas", userId, format(dataInicio, "yyyy-MM-dd"), format(dataFim, "yyyy-MM-dd")],
    queryFn: async (): Promise<RelatorioVendas> => {
      if (!userId) throw new Error("Usuário não autenticado");

      const dataInicioStr = format(dataInicio, "yyyy-MM-dd");
      const dataFimStr = format(dataFim, "yyyy-MM-dd 23:59:59");

      // Buscar vendas no período
      const { data: vendas, error: vendasError } = await supabase
        .from("vendas")
        .select("*")
        .eq("user_id", userId)
        .gte("data_venda", dataInicioStr)
        .lte("data_venda", dataFimStr)
        .order("data_venda", { ascending: true });

      if (vendasError) throw vendasError;

      const vendasValidas = (vendas || []).filter((v) => v.status !== "CANCELADO");
      const vendasPagas = vendasValidas.filter((v) => v.status === "PAGO");

      // Métricas gerais
      const totalVendas = vendasValidas.length;
      const valorTotal = vendasValidas.reduce((sum, v) => sum + (v.valor_total || 0), 0);
      const valorPago = vendasValidas.reduce((sum, v) => sum + (v.valor_pago || 0), 0);
      const saldoDevedor = vendasValidas.reduce((sum, v) => sum + (v.saldo_devedor || 0), 0);
      const ticketMedio = totalVendas > 0 ? valorTotal / totalVendas : 0;
      const taxaConversao = totalVendas > 0 ? (vendasPagas.length / totalVendas) * 100 : 0;

      // Vendas por status
      const vendasPorStatus = ["PAGO", "PENDENTE"].map((status) => {
        const vendasStatus = vendasValidas.filter((v) => v.status === status);
        return {
          status,
          quantidade: vendasStatus.length,
          valor: vendasStatus.reduce((sum, v) => sum + (v.valor_total || 0), 0),
        };
      });

      // Vendas por dia
      const vendasPorDiaMap = new Map<string, { quantidade: number; valor: number }>();
      vendasValidas.forEach((venda) => {
        const data = format(new Date(venda.data_venda), "yyyy-MM-dd");
        const atual = vendasPorDiaMap.get(data) || { quantidade: 0, valor: 0 };
        vendasPorDiaMap.set(data, {
          quantidade: atual.quantidade + 1,
          valor: atual.valor + (venda.valor_total || 0),
        });
      });

      const vendasPorDia = Array.from(vendasPorDiaMap.entries())
        .map(([data, dados]) => ({
          data,
          ...dados,
        }))
        .sort((a, b) => a.data.localeCompare(b.data));

      return {
        periodo: `${format(dataInicio, "dd/MM/yyyy")} - ${format(dataFim, "dd/MM/yyyy")}`,
        totalVendas,
        valorTotal,
        valorPago,
        saldoDevedor,
        ticketMedio,
        taxaConversao,
        vendasPorStatus,
        vendasPorDia,
      };
    },
    enabled: !!userId,
    staleTime: 1 * 60 * 1000, // 1 minuto
    onError: (error) => {
      handleError(error, { context: "Ao carregar relatório de vendas" });
    },
  });
}

/**
 * Hook para relatório de fluxo de caixa
 *
 * 📊 RELATÓRIO: Entradas vs Saídas
 * Mostra recebimentos de vendas e pagamentos a fornecedores
 */
export function useRelatorioFluxoCaixa(dataInicio: Date, dataFim: Date) {
  const { data: userId } = useCurrentUserId();
  const { handleError } = useErrorHandler();

  return useQuery({
    queryKey: ["relatorios", "fluxo-caixa", userId, format(dataInicio, "yyyy-MM-dd"), format(dataFim, "yyyy-MM-dd")],
    queryFn: async (): Promise<RelatorioFluxoCaixa> => {
      if (!userId) throw new Error("Usuário não autenticado");

      const dataInicioStr = format(dataInicio, "yyyy-MM-dd");
      const dataFimStr = format(dataFim, "yyyy-MM-dd 23:59:59");

      // Buscar pagamentos de vendas (ENTRADAS)
      const { data: pagamentosVendas, error: pagamentosError } = await supabase
        .from("pagamentos")
        .select("*, vendas!inner(user_id, numero_venda)")
        .eq("vendas.user_id", userId)
        .gte("data_pagamento", dataInicioStr)
        .lte("data_pagamento", dataFimStr)
        .order("data_pagamento", { ascending: true });

      if (pagamentosError) throw pagamentosError;

      // Buscar contas pagas a fornecedores (SAÍDAS)
      const { data: contasPagas, error: contasError } = await supabase
        .from("contas_pagar_fornecedor")
        .select("*, fornecedores(nome)")
        .eq("user_id", userId)
        .eq("status", "PAGO")
        .not("data_pagamento", "is", null)
        .gte("data_pagamento", dataInicioStr)
        .lte("data_pagamento", dataFimStr)
        .order("data_pagamento", { ascending: true });

      if (contasError) throw contasError;

      // Calcular totais
      const recebimentosVendas = (pagamentosVendas || []).reduce((sum, p) => sum + (p.valor || 0), 0);
      const pagamentosFornecedores = (contasPagas || []).reduce((sum, c) => sum + (c.valor_pago || 0), 0);

      const entradas = recebimentosVendas;
      const saidas = pagamentosFornecedores;
      const saldo = entradas - saidas;

      // Detalhes de entradas
      const detalhesEntradas = (pagamentosVendas || []).map((p) => ({
        data: format(new Date(p.data_pagamento), "dd/MM/yyyy"),
        descricao: `Venda ${(p.vendas as any)?.numero_venda || ""} - ${p.forma_pagamento}`,
        valor: p.valor || 0,
      }));

      // Detalhes de saídas
      const detalhesSaidas = (contasPagas || []).map((c) => ({
        data: format(new Date(c.data_pagamento!), "dd/MM/yyyy"),
        descricao: `${c.fornecedores?.nome || "Fornecedor"} - ${c.descricao}`,
        valor: c.valor_pago || 0,
      }));

      return {
        periodo: `${format(dataInicio, "dd/MM/yyyy")} - ${format(dataFim, "dd/MM/yyyy")}`,
        entradas,
        saidas,
        saldo,
        recebimentosVendas,
        pagamentosFornecedores,
        detalhesEntradas,
        detalhesSaidas,
      };
    },
    enabled: !!userId,
    staleTime: 1 * 60 * 1000, // 1 minuto
    onError: (error) => {
      handleError(error, { context: "Ao carregar relatório de fluxo de caixa" });
    },
  });
}

/**
 * Hook para relatório de produtos vendidos
 *
 * 📊 RELATÓRIO: Análise de produtos e lucro
 * Mostra produtos mais vendidos, custos e margens de lucro
 */
export function useRelatorioProdutos(dataInicio: Date, dataFim: Date) {
  const { data: userId } = useCurrentUserId();
  const { handleError } = useErrorHandler();

  return useQuery({
    queryKey: ["relatorios", "produtos", userId, format(dataInicio, "yyyy-MM-dd"), format(dataFim, "yyyy-MM-dd")],
    queryFn: async (): Promise<RelatorioProdutos> => {
      if (!userId) throw new Error("Usuário não autenticado");

      const dataInicioStr = format(dataInicio, "yyyy-MM-dd");
      const dataFimStr = format(dataFim, "yyyy-MM-dd 23:59:59");

      // Buscar itens de vendas no período (excluindo canceladas)
      const { data: itensVenda, error: itensError } = await supabase
        .from("itens_venda")
        .select(`
          *,
          vendas!inner(user_id, data_venda, status),
          produtos(nome)
        `)
        .eq("vendas.user_id", userId)
        .neq("vendas.status", "CANCELADO")
        .gte("vendas.data_venda", dataInicioStr)
        .lte("vendas.data_venda", dataFimStr);

      if (itensError) throw itensError;

      const itens = itensVenda || [];

      // Agrupar por produto
      const produtosMap = new Map<
        string,
        {
          produto_nome: string;
          quantidade_vendida: number;
          valor_total: number;
          custo_total: number;
        }
      >();

      itens.forEach((item) => {
        const key = item.produto_id;
        const atual = produtosMap.get(key) || {
          produto_nome: (item.produtos as any)?.nome || "Produto",
          quantidade_vendida: 0,
          valor_total: 0,
          custo_total: 0,
        };

        produtosMap.set(key, {
          produto_nome: atual.produto_nome,
          quantidade_vendida: atual.quantidade_vendida + (item.quantidade || 0),
          valor_total: atual.valor_total + (item.subtotal || 0),
          custo_total: atual.custo_total + (item.quantidade || 0) * (item.custo_unitario || 0),
        });
      });

      // Calcular métricas de cada produto
      const produtosMaisVendidos = Array.from(produtosMap.entries())
        .map(([produto_id, dados]) => {
          const lucro = dados.valor_total - dados.custo_total;
          const margem_lucro = dados.custo_total > 0 ? (lucro / dados.custo_total) * 100 : 0;

          return {
            produto_id,
            produto_nome: dados.produto_nome,
            quantidade_vendida: dados.quantidade_vendida,
            valor_total: dados.valor_total,
            custo_total: dados.custo_total,
            lucro,
            margem_lucro,
          };
        })
        .sort((a, b) => b.quantidade_vendida - a.quantidade_vendida)
        .slice(0, 10); // Top 10

      // Métricas gerais
      const totalProdutosVendidos = itens.reduce((sum, i) => sum + (i.quantidade || 0), 0);
      const valorTotalVendido = itens.reduce((sum, i) => sum + (i.subtotal || 0), 0);
      const custoTotalProdutos = itens.reduce(
        (sum, i) => sum + (i.quantidade || 0) * (i.custo_unitario || 0),
        0
      );
      const lucroTotalProdutos = valorTotalVendido - custoTotalProdutos;
      const margemLucroMedia = custoTotalProdutos > 0 ? (lucroTotalProdutos / custoTotalProdutos) * 100 : 0;

      return {
        periodo: `${format(dataInicio, "dd/MM/yyyy")} - ${format(dataFim, "dd/MM/yyyy")}`,
        totalProdutosVendidos,
        valorTotalVendido,
        custoTotalProdutos,
        lucroTotalProdutos,
        margemLucroMedia,
        produtosMaisVendidos,
      };
    },
    enabled: !!userId,
    staleTime: 1 * 60 * 1000, // 1 minuto
    onError: (error) => {
      handleError(error, { context: "Ao carregar relatório de produtos" });
    },
  });
}

/**
 * Hook para buscar vendas do mês atual
 * Usado como padrão nos relatórios
 */
export function useDefaultPeriod() {
  const now = new Date();
  return {
    dataInicio: startOfMonth(now),
    dataFim: endOfMonth(now),
  };
}
