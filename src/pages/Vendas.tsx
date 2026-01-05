import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { AdvancedFilters } from "@/components/AdvancedFilters";
import { ExportButton } from "@/components/ExportButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useVendasPaginated, useDeleteVenda } from "@/hooks/api/useVendas";
import { useVendasStatistics } from "@/hooks/api/useStatistics";
import { useClientes } from "@/hooks/api/useClientes";
import { usePagination } from "@/hooks/usePagination";
import { useDebounce } from "@/hooks/useDebounce";
import { useFilters } from "@/hooks/useFilters";
import { useCurrentUserId } from "@/hooks/useCurrentUser";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Plus, Eye, Search, Trash2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils/currency";
import { formatCurrencyForExport, formatDateForExport } from "@/lib/utils/export";
import { toast } from "sonner";

interface Venda {
  id: string;
  numero_venda: string;
  data_venda: string;
  valor_total: number;
  valor_pago: number;
  saldo_devedor: number;
  status: string;
  clientes?: { nome: string };
}

export default function Vendas() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: userId } = useCurrentUserId();

  // Estado para controlar o dialog de confirmação de exclusão
  const [vendaToDelete, setVendaToDelete] = useState<Venda | null>(null);

  // Mutation para deletar venda
  const deleteVendaMutation = useDeleteVenda();

  // Limpar filtros corrompidos do localStorage ao montar (fix para Safari)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('filters_vendas');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Se todos os valores forem vazios, limpar
        const hasValidFilter = Object.values(parsed).some(value => {
          if (typeof value === 'string' && value.trim() !== '') return true;
          if (Array.isArray(value) && value.length > 0) return true;
          if (typeof value === 'number') return true;
          return false;
        });

        if (!hasValidFilter) {
          console.log('[VendaMax] Limpando filtros vazios do localStorage');
          localStorage.removeItem('filters_vendas');
        }
      }
    } catch (error) {
      console.error('[VendaMax] Erro ao verificar filtros:', error);
      localStorage.removeItem('filters_vendas');
    }
  }, []);

  // Filtros avançados com persistência
  const { filters, setFilter, resetFilters, activeCount } = useFilters("vendas", {
    search: "",
    dateFrom: undefined,
    dateTo: undefined,
    status: [],
    valueMin: undefined,
    valueMax: undefined,
    clienteId: undefined,
  });

  // Busca com debouncing (sincronizada com filters.search)
  const [searchTerm, setSearchTerm] = useState(filters.search || "");
  const debouncedSearch = useDebounce(searchTerm, 500);

  // Sincronizar searchTerm com filters.search quando debounced
  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      setFilter("search", debouncedSearch);
    }
  }, [debouncedSearch]);

  // Paginação
  const PAGE_SIZE = 10;
  const { currentPage, goToPage } = usePagination(0, PAGE_SIZE);

  // Carregar clientes para o filtro de cliente
  const { data: clientes } = useClientes();

  // React Query hooks com paginação e filtros
  const { data: vendasData, isLoading, error, refetch } = useVendasPaginated(currentPage, PAGE_SIZE, filters);

  // Estatísticas gerais de vendas
  const { data: statistics } = useVendasStatistics();

  // Resetar para página 1 quando os filtros mudarem
  useEffect(() => {
    goToPage(1);
  }, [filters]);

  const vendas = vendasData?.data || [];
  const totalPages = vendasData?.totalPages || 0;
  const totalItems = vendasData?.totalItems || 0;

  // 🚀 PREFETCH: Pré-carregar detalhes da venda ao passar o mouse
  const handleVendaHover = (vendaId: string) => {
    queryClient.prefetchQuery({
      queryKey: ["vendas", vendaId, userId],
      queryFn: async () => {
        if (!userId) return null;

        // Buscar venda
        const { data: venda, error: vendaError } = await supabase
          .from("vendas")
          .select("*")
          .eq("id", vendaId)
          .eq("user_id", userId)
          .single();

        if (vendaError) throw vendaError;

        // Buscar cliente
        const { data: cliente } = await supabase
          .from("clientes")
          .select("*")
          .eq("id", venda.cliente_id)
          .single();

        // Buscar itens da venda
        const { data: itens } = await supabase
          .from("itens_venda")
          .select(`
            *,
            produtos (nome, codigo)
          `)
          .eq("venda_id", vendaId);

        // Buscar pagamentos
        const { data: pagamentos } = await supabase
          .from("pagamentos")
          .select("*")
          .eq("venda_id", vendaId)
          .order("data_pagamento", { ascending: false });

        return {
          venda,
          cliente,
          itens: itens || [],
          pagamentos: pagamentos || [],
        };
      },
      staleTime: 5 * 60 * 1000, // Cache por 5 minutos
    });
  };

  // 🚀 PREFETCH: Pré-carregar produtos e clientes ao hover no botão Nova Venda
  const handleNovaVendaHover = () => {
    if (!userId) return;

    // Prefetch produtos
    queryClient.prefetchQuery({
      queryKey: ["produtos", userId],
      queryFn: async () => {
        const { data } = await supabase
          .from("produtos")
          .select("*, fornecedores(nome)")
          .eq("user_id", userId)
          .eq("ativo", true)
          .order("nome");
        return data || [];
      },
      staleTime: 5 * 60 * 1000, // 5 minutos
    });

    // Prefetch clientes
    queryClient.prefetchQuery({
      queryKey: ["clientes", userId],
      queryFn: async () => {
        const { data } = await supabase
          .from("clientes")
          .select("*")
          .eq("user_id", userId)
          .eq("ativo", true)
          .order("nome");
        return data || [];
      },
      staleTime: 5 * 60 * 1000, // 5 minutos
    });
  };

  // Função para confirmar e executar a exclusão da venda
  const handleConfirmDelete = async () => {
    if (!vendaToDelete) return;

    try {
      await deleteVendaMutation.mutateAsync(vendaToDelete.id);
      toast.success("Venda excluída com sucesso!");
      setVendaToDelete(null);
    } catch (error) {
      // Erro já é tratado pelo hook useDeleteVenda
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "destructive" | "outline"> = {
      PAGO: "default",
      PENDENTE: "outline",
      CANCELADO: "destructive",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  // Estado: Error
  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl sm:text-3xl font-bold">Vendas</h2>
        <ErrorState error={error} retry={refetch} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-2xl sm:text-3xl font-bold">Vendas</h2>
          <div className="flex gap-2 w-full sm:w-auto">
            <ExportButton
              data={vendas}
              config={{
                filename: "vendas",
                columns: {
                  numero_venda: "Número",
                  clientes: "Cliente",
                  data_venda: "Data",
                  valor_total: "Valor Total",
                  valor_pago: "Valor Pago",
                  saldo_devedor: "Saldo Devedor",
                  status: "Status",
                },
                formatters: {
                  data_venda: formatDateForExport,
                  valor_total: formatCurrencyForExport,
                  valor_pago: formatCurrencyForExport,
                  saldo_devedor: formatCurrencyForExport,
                },
              }}
              variant="outline"
              size="default"
              className="flex-1 sm:flex-none"
            />
            <Button
              onClick={() => navigate("/vendas/nova")}
              onMouseEnter={handleNovaVendaHover}
              className="flex-1 sm:flex-none"
            >
              <Plus className="h-4 w-4 mr-2" />Nova Venda
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[250px]">
            <Search className="h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Buscar por número da venda..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchTerm("")}
              >
                Limpar
              </Button>
            )}
          </div>

          <AdvancedFilters
            filters={filters}
            onFilterChange={setFilter}
            onReset={() => {
              resetFilters();
              setSearchTerm("");
            }}
            activeCount={activeCount}
            showDateRange
            showStatus
            showValueRange
            showCustomSelect
            dateFromLabel="Data Inicial"
            dateToLabel="Data Final"
            valueMinLabel="Valor Mínimo"
            valueMaxLabel="Valor Máximo"
            statusOptions={[
              { label: "Pago", value: "PAGO" },
              { label: "Pendente", value: "PENDENTE" },
              { label: "Cancelado", value: "CANCELADO" },
            ]}
            customSelectLabel="Cliente"
            customSelectKey="clienteId"
            customSelectPlaceholder="Todos os clientes"
            customSelectOptions={
              (clientes || []).map((cliente) => ({
                label: cliente.nome,
                value: cliente.id,
              }))
            }
          />
        </div>

        {/* Estatísticas de Vendas */}
        {statistics && (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total de Vendas</CardDescription>
                <CardTitle className="text-2xl">{statistics.totalVendas}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Vendas cadastradas no sistema
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Valor Total</CardDescription>
                <CardTitle className="text-2xl">{formatCurrency(statistics.totalValor)}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Soma de todas as vendas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Ticket Médio</CardDescription>
                <CardTitle className="text-2xl">{formatCurrency(statistics.ticketMedio)}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Valor médio por venda
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Taxa de Conversão</CardDescription>
                <CardTitle className="text-2xl">{statistics.taxaConversao.toFixed(1)}%</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Vendas pagas / Total de vendas
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="bg-card rounded-lg border">
          <div className="overflow-x-auto">
          {isLoading ? (
            <LoadingState message="Carregando vendas..." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Número</TableHead>
                  <TableHead className="whitespace-nowrap">Cliente</TableHead>
                  <TableHead className="whitespace-nowrap hidden sm:table-cell">Data</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Total</TableHead>
                  <TableHead className="whitespace-nowrap text-right hidden md:table-cell">Pago</TableHead>
                  <TableHead className="whitespace-nowrap text-right hidden lg:table-cell">Saldo</TableHead>
                  <TableHead className="whitespace-nowrap hidden sm:table-cell">Status</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!vendas || vendas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      {activeCount > 0 || searchTerm
                        ? "Nenhuma venda encontrada com os filtros aplicados"
                        : "Nenhuma venda cadastrada"}
                    </TableCell>
                  </TableRow>
                ) : (
                vendas.map((venda) => (
                  <TableRow
                    key={venda.id}
                    onMouseEnter={() => handleVendaHover(venda.id)}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <TableCell className="font-medium">{venda.numero_venda}</TableCell>
                    <TableCell>{venda.clientes?.nome || "-"}</TableCell>
                    <TableCell className="hidden sm:table-cell">{formatDate(venda.data_venda)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(venda.valor_total)}</TableCell>
                    <TableCell className="text-right hidden md:table-cell">{formatCurrency(venda.valor_pago)}</TableCell>
                    <TableCell className="text-right hidden lg:table-cell">
                      <span className={venda.saldo_devedor > 0 ? "text-destructive font-semibold" : "text-success"}>
                        {formatCurrency(venda.saldo_devedor)}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{getStatusBadge(venda.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/vendas/${venda.id}`)}
                          title="Ver detalhes"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setVendaToDelete(venda);
                          }}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Excluir venda"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
          </div>

          {/* Controles de paginação */}
          {!isLoading && vendas.length > 0 && (
            <div className="px-6 pb-4">
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={goToPage}
                hasNextPage={currentPage < totalPages}
                hasPreviousPage={currentPage > 1}
                totalItems={totalItems}
                pageSize={PAGE_SIZE}
              />
            </div>
          )}
        </div>

        {/* Dialog de confirmação de exclusão */}
        <AlertDialog open={!!vendaToDelete} onOpenChange={(open) => !open && setVendaToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir a venda <strong>{vendaToDelete?.numero_venda}</strong>?
                <br />
                <br />
                Esta ação é <strong>irreversível</strong> e irá excluir permanentemente a venda e todos os seus itens do banco de dados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteVendaMutation.isPending}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                disabled={deleteVendaMutation.isPending}
                className="bg-destructive hover:bg-destructive/90"
              >
                {deleteVendaMutation.isPending ? "Excluindo..." : "Sim, excluir venda"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
  );
}
