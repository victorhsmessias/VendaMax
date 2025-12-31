import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUserId } from "@/hooks/useCurrentUser";
import { useErrorHandler } from "@/hooks/useErrorHandler";

type DashboardMetrics = {
  totalReceber: number;
  totalPagar: number;
  lucroEstimado: number;
  vendasMes: number;
};

type ClienteDevedor = {
  nome: string;
  total_devedor: number;
};

type ContaPagarFornecedor = {
  fornecedor_nome: string;
  total_pendente: number;
};

type DashboardData = {
  metrics: DashboardMetrics;
  clientesDevedores: ClienteDevedor[];
  contasPagar: ContaPagarFornecedor[];
};

/**
 * Hook para buscar dados do dashboard
 */
export function useDashboard() {
  const { data: userId } = useCurrentUserId();
  const { handleError } = useErrorHandler();

  return useQuery({
    queryKey: ["dashboard", userId],
    queryFn: async (): Promise<DashboardData> => {
      if (!userId) throw new Error("Usuário não autenticado");

      // Total a receber (vendas pendentes)
      const { data: vendas } = await supabase
        .from("vendas")
        .select("saldo_devedor")
        .eq("user_id", userId)
        .eq("status", "PENDENTE");

      const totalReceber = (vendas || []).reduce(
        (sum, v) => sum + Number(v.saldo_devedor),
        0
      );

      // Total a pagar (contas pendentes)
      const { data: contas } = await supabase
        .from("contas_pagar_fornecedor")
        .select("saldo_devedor")
        .eq("user_id", userId)
        .eq("status", "PENDENTE");

      const totalPagar = (contas || []).reduce(
        (sum, c) => sum + Number(c.saldo_devedor),
        0
      );

      // Vendas do mês
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from("vendas")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("data_venda", startOfMonth.toISOString());

      // Top 5 clientes devedores
      const { data: devedores } = await supabase
        .from("vendas")
        .select(`
          cliente_id,
          saldo_devedor,
          clientes (nome)
        `)
        .eq("user_id", userId)
        .eq("status", "PENDENTE")
        .order("saldo_devedor", { ascending: false })
        .limit(5);

      const clientesMap = new Map<string, { nome: string; total: number }>();
      (devedores || []).forEach((venda: any) => {
        const clienteNome = venda.clientes?.nome || "Cliente";
        const atual = clientesMap.get(clienteNome) || { nome: clienteNome, total: 0 };
        clientesMap.set(clienteNome, {
          nome: clienteNome,
          total: atual.total + Number(venda.saldo_devedor),
        });
      });

      const topDevedores = Array.from(clientesMap.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, 5)
        .map(c => ({ nome: c.nome, total_devedor: c.total }));

      // Contas a pagar por fornecedor
      const { data: contasFornecedor } = await supabase
        .from("contas_pagar_fornecedor")
        .select(`
          fornecedor_id,
          saldo_devedor,
          fornecedores (nome)
        `)
        .eq("user_id", userId)
        .eq("status", "PENDENTE");

      const fornecedoresMap = new Map<string, { nome: string; total: number }>();
      (contasFornecedor || []).forEach((conta: any) => {
        const fornecedorNome = conta.fornecedores?.nome || "Fornecedor";
        const atual = fornecedoresMap.get(fornecedorNome) || {
          nome: fornecedorNome,
          total: 0,
        };
        fornecedoresMap.set(fornecedorNome, {
          nome: fornecedorNome,
          total: atual.total + Number(conta.saldo_devedor),
        });
      });

      const topContas = Array.from(fornecedoresMap.values()).map(f => ({
        fornecedor_nome: f.nome,
        total_pendente: f.total,
      }));

      return {
        metrics: {
          totalReceber,
          totalPagar,
          lucroEstimado: totalReceber - totalPagar,
          vendasMes: count || 0,
        },
        clientesDevedores: topDevedores,
        contasPagar: topContas,
      };
    },
    enabled: !!userId,
    onError: (error) => {
      handleError(error, { context: "Ao carregar dados do dashboard", silent: true });
    },
    staleTime: 30000, // 30 segundos - dashboard pode ficar um pouco desatualizado
    refetchInterval: 60000, // Refetch automático a cada 1 minuto
  });
}
