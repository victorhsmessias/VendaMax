import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { useRelatorioVendas } from "@/hooks/api/useRelatorios";
import { TrendingUp, DollarSign, ShoppingCart, Target } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { format } from "date-fns";

interface RelatorioVendasProps {
  dataInicio: Date;
  dataFim: Date;
}

export function RelatorioVendas({ dataInicio, dataFim }: RelatorioVendasProps) {
  const { data, isLoading, error, refetch } = useRelatorioVendas(dataInicio, dataFim);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Relatório de Vendas</CardTitle>
        </CardHeader>
        <CardContent>
          <LoadingState message="Carregando relatório de vendas..." />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Relatório de Vendas</CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorState error={error} retry={refetch} />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Relatório de Vendas
        </CardTitle>
        <CardDescription>Período: {data.periodo}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Métricas Gerais */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <ShoppingCart className="h-4 w-4" />
                Total de Vendas
              </CardDescription>
              <CardTitle className="text-2xl">{data.totalVendas}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Vendas realizadas no período
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                Valor Total
              </CardDescription>
              <CardTitle className="text-2xl">{formatCurrency(data.valorTotal)}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-success">
                Pago: {formatCurrency(data.valorPago)}
              </p>
              <p className="text-xs text-destructive">
                A Receber: {formatCurrency(data.saldoDevedor)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                Ticket Médio
              </CardDescription>
              <CardTitle className="text-2xl">{formatCurrency(data.ticketMedio)}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Valor médio por venda
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Target className="h-4 w-4" />
                Taxa de Conversão
              </CardDescription>
              <CardTitle className="text-2xl">{data.taxaConversao.toFixed(1)}%</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Vendas pagas / Total
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico: Vendas por Dia */}
        {data.vendasPorDia.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-4">Evolução de Vendas no Período</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.vendasPorDia}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="data"
                  tickFormatter={(value) => format(new Date(value), "dd/MM")}
                  className="text-xs"
                />
                <YAxis className="text-xs" />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    if (name === "valor") return formatCurrency(value);
                    return value;
                  }}
                  labelFormatter={(label) => format(new Date(label as string), "dd/MM/yyyy")}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="quantidade"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  name="Quantidade"
                  dot={{ fill: "hsl(var(--primary))" }}
                />
                <Line
                  type="monotone"
                  dataKey="valor"
                  stroke="hsl(142, 76%, 36%)"
                  strokeWidth={2}
                  name="Valor"
                  dot={{ fill: "hsl(142, 76%, 36%))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Gráfico: Vendas por Status */}
        {data.vendasPorStatus.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-4">Vendas por Status</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.vendasPorStatus}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="status" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    if (name === "valor") return formatCurrency(value);
                    return value;
                  }}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                />
                <Bar dataKey="quantidade" fill="hsl(var(--primary))" name="Quantidade" />
                <Bar dataKey="valor" fill="hsl(142, 76%, 36%)" name="Valor (R$)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Empty State */}
        {data.totalVendas === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              Nenhuma venda encontrada no período selecionado
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
