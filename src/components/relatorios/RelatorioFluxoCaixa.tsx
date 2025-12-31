import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { useRelatorioFluxoCaixa } from "@/hooks/api/useRelatorios";
import { ArrowUpCircle, ArrowDownCircle, TrendingUp, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface RelatorioFluxoCaixaProps {
  dataInicio: Date;
  dataFim: Date;
}

export function RelatorioFluxoCaixa({ dataInicio, dataFim }: RelatorioFluxoCaixaProps) {
  const { data, isLoading, error, refetch } = useRelatorioFluxoCaixa(dataInicio, dataFim);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Relatório de Fluxo de Caixa</CardTitle>
        </CardHeader>
        <CardContent>
          <LoadingState message="Carregando relatório de fluxo de caixa..." />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Relatório de Fluxo de Caixa</CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorState error={error} retry={refetch} />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const chartData = [
    {
      categoria: "Entradas",
      valor: data.entradas,
    },
    {
      categoria: "Saídas",
      valor: data.saidas,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          Relatório de Fluxo de Caixa
        </CardTitle>
        <CardDescription>Período: {data.periodo}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Resumo de Fluxo de Caixa */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1 text-green-700 dark:text-green-400">
                <ArrowUpCircle className="h-4 w-4" />
                Entradas
              </CardDescription>
              <CardTitle className="text-2xl text-green-700 dark:text-green-400">
                {formatCurrency(data.entradas)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-green-600 dark:text-green-500">
                Recebimentos de vendas
              </p>
            </CardContent>
          </Card>

          <Card className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1 text-red-700 dark:text-red-400">
                <ArrowDownCircle className="h-4 w-4" />
                Saídas
              </CardDescription>
              <CardTitle className="text-2xl text-red-700 dark:text-red-400">
                {formatCurrency(data.saidas)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-red-600 dark:text-red-500">
                Pagamentos a fornecedores
              </p>
            </CardContent>
          </Card>

          <Card className={data.saldo >= 0 ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900" : "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900"}>
            <CardHeader className="pb-2">
              <CardDescription className={`flex items-center gap-1 ${data.saldo >= 0 ? "text-blue-700 dark:text-blue-400" : "text-yellow-700 dark:text-yellow-400"}`}>
                <TrendingUp className="h-4 w-4" />
                Saldo do Período
              </CardDescription>
              <CardTitle className={`text-2xl ${data.saldo >= 0 ? "text-blue-700 dark:text-blue-400" : "text-yellow-700 dark:text-yellow-400"}`}>
                {formatCurrency(data.saldo)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-xs ${data.saldo >= 0 ? "text-blue-600 dark:text-blue-500" : "text-yellow-600 dark:text-yellow-500"}`}>
                {data.saldo >= 0 ? "Superávit" : "Déficit"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico de Comparação */}
        <div>
          <h3 className="text-sm font-semibold mb-4">Comparativo Entradas vs Saídas</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="categoria" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                }}
              />
              <Legend />
              <Bar
                dataKey="valor"
                fill="hsl(var(--primary))"
                name="Valor (R$)"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Detalhes de Entradas */}
        {data.detalhesEntradas.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <ArrowUpCircle className="h-4 w-4 text-green-600" />
              Detalhes de Entradas ({data.detalhesEntradas.length})
            </h3>
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-card">
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.detalhesEntradas.map((entrada, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="whitespace-nowrap">{entrada.data}</TableCell>
                        <TableCell>{entrada.descricao}</TableCell>
                        <TableCell className="text-right text-green-600 font-semibold">
                          {formatCurrency(entrada.valor)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}

        {/* Detalhes de Saídas */}
        {data.detalhesSaidas.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <ArrowDownCircle className="h-4 w-4 text-red-600" />
              Detalhes de Saídas ({data.detalhesSaidas.length})
            </h3>
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-card">
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.detalhesSaidas.map((saida, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="whitespace-nowrap">{saida.data}</TableCell>
                        <TableCell>{saida.descricao}</TableCell>
                        <TableCell className="text-right text-red-600 font-semibold">
                          {formatCurrency(saida.valor)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {data.entradas === 0 && data.saidas === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              Nenhuma movimentação financeira no período selecionado
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
