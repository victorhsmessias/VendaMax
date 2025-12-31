import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ExportData, ExportConfig } from "@/lib/utils/export";
import { exportToCSV } from "@/lib/utils/export";

interface ExportButtonProps {
  data: ExportData[] | undefined;
  config: ExportConfig;
  disabled?: boolean;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  label?: string;
}

/**
 * Componente reutilizável de botão de exportação para CSV
 *
 * @param data - Dados a exportar (array de objetos)
 * @param config - Configuração da exportação (filename, columns, formatters)
 * @param disabled - Se o botão está desabilitado
 * @param variant - Variante do botão
 * @param size - Tamanho do botão
 * @param className - Classes CSS adicionais
 * @param label - Texto do botão (padrão: "Exportar CSV")
 *
 * @example
 * ```tsx
 * <ExportButton
 *   data={vendas}
 *   config={{
 *     filename: "vendas",
 *     columns: {
 *       numero_venda: "Número",
 *       data_venda: "Data",
 *       valor_total: "Valor"
 *     }
 *   }}
 * />
 * ```
 */
export function ExportButton({
  data,
  config,
  disabled = false,
  variant = "outline",
  size = "default",
  className = "",
  label = "Exportar CSV",
}: ExportButtonProps) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    if (!data || data.length === 0) {
      toast({
        title: "Nenhum dado para exportar",
        description: "Não há dados disponíveis para exportação.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsExporting(true);

      // Executar exportação
      exportToCSV(data, config);

      toast({
        title: "Exportação concluída",
        description: `${data.length} ${data.length === 1 ? "registro exportado" : "registros exportados"} com sucesso.`,
      });
    } catch (error) {
      console.error("Erro ao exportar:", error);

      toast({
        title: "Erro na exportação",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao exportar os dados.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleExport}
      disabled={disabled || isExporting || !data || data.length === 0}
      className={className}
    >
      <Download className="h-4 w-4 mr-2" />
      {isExporting ? "Exportando..." : label}
    </Button>
  );
}
