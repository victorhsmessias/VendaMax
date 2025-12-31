import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useSalesOverTime } from "@/hooks/api/useStatistics";
import { LoadingSpinner } from "@/components/ui/loading-state";
import { formatCurrency } from "@/lib/utils/currency";

interface SalesLineChartProps {
  days?: number;
}

/**
 * Componente de gráfico de linha mostrando vendas ao longo do tempo
 *
 * @param days - Número de dias a mostrar (padrão: 30)
 */
export function SalesLineChart({ days = 30 }: SalesLineChartProps) {
  const { data, isLoading, error } = useSalesOverTime(days);

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vendas ao Longo do Tempo</CardTitle>
          <CardDescription>Últimos {days} dias</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Erro ao carregar gráfico
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vendas ao Longo do Tempo</CardTitle>
          <CardDescription>Últimos {days} dias</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vendas ao Longo do Tempo</CardTitle>
          <CardDescription>Últimos {days} dias</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma venda no período
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vendas ao Longo do Tempo</CardTitle>
        <CardDescription>Últimos {days} dias - Total de vendas por dia</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              style={{ fontSize: "12px" }}
            />
            <YAxis
              style={{ fontSize: "12px" }}
              tickFormatter={(value) => formatCurrency(value)}
            />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              labelStyle={{ color: "#000" }}
              contentStyle={{ backgroundColor: "#fff", border: "1px solid #ccc" }}
            />
            <Line
              type="monotone"
              dataKey="total"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--primary))" }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
