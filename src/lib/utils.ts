import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Re-export currency utilities for convenience
export {
  formatCurrency,
  formatDate,
  formatDateTime,
  calculatePercentage,
  formatPercentage,
} from "./utils/currency";
