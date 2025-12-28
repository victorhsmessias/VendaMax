/**
 * Formata um número para o formato de moeda brasileira (BRL)
 * @param value - Valor numérico a ser formatado
 * @returns String formatada como moeda (ex: R$ 1.234,56)
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/**
 * Formata uma data para o formato brasileiro
 * @param date - Data a ser formatada (string ISO ou Date)
 * @returns String formatada como data (ex: 26/12/2025)
 */
export function formatDate(date: string | Date): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR").format(dateObj);
}

/**
 * Formata uma data com hora para o formato brasileiro
 * @param date - Data a ser formatada (string ISO ou Date)
 * @returns String formatada com data e hora (ex: 26/12/2025 14:30)
 */
export function formatDateTime(date: string | Date): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(dateObj);
}

/**
 * Calcula a porcentagem de um valor em relação a um total
 * @param value - Valor
 * @param total - Total
 * @returns Porcentagem calculada
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return (value / total) * 100;
}

/**
 * Formata um número como porcentagem
 * @param value - Valor numérico (ex: 0.15 para 15%)
 * @param decimals - Número de casas decimais (padrão: 1)
 * @returns String formatada como porcentagem (ex: 15,0%)
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}
