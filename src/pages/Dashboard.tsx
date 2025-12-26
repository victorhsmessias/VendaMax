import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { MetricCard } from "@/components/MetricCard";
import { DollarSign, TrendingUp, ShoppingCart, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface DashboardMetrics {
  totalReceber: number;
  totalPagar: number;
  lucroEstimado: number;
  vendasMes: number;
}

interface ClienteDevedor {
  nome: string;
  total_devedor: number;
}

interface ContaPagarFornecedor {
  fornecedor_nome: string;
  total_pendente: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalReceber: 0,
    totalPagar: 0,
    lucroEstimado: 0,
    vendasMes: 0,
  });
  const [clientesDevedores, setClientesDevedores] = useState<ClienteDevedor[]>([]);
  const [contasPagar, setContasPagar] = useState<ContaPagarFornecedor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const vendasResponse = await (supabase as any)
        .from("vendas")
        .select("saldo_devedor")
        .eq("user_id", user.id)
        .eq("status", "PENDENTE");

      const vendas = vendasResponse?.data || [];
      const totalReceber = vendas.reduce((sum: number, v: any) => sum + Number(v.saldo_devedor), 0);

      const contasResponse = await (supabase as any)
        .from("contas_pagar_fornecedor")
        .select("saldo_devedor")
        .eq("user_id", user.id)
        .eq("status", "PENDENTE");

      const contas = contasResponse?.data || [];
      const totalPagar = contas.reduce((sum: number, c: any) => sum + Number(c.saldo_devedor), 0);

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const countResponse = await (supabase as any)
        .from("vendas")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("data_venda", startOfMonth.toISOString());

      const count = countResponse?.count || 0;

      const devedoresResponse = await (supabase as any)
        .from("vendas")
        .select(`
          cliente_id,
          saldo_devedor,
          clientes (nome)
        `)
        .eq("user_id", user.id)
        .eq("status", "PENDENTE")
        .order("saldo_devedor", { ascending: false })
        .limit(5);

      const devedores = devedoresResponse?.data || [];
      const clientesMap = new Map<string, { nome: string; total: number }>();
      devedores.forEach((venda: any) => {
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

      const contasFornecedorResponse = await (supabase as any)
        .from("contas_pagar_fornecedor")
        .select(`
          fornecedor_id,
          saldo_devedor,
          fornecedores (nome)
        `)
        .eq("user_id", user.id)
        .eq("status", "PENDENTE");

      const contasFornecedor = contasFornecedorResponse?.data || [];
      const fornecedoresMap = new Map<string, { nome: string; total: number }>();
      contasFornecedor.forEach((conta: any) => {
        const fornecedorNome = conta.fornecedores?.nome || "Fornecedor";
        const atual = fornecedoresMap.get(fornecedorNome) || { nome: fornecedorNome, total: 0 };
        fornecedoresMap.set(fornecedorNome, {
          nome: fornecedorNome,
          total: atual.total + Number(conta.saldo_devedor),
        });
      });

      const topContas = Array.from(fornecedoresMap.values())
        .map(f => ({ fornecedor_nome: f.nome, total_pendente: f.total }));

      setMetrics({
        totalReceber,
        totalPagar,
        lucroEstimado: totalReceber - totalPagar,
        vendasMes: count,
      });
      setClientesDevedores(topDevedores);
      setContasPagar(topContas);
    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-2xl sm:text-3xl font-bold">Dashboard</h2>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button onClick={() => navigate("/vendas/nova")} className="flex-1 sm:flex-none">Nova Venda</Button>
            <Button variant="outline" onClick={() => navigate("/clientes/novo")} className="flex-1 sm:flex-none">
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
    </Layout>
  );
}
