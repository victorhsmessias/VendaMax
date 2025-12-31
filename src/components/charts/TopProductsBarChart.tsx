import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useTopProducts } from "@/hooks/api/useStatistics";
import { LoadingSpinner } from "@/components/ui/loading-state";

interface TopProductsBarChartProps {
  limit?: number;
}

/**
 * Componente de gráfico de barras mostrando top produtos mais vendidos
 *
 * @param limit - Número de produtos a mostrar (padrão: 5)
 */
export function TopProductsBarChart({ limit = 5 }: TopProductsBarChartProps) {
  const { data, isLoading, error } = useTopProducts(limit);

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top {limit} Produtos Mais Vendidos</CardTitle>
          <CardDescription>Produtos com maior quantidade vendida</CardDescription>
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
          <CardTitle>Top {limit} Produtos Mais Vendidos</CardTitle>
          <CardDescription>Produtos com maior quantidade vendida</CardDescription>
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
          <CardTitle>Top {limit} Produtos Mais Vendidos</CardTitle>
          <CardDescription>Produtos com maior quantidade vendida</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum produto vendido
          </p>
        </CardContent>
      </Card>
    );
  }

  // Transformar dados para o formato do gráfico (truncar nome longo)
  const chartData = data.map((item) => ({
    name: item.produto_nome.length > 20
      ? item.produto_nome.substring(0, 20) + "..."
      : item.produto_nome,
    quantidade: item.quantidade_total,
    fullName: item.produto_nome,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top {limit} Produtos Mais Vendidos</CardTitle>
        <CardDescription>Produtos com maior quantidade vendida</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              style={{ fontSize: "12px" }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              style={{ fontSize: "12px" }}
              label={{ value: "Quantidade", angle: -90, position: "insideLeft" }}
            />
            <Tooltip
              formatter={(value: number, name: string, props: any) => [
                value,
                `Quantidade de ${props.payload.fullName}`,
              ]}
              labelStyle={{ color: "#000" }}
              contentStyle={{ backgroundColor: "#fff", border: "1px solid #ccc" }}
            />
            <Bar
              dataKey="quantidade"
              fill="hsl(var(--primary))"
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
