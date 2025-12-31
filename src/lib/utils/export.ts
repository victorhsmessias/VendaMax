import Papa from "papaparse";
import { format } from "date-fns";

/**
 * Interface genérica para dados exportáveis
 */
export type ExportData = Record<string, any>;

/**
 * Configuração de exportação
 */
export interface ExportConfig {
  filename: string;
  columns?: Record<string, string>; // Mapeamento de chave -> label
  formatters?: Record<string, (value: any) => string>; // Formatadores customizados
}

/**
 * Exporta dados para CSV e faz download automático
 *
 * @param data - Array de objetos a exportar
 * @param config - Configuração da exportação
 *
 * @example
 * ```ts
 * exportToCSV(vendas, {
 *   filename: "vendas",
 *   columns: {
 *     numero_venda: "Número",
 *     data_venda: "Data",
 *     valor_total: "Valor Total"
 *   },
 *   formatters: {
 *     data_venda: (v) => format(new Date(v), "dd/MM/yyyy"),
 *     valor_total: (v) => formatCurrency(v)
 *   }
 * });
 * ```
 */
export function exportToCSV(data: ExportData[], config: ExportConfig): void {
  if (!data || data.length === 0) {
    throw new Error("Nenhum dado para exportar");
  }

  const { filename, columns, formatters } = config;

  // Se columns foi especificado, filtrar e renomear colunas
  let processedData: ExportData[];

  if (columns) {
    processedData = data.map((row) => {
      const newRow: ExportData = {};

      Object.entries(columns).forEach(([key, label]) => {
        let value = row[key];

        // Aplicar formatador se existir
        if (formatters && formatters[key]) {
          value = formatters[key](value);
        }

        // Se o valor for objeto (ex: relação), tentar pegar propriedade 'nome'
        if (value && typeof value === "object" && !Array.isArray(value)) {
          value = value.nome || value.id || JSON.stringify(value);
        }

        newRow[label] = value ?? "";
      });

      return newRow;
    });
  } else {
    // Sem mapeamento de colunas, usar dados originais
    processedData = data.map((row) => {
      const newRow: ExportData = {};

      Object.entries(row).forEach(([key, value]) => {
        let processedValue = value;

        // Aplicar formatador se existir
        if (formatters && formatters[key]) {
          processedValue = formatters[key](processedValue);
        }

        // Se o valor for objeto, tentar pegar propriedade 'nome'
        if (processedValue && typeof processedValue === "object" && !Array.isArray(processedValue)) {
          processedValue = processedValue.nome || processedValue.id || JSON.stringify(processedValue);
        }

        newRow[key] = processedValue ?? "";
      });

      return newRow;
    });
  }

  // Gerar CSV usando Papaparse
  const csv = Papa.unparse(processedData, {
    header: true,
    delimiter: ";", // Ponto e vírgula para melhor compatibilidade com Excel BR
    newline: "\r\n",
  });

  // Adicionar BOM para UTF-8 (garante acentos corretos no Excel)
  const BOM = "\uFEFF";
  const csvWithBOM = BOM + csv;

  // Criar blob e fazer download
  const blob = new Blob([csvWithBOM], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  // Criar link temporário e clicar
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}_${format(new Date(), "yyyy-MM-dd_HHmmss")}.csv`;
  document.body.appendChild(link);
  link.click();

  // Limpar
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Formata valor monetário para exportação CSV
 */
export function formatCurrencyForExport(value: number): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Formata data para exportação CSV
 */
export function formatDateForExport(date: string | Date): string {
  try {
    return format(new Date(date), "dd/MM/yyyy");
  } catch {
    return "";
  }
}

/**
 * Formata data e hora para exportação CSV
 */
export function formatDateTimeForExport(date: string | Date): string {
  try {
    return format(new Date(date), "dd/MM/yyyy HH:mm");
  } catch {
    return "";
  }
}

/**
 * Formata booleano para exportação CSV
 */
export function formatBooleanForExport(value: boolean): string {
  return value ? "Sim" : "Não";
}

/**
 * Sanitiza valor para CSV (remove quebras de linha, aspas duplas, etc)
 */
export function sanitizeForCSV(value: string | null | undefined): string {
  if (!value) return "";

  return String(value)
    .replace(/[\r\n]+/g, " ") // Remove quebras de linha
    .replace(/\s+/g, " ") // Remove múltiplos espaços
    .trim();
}
