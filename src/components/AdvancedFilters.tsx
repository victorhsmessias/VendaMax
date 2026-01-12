import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Filter, X, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { FilterConfig } from "@/lib/utils/filters";

export interface FilterOption {
  label: string;
  value: string;
}

export interface AdvancedFiltersProps {
  filters: FilterConfig;
  onFilterChange: <K extends keyof FilterConfig>(key: K, value: FilterConfig[K]) => void;
  onReset: () => void;
  activeCount: number;

  // Configuração de quais filtros mostrar
  showDateRange?: boolean;
  showStatus?: boolean;
  showValueRange?: boolean;
  showCustomSelect?: boolean;

  // Opções para filtros de seleção
  statusOptions?: FilterOption[];
  customSelectLabel?: string;
  customSelectKey?: string;
  customSelectOptions?: FilterOption[];
  customSelectPlaceholder?: string;

  // Labels customizáveis
  dateFromLabel?: string;
  dateToLabel?: string;
  valueMinLabel?: string;
  valueMaxLabel?: string;
}

/**
 * Componente reutilizável de filtros avançados
 *
 * Suporta filtros de:
 * - Range de datas (data inicial e final)
 * - Status múltiplos (checkboxes)
 * - Range de valores (min/max)
 * - Select customizado (ex: cidade, fornecedor, etc)
 *
 * @example
 * ```tsx
 * <AdvancedFilters
 *   filters={filters}
 *   onFilterChange={setFilter}
 *   onReset={resetFilters}
 *   activeCount={activeCount}
 *   showDateRange
 *   showStatus
 *   statusOptions={[
 *     { label: "Finalizada", value: "finalizada" },
 *     { label: "Pendente", value: "pendente" },
 *   ]}
 * />
 * ```
 */
export function AdvancedFilters({
  filters,
  onFilterChange,
  onReset,
  activeCount,
  showDateRange = false,
  showStatus = false,
  showValueRange = false,
  showCustomSelect = false,
  statusOptions = [],
  customSelectLabel = "Filtro",
  customSelectKey = "customFilter",
  customSelectOptions = [],
  customSelectPlaceholder = "Selecione...",
  dateFromLabel = "Data Inicial",
  dateToLabel = "Data Final",
  valueMinLabel = "Valor Mínimo",
  valueMaxLabel = "Valor Máximo",
}: AdvancedFiltersProps) {
  // Handler para toggle de status (checkboxes)
  const handleStatusToggle = (status: string) => {
    const currentStatus = (filters.status as string[]) || [];
    const newStatus = currentStatus.includes(status)
      ? currentStatus.filter((s) => s !== status)
      : [...currentStatus, status];

    onFilterChange("status", newStatus);
  };

  // Handler para mudança de data
  const handleDateChange = (key: "dateFrom" | "dateTo", date: Date | undefined) => {
    onFilterChange(key, date ? date.toISOString() : undefined);
  };

  // Verifica se há algum filtro ativo
  const hasActiveFilters = activeCount > 0;
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="relative">
          <Filter className="mr-2 h-4 w-4" />
          Filtros
          {activeCount > 0 && (
            <Badge variant="default" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center">
              {activeCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 sm:w-96" align="start">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium leading-none">Filtros Avançados</h4>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={onReset}>
                <X className="mr-1 h-3 w-3" />
                Limpar
              </Button>
            )}
          </div>

          {/* Filtro de Range de Datas */}
          {showDateRange && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Período</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Data Inicial */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{dateFromLabel}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !filters.dateFrom && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.dateFrom
                          ? format(new Date(filters.dateFrom), "dd/MM/yyyy", { locale: ptBR })
                          : "Selecionar"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.dateFrom ? new Date(filters.dateFrom) : undefined}
                        onSelect={(date) => handleDateChange("dateFrom", date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Data Final */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{dateToLabel}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !filters.dateTo && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.dateTo
                          ? format(new Date(filters.dateTo), "dd/MM/yyyy", { locale: ptBR })
                          : "Selecionar"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.dateTo ? new Date(filters.dateTo) : undefined}
                        onSelect={(date) => handleDateChange("dateTo", date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          )}

          {/* Filtro de Status (checkboxes múltiplos) */}
          {showStatus && statusOptions.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Status</Label>
              <div className="space-y-2">
                {statusOptions.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`status-${option.value}`}
                      checked={((filters.status as string[]) || []).includes(option.value)}
                      onCheckedChange={() => handleStatusToggle(option.value)}
                    />
                    <Label
                      htmlFor={`status-${option.value}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filtro de Range de Valores */}
          {showValueRange && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Valor</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{valueMinLabel}</Label>
                  <Input
                    type="number"
                    placeholder="R$ 0,00"
                    value={filters.valueMin || ""}
                    onChange={(e) =>
                      onFilterChange("valueMin", e.target.value ? parseFloat(e.target.value) : undefined)
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{valueMaxLabel}</Label>
                  <Input
                    type="number"
                    placeholder="R$ 0,00"
                    value={filters.valueMax || ""}
                    onChange={(e) =>
                      onFilterChange("valueMax", e.target.value ? parseFloat(e.target.value) : undefined)
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {/* Select Customizado (ex: cidade, fornecedor, etc) */}
          {showCustomSelect && customSelectOptions.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">{customSelectLabel}</Label>
              <Select
                value={(filters[customSelectKey] as string) || undefined}
                onValueChange={(value) => onFilterChange(customSelectKey, value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={customSelectPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {customSelectOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
