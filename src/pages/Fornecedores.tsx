import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import { LoadingState, LoadingSpinner } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { useToast } from "@/hooks/use-toast";
import { useFornecedores, useCreateFornecedor, useUpdateFornecedor, useDeleteFornecedor } from "@/hooks/api/useFornecedores";
import { Plus, Edit, Trash2 } from "lucide-react";
import { fornecedorSchema, sanitizeFormData, prepareForDatabase, formatCNPJ, formatTelefone } from "@/lib/validations";

interface Fornecedor {
  id: string;
  nome: string;
  cnpj: string;
  telefone: string;
  email: string;
  site: string;
  observacoes: string;
}

export default function Fornecedores() {
  const { toast } = useToast();

  // React Query hooks
  const { data: fornecedores, isLoading, error, refetch } = useFornecedores();
  const createMutation = useCreateFornecedor();
  const updateMutation = useUpdateFornecedor();
  const deleteMutation = useDeleteFornecedor();

  // Local state (UI apenas)
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fornecedorToDelete, setFornecedorToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nome: "", cnpj: "", telefone: "", email: "", site: "", observacoes: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const sanitized = sanitizeFormData(formData);
    const validation = fornecedorSchema.safeParse(sanitized);

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
        toast({ title: "Fornecedor atualizado com sucesso!" });
      } else {
        await createMutation.mutateAsync(dataToSave);
        toast({ title: "Fornecedor cadastrado com sucesso!" });
      }
      setOpen(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar fornecedor",
        description: error.message || "Tente novamente",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (fornecedor: Fornecedor) => {
    setFormData({
      nome: fornecedor.nome || "",
      cnpj: fornecedor.cnpj || "",
      telefone: fornecedor.telefone || "",
      email: fornecedor.email || "",
      site: fornecedor.site || "",
      observacoes: fornecedor.observacoes || "",
    });
    setEditingId(fornecedor.id);
    setErrors({});
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    setFornecedorToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!fornecedorToDelete) return;

    try {
      await deleteMutation.mutateAsync(fornecedorToDelete);
      toast({ title: "Fornecedor excluído com sucesso!" });
    } catch (error: any) {
      toast({
        title: "Erro ao excluir fornecedor",
        description: error.message || "Tente novamente",
        variant: "destructive"
      });
    } finally {
      setDeleteDialogOpen(false);
      setFornecedorToDelete(null);
    }
  };

  const resetForm = () => {
    setFormData({ nome: "", cnpj: "", telefone: "", email: "", site: "", observacoes: "" });
    setEditingId(null);
    setErrors({});
  };

  const isMutating = createMutation.isLoading || updateMutation.isLoading;

  // Estado: Error
  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl sm:text-3xl font-bold">Fornecedores</h2>
        <ErrorState error={error} retry={refetch} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl sm:text-3xl font-bold">Fornecedores</h2>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Novo Fornecedor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm sm:max-w-2xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Fornecedor" : "Novo Fornecedor"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="col-span-1 sm:col-span-2">
                  <FormField label="Nome" error={errors.nome} required htmlFor="nome">
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) => setFormData({...formData, nome: e.target.value})}
                      maxLength={100}
                    />
                  </FormField>
                </div>

                <FormField label="CNPJ" error={errors.cnpj} htmlFor="cnpj">
                  <Input
                    id="cnpj"
                    value={formData.cnpj}
                    onChange={(e) => setFormData({...formData, cnpj: formatCNPJ(e.target.value)})}
                    placeholder="00.000.000/0000-00"
                    maxLength={18}
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

                <FormField label="E-mail" error={errors.email} htmlFor="email">
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    maxLength={255}
                  />
                </FormField>

                <FormField label="Site" error={errors.site} htmlFor="site">
                  <Input
                    id="site"
                    value={formData.site}
                    onChange={(e) => setFormData({...formData, site: e.target.value})}
                    placeholder="https://exemplo.com"
                    maxLength={255}
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

      <div className="bg-card rounded-lg border">
        <div className="overflow-x-auto">
          {isLoading ? (
            <LoadingState message="Carregando fornecedores..." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Nome</TableHead>
                  <TableHead className="whitespace-nowrap hidden sm:table-cell">CNPJ</TableHead>
                  <TableHead className="whitespace-nowrap hidden md:table-cell">Telefone</TableHead>
                  <TableHead className="whitespace-nowrap hidden lg:table-cell">E-mail</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!fornecedores || fornecedores.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhum fornecedor cadastrado
                    </TableCell>
                  </TableRow>
                ) : (
                  fornecedores.map((fornecedor) => (
                    <TableRow key={fornecedor.id}>
                      <TableCell className="font-medium">{fornecedor.nome}</TableCell>
                      <TableCell className="hidden sm:table-cell">{fornecedor.cnpj || "-"}</TableCell>
                      <TableCell className="hidden md:table-cell">{fornecedor.telefone || "-"}</TableCell>
                      <TableCell className="hidden lg:table-cell">{fornecedor.email || "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(fornecedor)}
                          disabled={deleteMutation.isLoading}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(fornecedor.id)}
                          disabled={deleteMutation.isLoading}
                        >
                          {deleteMutation.isLoading && fornecedorToDelete === fornecedor.id ? (
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
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O fornecedor será permanentemente excluído do banco de dados.
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
