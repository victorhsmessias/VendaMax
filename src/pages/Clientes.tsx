import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import { LoadingState, LoadingSpinner } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { AdvancedFilters } from "@/components/AdvancedFilters";
import { ExportButton } from "@/components/ExportButton";
import { useToast } from "@/hooks/use-toast";
import { useClientes, useClientesPaginated, useCreateCliente, useUpdateCliente, useDeleteCliente } from "@/hooks/api/useClientes";
import { usePagination } from "@/hooks/usePagination";
import { useDebounce } from "@/hooks/useDebounce";
import { useFilters } from "@/hooks/useFilters";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import { clienteSchema, sanitizeFormData, prepareForDatabase, formatCPF, formatTelefone, formatCEP } from "@/lib/validations";

interface Cliente {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  endereco: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  observacoes: string;
}

export default function Clientes() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filtros avançados com persistência
  const { filters, setFilter, resetFilters, activeCount } = useFilters("clientes", {
    search: "",
    cidade: undefined,
    estado: undefined,
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

  // React Query hooks com paginação e filtros
  const { data: clientesData, isLoading, error, refetch } = useClientesPaginated(currentPage, PAGE_SIZE, filters);
  const { data: todosClientes } = useClientes(); // Para obter lista de cidades/estados únicos
  const createMutation = useCreateCliente();
  const updateMutation = useUpdateCliente();
  const deleteMutation = useDeleteCliente();

  const clientes = clientesData?.data || [];
  const totalPages = clientesData?.totalPages || 0;
  const totalItems = clientesData?.totalItems || 0;

  // Extrair cidades e estados únicos dos clientes
  const cidadesUnicas = useMemo(() => {
    if (!todosClientes) return [];
    const cidades = todosClientes
      .map((c) => c.cidade)
      .filter((cidade): cidade is string => !!cidade);
    return Array.from(new Set(cidades)).sort();
  }, [todosClientes]);

  const estadosUnicos = useMemo(() => {
    if (!todosClientes) return [];
    const estados = todosClientes
      .map((c) => c.estado)
      .filter((estado): estado is string => !!estado);
    return Array.from(new Set(estados)).sort();
  }, [todosClientes]);

  // Resetar para página 1 quando os filtros mudarem
  useEffect(() => {
    goToPage(1);
  }, [filters]);

  // Local state (UI apenas)
  const [open, setOpen] = useState(false);

  // Abrir dialog automaticamente se vier do Dashboard
  useEffect(() => {
    if (searchParams.get("novo") === "true") {
      setOpen(true);
      // Limpar o parâmetro da URL
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clienteToDelete, setClienteToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nome: "", cpf: "", telefone: "", email: "", endereco: "",
    bairro: "", cidade: "", estado: "", cep: "", observacoes: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const sanitized = sanitizeFormData(formData);
    const validation = clienteSchema.safeParse(sanitized);

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
      const dataToSave = prepareForDatabase(sanitized);

      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, ...dataToSave });
        toast({ title: "Cliente atualizado com sucesso!" });
      } else {
        await createMutation.mutateAsync(dataToSave);
        toast({ title: "Cliente cadastrado com sucesso!" });
      }
      setOpen(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar cliente",
        description: error.message || "Tente novamente",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (cliente: Cliente) => {
    setFormData({
      nome: cliente.nome || "",
      cpf: cliente.cpf || "",
      telefone: cliente.telefone || "",
      email: cliente.email || "",
      endereco: cliente.endereco || "",
      bairro: cliente.bairro || "",
      cidade: cliente.cidade || "",
      estado: cliente.estado || "",
      cep: cliente.cep || "",
      observacoes: cliente.observacoes || "",
    });
    setEditingId(cliente.id);
    setErrors({});
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    setClienteToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!clienteToDelete) return;

    try {
      await deleteMutation.mutateAsync(clienteToDelete);
      toast({ title: "Cliente excluído com sucesso!" });
    } catch (error: any) {
      toast({
        title: "Erro ao excluir cliente",
        description: error.message || "Tente novamente",
        variant: "destructive"
      });
    } finally {
      setDeleteDialogOpen(false);
      setClienteToDelete(null);
    }
  };

  const resetForm = () => {
    setFormData({
      nome: "", cpf: "", telefone: "", email: "", endereco: "",
      bairro: "", cidade: "", estado: "", cep: "", observacoes: ""
    });
    setEditingId(null);
    setErrors({});
  };

  const isMutating = createMutation.isLoading || updateMutation.isLoading;

  // Estado: Error
  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl sm:text-3xl font-bold">Clientes</h2>
        <ErrorState error={error} retry={refetch} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl sm:text-3xl font-bold">Clientes</h2>
        <div className="flex gap-2 w-full sm:w-auto">
          <ExportButton
            data={clientes}
            config={{
              filename: "clientes",
              columns: {
                nome: "Nome",
                cpf: "CPF",
                telefone: "Telefone",
                email: "E-mail",
                endereco: "Endereço",
                bairro: "Bairro",
                cidade: "Cidade",
                estado: "Estado",
                cep: "CEP",
              },
            }}
            variant="outline"
            size="default"
            className="flex-1 sm:flex-none"
          />
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="flex-1 sm:flex-none">
                <Plus className="h-4 w-4 mr-2" />
                Novo Cliente
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <FormField label="Nome" error={errors.nome} required htmlFor="nome">
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) => setFormData({...formData, nome: e.target.value})}
                      maxLength={100}
                    />
                  </FormField>
                </div>

                <FormField label="CPF" error={errors.cpf} htmlFor="cpf">
                  <Input
                    id="cpf"
                    value={formData.cpf}
                    onChange={(e) => setFormData({...formData, cpf: formatCPF(e.target.value)})}
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                </FormField>

                <FormField label="Telefone" error={errors.telefone} htmlFor="telefone">
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) => setFormData({...formData, telefone: formatTelefone(e.target.value)})}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                  />
                </FormField>

                <div className="col-span-2">
                  <FormField label="E-mail" error={errors.email} htmlFor="email">
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      maxLength={255}
                    />
                  </FormField>
                </div>

                <div className="col-span-2">
                  <FormField label="Endereço" htmlFor="endereco">
                    <Input
                      id="endereco"
                      value={formData.endereco}
                      onChange={(e) => setFormData({...formData, endereco: e.target.value})}
                      maxLength={200}
                    />
                  </FormField>
                </div>

                <FormField label="Bairro" htmlFor="bairro">
                  <Input
                    id="bairro"
                    value={formData.bairro}
                    onChange={(e) => setFormData({...formData, bairro: e.target.value})}
                    maxLength={100}
                  />
                </FormField>

                <FormField label="Cidade" htmlFor="cidade">
                  <Input
                    id="cidade"
                    value={formData.cidade}
                    onChange={(e) => setFormData({...formData, cidade: e.target.value})}
                    maxLength={100}
                  />
                </FormField>

                <FormField label="Estado" htmlFor="estado">
                  <Input
                    id="estado"
                    value={formData.estado}
                    onChange={(e) => setFormData({...formData, estado: e.target.value.toUpperCase()})}
                    maxLength={2}
                    placeholder="SP"
                  />
                </FormField>

                <FormField label="CEP" error={errors.cep} htmlFor="cep">
                  <Input
                    id="cep"
                    value={formData.cep}
                    onChange={(e) => setFormData({...formData, cep: formatCEP(e.target.value)})}
                    placeholder="00000-000"
                    maxLength={9}
                  />
                </FormField>

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

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[250px]">
          <Search className="h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
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

        {/* Filtro de Cidade */}
        {cidadesUnicas.length > 0 && (
          <Select
            value={(filters.cidade as string) || ""}
            onValueChange={(value) => setFilter("cidade", value || undefined)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Cidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas as cidades</SelectItem>
              {cidadesUnicas.map((cidade) => (
                <SelectItem key={cidade} value={cidade}>
                  {cidade}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Filtro de Estado */}
        {estadosUnicos.length > 0 && (
          <Select
            value={(filters.estado as string) || ""}
            onValueChange={(value) => setFilter("estado", value || undefined)}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              {estadosUnicos.map((estado) => (
                <SelectItem key={estado} value={estado}>
                  {estado}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Botão limpar filtros */}
        {activeCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              resetFilters();
              setSearchTerm("");
            }}
          >
            Limpar Filtros ({activeCount})
          </Button>
        )}
      </div>

      <div className="bg-card rounded-lg border">
        <div className="overflow-x-auto">
          {isLoading ? (
            <LoadingState message="Carregando clientes..." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Nome</TableHead>
                  <TableHead className="whitespace-nowrap hidden sm:table-cell">CPF</TableHead>
                  <TableHead className="whitespace-nowrap hidden md:table-cell">Telefone</TableHead>
                  <TableHead className="whitespace-nowrap hidden lg:table-cell">Cidade</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      {activeCount > 0 || searchTerm
                        ? "Nenhum cliente encontrado com os filtros aplicados"
                        : "Nenhum cliente cadastrado"}
                    </TableCell>
                  </TableRow>
                ) : (
                  clientes.map((cliente) => (
                    <TableRow key={cliente.id}>
                      <TableCell className="font-medium">{cliente.nome}</TableCell>
                      <TableCell className="hidden sm:table-cell">{cliente.cpf || "-"}</TableCell>
                      <TableCell className="hidden md:table-cell">{cliente.telefone || "-"}</TableCell>
                      <TableCell className="hidden lg:table-cell">{cliente.cidade || "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(cliente)}
                          disabled={deleteMutation.isLoading}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(cliente.id)}
                          disabled={deleteMutation.isLoading}
                        >
                          {deleteMutation.isLoading && clienteToDelete === cliente.id ? (
                            <LoadingSpinner size="sm" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-destructive" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}

          {/* Controles de paginação */}
          {!isLoading && clientes.length > 0 && (
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O cliente será permanentemente excluído do banco de dados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isLoading}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isLoading}
            >
              {deleteMutation.isLoading && <LoadingSpinner className="mr-2" size="sm" />}
              {deleteMutation.isLoading ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
