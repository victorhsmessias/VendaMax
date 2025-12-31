import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { useRelatorioProdutos } from "@/hooks/api/useRelatorios";
import { Package, DollarSign, TrendingUp, Percent } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface RelatorioProdutosProps {
  dataInicio: Date;
  dataFim: Date;
}

export function RelatorioProdutos({ dataInicio, dataFim }: RelatorioProdutosProps) {
  const { data, isLoading, error, refetch } = useRelatorioProdutos(dataInicio, dataFim);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Relatório de Produtos e Lucro</CardTitle>
        </CardHeader>
        <CardContent>
          <LoadingState message="Carregando relatório de produtos..." />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Relatório de Produtos e Lucro</CardTitle>
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
          <Package className="h-5 w-5 text-primary" />
          Relatório de Produtos e Lucro
        </CardTitle>
        <CardDescription>Período: {data.periodo}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Métricas Gerais */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Package className="h-4 w-4" />
                Produtos Vendidos
              </CardDescription>
              <CardTitle className="text-2xl">{data.totalProdutosVendidos}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Unidades vendidas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                Valor Total Vendido
              </CardDescription>
              <CardTitle className="text-2xl">{formatCurrency(data.valorTotalVendido)}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Receita com produtos
              </p>
            </CardContent>
          </Card>

          <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1 text-green-700 dark:text-green-400">
                <TrendingUp className="h-4 w-4" />
                Lucro Total
              </CardDescription>
              <CardTitle className="text-2xl text-green-700 dark:text-green-400">
                {formatCurrency(data.lucroTotalProdutos)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-green-600 dark:text-green-500">
                Receita - Custo
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Percent className="h-4 w-4" />
                Margem Média
              </CardDescription>
              <CardTitle className="text-2xl">{data.margemLucroMedia.toFixed(1)}%</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Margem de lucro média
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico: Top Produtos por Quantidade */}
        {data.produtosMaisVendidos.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-4">Top 10 Produtos Mais Vendidos (por quantidade)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={data.produtosMaisVendidos.slice(0, 10)}
                layout="vertical"
                margin={{ left: 100 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" />
                <YAxis
                  type="category"
                  dataKey="produto_nome"
                  className="text-xs"
                  width={90}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(value: number) => value}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                />
                <Bar
                  dataKey="quantidade_vendida"
                  fill="hsl(var(--primary))"
                  name="Quantidade"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Tabela: Detalhes dos Produtos */}
        {data.produtosMaisVendidos.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-3">Detalhamento de Produtos Vendidos</h3>
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">Valor Vendido</TableHead>
                      <TableHead className="text-right hidden md:table-cell">Custo</TableHead>
                      <TableHead className="text-right">Lucro</TableHead>
                      <TableHead className="text-right hidden lg:table-cell">Margem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.produtosMaisVendidos.map((produto) => (
                      <TableRow key={produto.produto_id}>
                        <TableCell className="font-medium">{produto.produto_nome}</TableCell>
                        <TableCell className="text-right">{produto.quantidade_vendida}</TableCell>
                        <TableCell className="text-right hidden sm:table-cell">
                          {formatCurrency(produto.valor_total)}
                        </TableCell>
                        <TableCell className="text-right text-destructive hidden md:table-cell">
                          {formatCurrency(produto.custo_total)}
                        </TableCell>
                        <TableCell className="text-right text-green-600 font-semibold">
                          {formatCurrency(produto.lucro)}
                        </TableCell>
                        <TableCell className="text-right hidden lg:table-cell">
                          <span className={produto.margem_lucro >= 30 ? "text-green-600" : produto.margem_lucro >= 15 ? "text-yellow-600" : "text-red-600"}>
                            {produto.margem_lucro.toFixed(1)}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Legenda de Margem */}
            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-600"></div>
                <span>Margem ≥ 30%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-yellow-600"></div>
                <span>Margem 15-30%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-red-600"></div>
                <span>Margem &lt; 15%</span>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {data.totalProdutosVendidos === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              Nenhum produto vendido no período selecionado
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
