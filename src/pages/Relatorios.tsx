import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { RelatorioVendas } from "@/components/relatorios/RelatorioVendas";
import { RelatorioFluxoCaixa } from "@/components/relatorios/RelatorioFluxoCaixa";
import { RelatorioProdutos } from "@/components/relatorios/RelatorioProdutos";
import { useDefaultPeriod } from "@/hooks/api/useRelatorios";
import { FileText, Calendar } from "lucide-react";
import { format } from "date-fns";

export default function Relatorios() {
  const { dataInicio: defaultInicio, dataFim: defaultFim } = useDefaultPeriod();

  const [dataInicio, setDataInicio] = useState(format(defaultInicio, "yyyy-MM-dd"));
  const [dataFim, setDataFim] = useState(format(defaultFim, "yyyy-MM-dd"));

  // Converter strings para Date objects para passar aos hooks
  const dataInicioDate = new Date(dataInicio + "T00:00:00");
  const dataFimDate = new Date(dataFim + "T23:59:59");

  const aplicarPeriodo = (tipo: "mes-atual" | "mes-passado" | "trimestre" | "ano") => {
    const hoje = new Date();
    let inicio: Date;
    let fim: Date;

    switch (tipo) {
      case "mes-atual":
        inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
        break;
      case "mes-passado":
        inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
        fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
        break;
      case "trimestre":
        const mesInicio = Math.floor(hoje.getMonth() / 3) * 3;
        inicio = new Date(hoje.getFullYear(), mesInicio, 1);
        fim = new Date(hoje.getFullYear(), mesInicio + 3, 0);
        break;
      case "ano":
        inicio = new Date(hoje.getFullYear(), 0, 1);
        fim = new Date(hoje.getFullYear(), 11, 31);
        break;
    }

    setDataInicio(format(inicio, "yyyy-MM-dd"));
    setDataFim(format(fim, "yyyy-MM-dd"));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          <h2 className="text-2xl sm:text-3xl font-bold">Relatórios Financeiros</h2>
        </div>
      </div>

      {/* Filtro de Período */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Período do Relatório
          </CardTitle>
          <CardDescription>
            Selecione o período para visualizar os relatórios financeiros
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Data Inicial" htmlFor="data-inicio">
              <Input
                id="data-inicio"
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </FormField>

            <FormField label="Data Final" htmlFor="data-fim">
              <Input
                id="data-fim"
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </FormField>
          </div>

          {/* Botões de período rápido */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => aplicarPeriodo("mes-atual")}>
              Mês Atual
            </Button>
            <Button variant="outline" size="sm" onClick={() => aplicarPeriodo("mes-passado")}>
              Mês Passado
            </Button>
            <Button variant="outline" size="sm" onClick={() => aplicarPeriodo("trimestre")}>
              Trimestre Atual
            </Button>
            <Button variant="outline" size="sm" onClick={() => aplicarPeriodo("ano")}>
              Ano Atual
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Relatórios */}
      <div className="space-y-6">
        <RelatorioVendas dataInicio={dataInicioDate} dataFim={dataFimDate} />
        <RelatorioFluxoCaixa dataInicio={dataInicioDate} dataFim={dataFimDate} />
        <RelatorioProdutos dataInicio={dataInicioDate} dataFim={dataFimDate} />
      </div>
    </div>
  );
}
