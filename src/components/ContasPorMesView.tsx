import { useState } from "react";
import { useContasPorMes, useContasMes } from "@/hooks/api/useContasPagar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCurrency, formatDate } from "@/lib/utils/currency";
import { ChevronDown, ChevronUp, Calendar } from "lucide-react";

export function ContasPorMesView() {
  const { data: resumoMensal, isLoading, error, refetch } = useContasPorMes();
  const [mesExpandido, setMesExpandido] = useState<{ ano: number; mes: number } | null>(null);

  const handleToggleMes = (ano: number, mes: number) => {
    if (mesExpandido?.ano === ano && mesExpandido?.mes === mes) {
      setMesExpandido(null);
    } else {
      setMesExpandido({ ano, mes });
    }
  };

  if (error) {
    return <ErrorState error={error} retry={refetch} />;
  }

  if (isLoading) {
    return <LoadingState message="Carregando resumo mensal..." />;
  }

  if (!resumoMensal || resumoMensal.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Nenhuma conta a pagar</h3>
        <p className="text-sm text-muted-foreground">
          Não há contas a pagar cadastradas para os próximos meses
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[60vh]">
      <div className="space-y-4 p-2">
        {resumoMensal.map((mes) => (
          <Card key={`${mes.ano}-${mes.mes}`} className="overflow-hidden">
            <CardHeader
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => handleToggleMes(mes.ano, mes.mes)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <CardTitle className="text-lg">{mes.mes_nome}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {mes.quantidade_contas} {mes.quantidade_contas === 1 ? "conta" : "contas"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-semibold text-lg">{formatCurrency(mes.total_mes)}</div>
                    <div className="flex gap-3 text-sm mt-1">
                      <span className="text-success">
                        Pago: {formatCurrency(mes.total_pago)}
                      </span>
                      <span className="text-destructive font-medium">
                        Pendente: {formatCurrency(mes.total_pendente)}
                      </span>
                    </div>
                  </div>
                  {mesExpandido?.ano === mes.ano && mesExpandido?.mes === mes.mes ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CardHeader>

            {mesExpandido?.ano === mes.ano && mesExpandido?.mes === mes.mes && (
              <CardContent className="pt-0">
                <DetalhesDoMes ano={mes.ano} mes={mes.mes} />
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}

interface DetalhesDoMesProps {
  ano: number;
  mes: number;
}

function DetalhesDoMes({ ano, mes }: DetalhesDoMesProps) {
  const { data: contas, isLoading, error } = useContasMes(ano, mes);

  if (error) {
    return (
      <div className="py-4 text-center text-sm text-destructive">
        Erro ao carregar detalhes do mês
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="py-4">
        <LoadingState message="Carregando contas..." />
      </div>
    );
  }

  if (!contas || contas.length === 0) {
    return (
      <div className="py-4 text-center text-sm text-muted-foreground">
        Nenhuma conta encontrada para este mês
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fornecedor</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Vencimento</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contas.map((conta) => (
            <TableRow key={conta.id}>
              <TableCell className="font-medium">
                {conta.fornecedores?.nome || "-"}
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  <span className="text-sm">{conta.descricao}</span>
                  {conta.parcela_numero && conta.parcela_total && (
                    <Badge variant="secondary" className="w-fit text-xs">
                      Parcela {conta.parcela_numero}/{conta.parcela_total}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-sm">
                {conta.data_vencimento ? formatDate(conta.data_vencimento) : "-"}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(conta.valor)}
              </TableCell>
              <TableCell>
                {conta.status === "PAGO" ? (
                  <Badge variant="default">PAGO</Badge>
                ) : (
                  <Badge variant="outline">PENDENTE</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
