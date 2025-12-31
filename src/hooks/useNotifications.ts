import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { addDays, isBefore, startOfDay, parseISO } from "date-fns";

export type NotificationType = "estoque_baixo" | "conta_vencer" | "conta_vencida";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  createdAt: Date;
  priority: "low" | "medium" | "high";
}

/**
 * Hook para gerenciar notificações do sistema
 *
 * 🔔 NOTIFICATIONS: Alertas automáticos para o usuário
 * - Estoque baixo: Produtos com quantidade <= estoque_minimo
 * - Contas a vencer: Contas que vencem nos próximos 7 dias
 * - Contas vencidas: Contas com vencimento já passado
 * - Agrupamento por tipo
 * - Contador de notificações
 */
export function useNotifications() {
  const { data: userId } = useQuery({
    queryKey: ["userId"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return user?.id;
    },
  });

  // Buscar produtos com estoque baixo
  const { data: produtosEstoqueBaixo = [] } = useQuery({
    queryKey: ["notifications", "estoque-baixo", userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase.rpc("get_produtos_estoque_baixo");

      if (error) {
        console.error("Erro ao buscar produtos com estoque baixo:", error);
        return [];
      }

      return data || [];
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutos
    refetchOnWindowFocus: true,
  });

  // Buscar contas a pagar próximas do vencimento (7 dias)
  const { data: contasAVencer = [] } = useQuery({
    queryKey: ["notifications", "contas-vencer", userId],
    queryFn: async () => {
      if (!userId) return [];

      const hoje = startOfDay(new Date());
      const seteDiasDepois = addDays(hoje, 7);

      const { data, error } = await supabase
        .from("contas_pagar_fornecedor")
        .select(
          `
          id,
          fornecedores (
            nome
          ),
          descricao,
          valor,
          data_vencimento,
          status
        `
        )
        .eq("user_id", userId)
        .eq("status", "PENDENTE")
        .gte("data_vencimento", hoje.toISOString())
        .lte("data_vencimento", seteDiasDepois.toISOString())
        .order("data_vencimento", { ascending: true });

      if (error) {
        console.error("Erro ao buscar contas a vencer:", error);
        return [];
      }

      return data || [];
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutos
    refetchOnWindowFocus: true,
  });

  // Buscar contas vencidas
  const { data: contasVencidas = [] } = useQuery({
    queryKey: ["notifications", "contas-vencidas", userId],
    queryFn: async () => {
      if (!userId) return [];

      const hoje = startOfDay(new Date());

      const { data, error } = await supabase
        .from("contas_pagar_fornecedor")
        .select(
          `
          id,
          fornecedores (
            nome
          ),
          descricao,
          valor,
          data_vencimento,
          status
        `
        )
        .eq("user_id", userId)
        .eq("status", "PENDENTE")
        .lt("data_vencimento", hoje.toISOString())
        .order("data_vencimento", { ascending: true });

      if (error) {
        console.error("Erro ao buscar contas vencidas:", error);
        return [];
      }

      return data || [];
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutos
    refetchOnWindowFocus: true,
  });

  // Converter dados para notificações
  const notifications: Notification[] = [];

  // Notificações de estoque baixo
  produtosEstoqueBaixo.forEach((produto: any) => {
    const esgotado = produto.quantidade_estoque === 0;
    notifications.push({
      id: `estoque-${produto.id}`,
      type: "estoque_baixo",
      title: esgotado ? "Produto Esgotado" : "Estoque Baixo",
      message: esgotado
        ? `${produto.nome} (${produto.codigo}) está sem estoque`
        : `${produto.nome} (${produto.codigo}): ${produto.quantidade_estoque} unidades (mínimo: ${produto.estoque_minimo})`,
      data: produto,
      createdAt: new Date(),
      priority: esgotado ? "high" : "medium",
    });
  });

  // Notificações de contas vencidas
  contasVencidas.forEach((conta: any) => {
    notifications.push({
      id: `conta-vencida-${conta.id}`,
      type: "conta_vencida",
      title: "Conta Vencida",
      message: `${conta.fornecedores?.nome || "Fornecedor"} - ${conta.descricao}: R$ ${conta.valor.toFixed(2)} (venceu em ${new Date(conta.data_vencimento).toLocaleDateString("pt-BR")})`,
      data: conta,
      createdAt: parseISO(conta.data_vencimento),
      priority: "high",
    });
  });

  // Notificações de contas a vencer
  contasAVencer.forEach((conta: any) => {
    const diasRestantes = Math.ceil(
      (parseISO(conta.data_vencimento).getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24)
    );

    notifications.push({
      id: `conta-vencer-${conta.id}`,
      type: "conta_vencer",
      title: "Conta a Vencer",
      message: `${conta.fornecedores?.nome || "Fornecedor"} - ${conta.descricao}: R$ ${conta.valor.toFixed(2)} (vence em ${diasRestantes} ${diasRestantes === 1 ? "dia" : "dias"})`,
      data: conta,
      createdAt: parseISO(conta.data_vencimento),
      priority: diasRestantes <= 2 ? "high" : "medium",
    });
  });

  // Ordenar por prioridade e data
  const sortedNotifications = notifications.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  return {
    notifications: sortedNotifications,
    totalCount: sortedNotifications.length,
    highPriorityCount: sortedNotifications.filter((n) => n.priority === "high").length,
    mediumPriorityCount: sortedNotifications.filter((n) => n.priority === "medium").length,
    estoqueBaixoCount: produtosEstoqueBaixo.length,
    contasVencidasCount: contasVencidas.length,
    contasAVencerCount: contasAVencer.length,
  };
}
