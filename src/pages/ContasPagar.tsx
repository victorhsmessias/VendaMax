import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField } from "@/components/ui/form-field";
import { Label } from "@/components/ui/label";
import { LoadingState, LoadingSpinner } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { AdvancedFilters } from "@/components/AdvancedFilters";
import { ExportButton } from "@/components/ExportButton";
import { useToast } from "@/hooks/use-toast";
import { useContasPagarPaginated, useCreateContaPagar, useCreateContaParcelada, useRegistrarPagamento } from "@/hooks/api/useContasPagar";
import { useFornecedores } from "@/hooks/api/useFornecedores";
import { usePagination } from "@/hooks/usePagination";
import { useDebounce } from "@/hooks/useDebounce";
import { useFilters } from "@/hooks/useFilters";
import { Plus, DollarSign, Search, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { contaPagarSchema, sanitizeFormData, prepareForDatabase } from "@/lib/validations";
import { formatCurrency, formatDate } from "@/lib/utils/currency";
import { formatCurrencyForExport, formatDateForExport } from "@/lib/utils/export";
import { ContasPorMesView } from "@/components/ContasPorMesView";

interface ContaPagar {
  id: string;
  descricao: string;
  valor: number;
  valor_pago: number;
  saldo_devedor: number;
  data_vencimento: string;
  status: string;
  fornecedores?: { nome: string };
  fornecedor_id: string;
  parcela_numero?: number | null;
  parcela_total?: number | null;
  conta_pai_id?: string | null;
}

export default function ContasPagar() {
  const { toast } = useToast();

  // Filtros avançados com persistência
  const { filters, setFilter, resetFilters, activeCount } = useFilters("contas_pagar", {
    search: "",
    dateFrom: undefined,
    dateTo: undefined,
    status: [],
    fornecedorId: undefined,
  });

  // Busca com debouncing (sincronizada com filters.search)
  const [searchTerm, setSearchTerm] = useState(filters.search || "");
  const debouncedSearch = useDebounce(searchTerm);
  const isInitialMountRef = useRef(true);

  // Sincronizar searchTerm com filters.search quando debounced
  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      setFilter("search", debouncedSearch);
    }
  }, [debouncedSearch, setFilter]);

  // Sincronizar searchTerm com filters.search apenas no mount inicial (Safari-safe)
  // Isso garante que ao carregar do localStorage, o campo de busca seja preenchido
  useEffect(() => {
    if (isInitialMountRef.current && filters.search && filters.search !== searchTerm) {
      setSearchTerm(filters.search);
      isInitialMountRef.current = false;
    }
  }, [filters.search]);

  // Paginação
  const PAGE_SIZE = 10;
  const { currentPage, goToPage } = usePagination(1, PAGE_SIZE);

  // React Query hooks com paginação e filtros
  const { data: contasData, isLoading, error, refetch } = useContasPagarPaginated(currentPage, PAGE_SIZE, filters);
  const { data: fornecedores, isLoading: fornecedoresLoading } = useFornecedores();
  const createMutation = useCreateContaPagar();
  const createParceladaMutation = useCreateContaParcelada();
  const pagamentoMutation = useRegistrarPagamento();

  const contas = contasData?.data || [];
  const totalPages = contasData?.totalPages || 0;
  const totalItems = contasData?.totalItems || 0;

  // Resetar para página 1 quando os filtros mudarem
  useEffect(() => {
    goToPage(1);
  }, [filters]);

  // Local state (UI apenas)
  const [open, setOpen] = useState(false);
  const [openPagamento, setOpenPagamento] = useState(false);
  const [openResumoMensal, setOpenResumoMensal] = useState(false);
  const [selectedConta, setSelectedConta] = useState<ContaPagar | null>(null);
  const [valorPagamento, setValorPagamento] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [modoParcelado, setModoParcelado] = useState(false);
  const [parcelas, setParcelas] = useState("1");
  const [formData, setFormData] = useState({
    fornecedor_id: "", descricao: "", valor: "", data_vencimento: "", observacoes: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const valor = parseFloat(formData.valor) || 0;

    const dataToValidate = {
      descricao: formData.descricao,
      valor,
      data_vencimento: formData.data_vencimento,
      fornecedor_id: formData.fornecedor_id || null,
      observacoes: formData.observacoes,
    };

    const validation = contaPagarSchema.safeParse(dataToValidate);

    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      toast({
        title: "Erro de validação",
        description: "Verifique os campos destacados",
        variant: "destructive",
      });
      return;
    }

    try {
      const sanitized = sanitizeFormData({
        descricao: formData.descricao,
        observacoes: formData.observacoes,
      });

      if (modoParcelado) {
        // Criar conta parcelada
        await createParceladaMutation.mutateAsync({
          fornecedor_id: formData.fornecedor_id || null,
          descricao: sanitized.descricao,
          valor_total: valor,
          data_primeira_parcela: formData.data_vencimento,
          parcelas: parseInt(parcelas),
          observacoes: sanitized.observacoes || null,
        });
        toast({
          title: "Conta parcelada criada com sucesso!",
          description: `${parcelas} parcelas de ${formatCurrency(valor / parseInt(parcelas))}`
        });
      } else {
        // Criar conta simples
        const dataToSave = prepareForDatabase({
          ...sanitized,
          fornecedor_id: formData.fornecedor_id || null,
          valor,
          data_vencimento: formData.data_vencimento || null,
        });

        await createMutation.mutateAsync(dataToSave);
        toast({ title: "Conta cadastrada com sucesso!" });
      }

      setOpen(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar conta",
        description: error.message || "Tente novamente",
        variant: "destructive"
      });
    }
  };

  const handlePagamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConta) return;

    const valor = parseFloat(valorPagamento);

    if (isNaN(valor) || valor <= 0) {
      toast({ title: "Erro", description: "Valor inválido", variant: "destructive" });
      return;
    }

    if (valor > selectedConta.saldo_devedor) {
      toast({ title: "Erro", description: "Valor maior que o saldo devedor", variant: "destructive" });
      return;
    }

    try {
      await pagamentoMutation.mutateAsync({
        contaId: selectedConta.id,
        valorPagamento: valor,
      });
      toast({ title: "Pagamento registrado com sucesso!" });
      setOpenPagamento(false);
      setSelectedConta(null);
      setValorPagamento("");
    } catch (error: any) {
      toast({
        title: "Erro ao registrar pagamento",
        description: error.message || "Tente novamente",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({ fornecedor_id: "", descricao: "", valor: "", data_vencimento: "", observacoes: "" });
    setErrors({});
    setModoParcelado(false);
    setParcelas("1");
  };

  const getStatusBadge = (status: string) => {
    return status === "PAGO" ? (
      <Badge variant="default">PAGO</Badge>
    ) : (
      <Badge variant="outline">PENDENTE</Badge>
    );
  };

  const isMutating = createMutation.isLoading || createParceladaMutation.isLoading || pagamentoMutation.isLoading;

  // Estado: Error
  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl sm:text-3xl font-bold">Contas a Pagar</h2>
        <ErrorState error={error} retry={refetch} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-2xl sm:text-3xl font-bold">Contas a Pagar</h2>
          <div className="flex gap-2 w-full sm:w-auto flex-wrap">
            <Button
              variant="secondary"
              onClick={() => setOpenResumoMensal(true)}
              className="flex-1 sm:flex-none"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Resumo Mensal
            </Button>
            <ExportButton
              data={contas}
              config={{
                filename: "contas_pagar",
                columns: {
                  fornecedores: "Fornecedor",
                  descricao: "Descrição",
                  valor: "Valor",
                  valor_pago: "Valor Pago",
                  saldo_devedor: "Saldo Devedor",
                  data_vencimento: "Data de Vencimento",
                  status: "Status",
                },
                formatters: {
                  data_vencimento: formatDateForExport,
                  valor: formatCurrencyForExport,
                  valor_pago: formatCurrencyForExport,
                  saldo_devedor: formatCurrencyForExport,
                },
              }}
              variant="outline"
              size="default"
              className="flex-1 sm:flex-none"
            />
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="flex-1 sm:flex-none"><Plus className="h-4 w-4 mr-2" />Nova Conta</Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nova Conta a Pagar</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Toggle modo parcelado */}
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="modo-parcelado" className="text-sm font-medium">
                      Parcelar conta
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {modoParcelado
                        ? "Conta será dividida em múltiplas parcelas"
                        : "Conta será criada como pagamento único"}
                    </p>
                  </div>
                  <Switch
                    id="modo-parcelado"
                    checked={modoParcelado}
                    onCheckedChange={setModoParcelado}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <FormField label="Fornecedor" error={errors.fornecedor_id} htmlFor="fornecedor">
                      <Select
                        value={formData.fornecedor_id}
                        onValueChange={(v) => setFormData({...formData, fornecedor_id: v})}
                        disabled={fornecedoresLoading}
                      >
                        <SelectTrigger id="fornecedor">
                          <SelectValue placeholder={fornecedoresLoading ? "Carregando..." : "Selecione..."} />
                        </SelectTrigger>
                        <SelectContent>
                          {fornecedores?.map(f => (
                            <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>
                  </div>

                  <div className="col-span-2">
                    <FormField label="Descrição" error={errors.descricao} required htmlFor="descricao">
                      <Input
                        id="descricao"
                        value={formData.descricao}
                        onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                        maxLength={200}
                      />
                    </FormField>
                  </div>

                  <FormField
                    label={modoParcelado ? "Valor Total" : "Valor"}
                    error={errors.valor}
                    required
                    htmlFor="valor"
                  >
                    <Input
                      id="valor"
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="9999999.99"
                      value={formData.valor}
                      onChange={(e) => setFormData({...formData, valor: e.target.value})}
                    />
                  </FormField>

                  <FormField
                    label={modoParcelado ? "Data da 1ª Parcela" : "Data de Vencimento"}
                    error={errors.data_vencimento}
                    required
                    htmlFor="data_vencimento"
                  >
                    <Input
                      id="data_vencimento"
                      type="date"
                      value={formData.data_vencimento}
                      onChange={(e) => setFormData({...formData, data_vencimento: e.target.value})}
                    />
                  </FormField>

                  {/* Campo de parcelas (apenas se modo parcelado) */}
                  {modoParcelado && (
                    <div className="col-span-2">
                      <FormField label="Número de Parcelas" required htmlFor="parcelas">
                        <Select value={parcelas} onValueChange={setParcelas}>
                          <SelectTrigger id="parcelas">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => {
                              const valorParcela = parseFloat(formData.valor) / n || 0;
                              return (
                                <SelectItem key={n} value={n.toString()}>
                                  {n}x {valorParcela > 0 ? `de ${formatCurrency(valorParcela)}` : ""}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </FormField>
                    </div>
                  )}

                  <div className="col-span-2">
                    <FormField label="Observações" htmlFor="observacoes">
                      <Textarea
                        id="observacoes"
                        value={formData.observacoes}
                        onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                        maxLength={1000}
                      />
                    </FormField>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                    disabled={isMutating}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isMutating}>
                    {isMutating && <LoadingSpinner className="mr-2" />}
                    {isMutating ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Search className="h-5 w-5 text-muted-foreground shrink-0" />
            <Input
              placeholder="Buscar por descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchTerm("")}
                className="shrink-0"
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
            showCustomSelect
            dateFromLabel="Vencimento Inicial"
            dateToLabel="Vencimento Final"
            statusOptions={[
              { label: "Pago", value: "PAGO" },
              { label: "Pendente", value: "PENDENTE" },
            ]}
            customSelectLabel="Fornecedor"
            customSelectKey="fornecedorId"
            customSelectPlaceholder="Todos os fornecedores"
            customSelectOptions={
              (fornecedores || []).map((fornecedor) => ({
                label: fornecedor.nome,
                value: fornecedor.id,
              }))
            }
          />
        </div>

        <div className="bg-card rounded-lg border">
          <div className="overflow-x-auto">
          {isLoading ? (
            <LoadingState message="Carregando contas a pagar..." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Fornecedor</TableHead>
                  <TableHead className="whitespace-nowrap hidden md:table-cell">Descrição</TableHead>
                  <TableHead className="whitespace-nowrap hidden sm:table-cell">Vencimento</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Valor</TableHead>
                  <TableHead className="whitespace-nowrap text-right hidden lg:table-cell">Pago</TableHead>
                  <TableHead className="whitespace-nowrap text-right hidden xl:table-cell">Saldo</TableHead>
                  <TableHead className="whitespace-nowrap hidden sm:table-cell">Status</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!contas || contas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      {activeCount > 0 || searchTerm
                        ? "Nenhuma conta encontrada com os filtros aplicados"
                        : "Nenhuma conta cadastrada"}
                    </TableCell>
                  </TableRow>
                ) : (
                contas.map((conta) => (
                  <TableRow key={conta.id}>
                    <TableCell className="font-medium">{conta.fornecedores?.nome || "-"}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex flex-col gap-1">
                        <span>{conta.descricao}</span>
                        {conta.parcela_numero && conta.parcela_total && (
                          <Badge variant="secondary" className="w-fit text-xs">
                            Parcela {conta.parcela_numero}/{conta.parcela_total}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{conta.data_vencimento ? formatDate(conta.data_vencimento) : "-"}</TableCell>
                    <TableCell className="text-right">{formatCurrency(conta.valor)}</TableCell>
                    <TableCell className="text-right hidden lg:table-cell">{formatCurrency(conta.valor_pago)}</TableCell>
                    <TableCell className="text-right hidden xl:table-cell">
                      <span className={conta.saldo_devedor > 0 ? "text-destructive font-semibold" : "text-success"}>
                        {formatCurrency(conta.saldo_devedor)}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{getStatusBadge(conta.status)}</TableCell>
                    <TableCell className="text-right">
                      {conta.status === "PENDENTE" && (
                        <Button variant="ghost" size="sm" onClick={() => { setSelectedConta(conta); setValorPagamento(conta.saldo_devedor.toString()); setOpenPagamento(true); }}>
                          <DollarSign className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}

          {/* Controles de paginação */}
          {!isLoading && contas.length > 0 && (
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
        </div>

        <Dialog open={openPagamento} onOpenChange={setOpenPagamento}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Pagamento</DialogTitle>
            </DialogHeader>
            <form onSubmit={handlePagamento} className="space-y-4">
              <div className="space-y-2">
                <Label>Fornecedor</Label>
                <Input value={selectedConta?.fornecedores?.nome || ""} disabled />
              </div>
              <div className="space-y-2">
                <Label>Saldo Devedor</Label>
                <Input value={formatCurrency(selectedConta?.saldo_devedor || 0)} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="valorPagamento">Valor do Pagamento *</Label>
                <Input
                  id="valorPagamento"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={selectedConta?.saldo_devedor}
                  value={valorPagamento}
                  onChange={(e) => setValorPagamento(e.target.value)}
                  required
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpenPagamento(false)}
                  disabled={pagamentoMutation.isLoading}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={pagamentoMutation.isLoading}>
                  {pagamentoMutation.isLoading && <LoadingSpinner className="mr-2" size="sm" />}
                  {pagamentoMutation.isLoading ? "Processando..." : "Confirmar Pagamento"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog Resumo Mensal */}
        <Dialog open={openResumoMensal} onOpenChange={setOpenResumoMensal}>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Resumo Mensal de Contas a Pagar</DialogTitle>
            </DialogHeader>
            <ContasPorMesView />
          </DialogContent>
        </Dialog>
      </div>

  );
}
