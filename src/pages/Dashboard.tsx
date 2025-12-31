import { useEffect } from "react";
import { MetricCard } from "@/components/MetricCard";
import { EstoqueAlert } from "@/components/EstoqueAlert";
import { DollarSign, TrendingUp, ShoppingCart, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { SalesLineChart } from "@/components/charts/SalesLineChart";
import { StatusPieChart } from "@/components/charts/StatusPieChart";
import { TopProductsBarChart } from "@/components/charts/TopProductsBarChart";
import { useDashboard } from "@/hooks/api/useDashboard";
import { useCurrentUserId } from "@/hooks/useCurrentUser";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "@/lib/utils/currency";

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: userId } = useCurrentUserId();

  // React Query hook
  const { data: dashboardData, isLoading, error, refetch } = useDashboard();

  // 🚀 PREFETCH: Pré-carregar rotas comuns ao carregar Dashboard
  useEffect(() => {
    if (!userId) return;

    // Prefetch primeira página de vendas
    queryClient.prefetchQuery({
      queryKey: ["vendas", "paginated", userId, 1, 10, ""],
      queryFn: async () => {
        const { data, error, count } = await supabase
          .from("vendas")
          .select("*, clientes(nome)", { count: "exact" })
          .eq("user_id", userId)
          .order("data_venda", { ascending: false })
          .range(0, 9);

        if (error) throw error;

        return {
          data: data || [],
          totalPages: Math.ceil((count || 0) / 10),
          totalItems: count || 0,
          currentPage: 1,
          pageSize: 10,
        };
      },
      staleTime: 2 * 60 * 1000, // 2 minutos
    });

    // Prefetch primeira página de clientes
    queryClient.prefetchQuery({
      queryKey: ["clientes", "paginated", userId, 1, 10, ""],
      queryFn: async () => {
        const { data, error, count } = await supabase
          .from("clientes")
          .select("*", { count: "exact" })
          .eq("user_id", userId)
          .eq("ativo", true)
          .order("nome")
          .range(0, 9);

        if (error) throw error;

        return {
          data: data || [],
          totalPages: Math.ceil((count || 0) / 10),
          totalItems: count || 0,
          currentPage: 1,
          pageSize: 10,
        };
      },
      staleTime: 2 * 60 * 1000, // 2 minutos
    });

    // Prefetch primeira página de produtos
    queryClient.prefetchQuery({
      queryKey: ["produtos", "paginated", userId, 1, 10, ""],
      queryFn: async () => {
        const { data, error, count } = await supabase
          .from("produtos")
          .select("*, fornecedores(nome)", { count: "exact" })
          .eq("user_id", userId)
          .eq("ativo", true)
          .order("nome")
          .range(0, 9);

        if (error) throw error;

        return {
          data: data || [],
          totalPages: Math.ceil((count || 0) / 10),
          totalItems: count || 0,
          currentPage: 1,
          pageSize: 10,
        };
      },
      staleTime: 2 * 60 * 1000, // 2 minutos
    });
  }, [userId, queryClient]);

  // 🚀 PREFETCH: Pré-carregar produtos e clientes ao hover no botão Nova Venda
  const handleNovaVendaHover = () => {
    if (!userId) return;

    // Prefetch produtos
    queryClient.prefetchQuery({
      queryKey: ["produtos", userId],
      queryFn: async () => {
        const { data } = await supabase
          .from("produtos")
          .select("*, fornecedores(nome)")
          .eq("user_id", userId)
          .eq("ativo", true)
          .order("nome");
        return data || [];
      },
      staleTime: 5 * 60 * 1000, // 5 minutos
    });

    // Prefetch clientes
    queryClient.prefetchQuery({
      queryKey: ["clientes", userId],
      queryFn: async () => {
        const { data } = await supabase
          .from("clientes")
          .select("*")
          .eq("user_id", userId)
          .eq("ativo", true)
          .order("nome");
        return data || [];
      },
      staleTime: 5 * 60 * 1000, // 5 minutos
    });
  };

  // Estado: Loading
  if (isLoading) {
    return <LoadingState message="Carregando dashboard..." />;
  }

  // Estado: Error
  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl sm:text-3xl font-bold">Dashboard</h2>
        <ErrorState error={error} retry={refetch} />
      </div>
    );
  }

  if (!dashboardData) return null;

  const { metrics, clientesDevedores, contasPagar } = dashboardData;

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-2xl sm:text-3xl font-bold">Dashboard</h2>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              onClick={() => navigate("/vendas/nova")}
              onMouseEnter={handleNovaVendaHover}
              className="flex-1 sm:flex-none"
            >
              Nova Venda
            </Button>
            <Button variant="outline" onClick={() => navigate("/clientes?novo=true")} className="flex-1 sm:flex-none">
              Novo Cliente
            </Button>
          </div>
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total a Receber"
            value={formatCurrency(metrics.totalReceber)}
            icon={DollarSign}
            variant="success"
          />
          <MetricCard
            title="Total a Pagar"
            value={formatCurrency(metrics.totalPagar)}
            icon={DollarSign}
            variant="danger"
          />
          <MetricCard
            title="Lucro Estimado"
            value={formatCurrency(metrics.lucroEstimado)}
            icon={TrendingUp}
            variant={metrics.lucroEstimado >= 0 ? "success" : "danger"}
          />
          <MetricCard
            title="Vendas no Mês"
            value={metrics.vendasMes}
            icon={ShoppingCart}
            variant="default"
          />
        </div>

        {/* Gráficos de Estatísticas */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          <SalesLineChart days={30} />
          <StatusPieChart />
        </div>

        <div className="grid gap-4 grid-cols-1">
          <TopProductsBarChart limit={5} />
        </div>

        {/* Alerta de Estoque */}
        <div className="grid gap-4 grid-cols-1">
          <EstoqueAlert />
        </div>

        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Top 5 Clientes Devedores
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {clientesDevedores.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum devedor no momento</p>
              ) : (
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientesDevedores.map((cliente, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{cliente.nome}</TableCell>
                        <TableCell className="text-right text-destructive font-semibold">
                          {formatCurrency(cliente.total_devedor)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Contas a Pagar por Fornecedor
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {contasPagar.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma conta pendente</p>
              ) : (
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contasPagar.map((conta, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{conta.fornecedor_nome}</TableCell>
                        <TableCell className="text-right text-warning font-semibold">
                          {formatCurrency(conta.total_pendente)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
  );
}
