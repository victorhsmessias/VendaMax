import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField } from "@/components/ui/form-field";
import { LoadingState, LoadingSpinner } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { ExportButton } from "@/components/ExportButton";
import { useToast } from "@/hooks/use-toast";
import { useProdutosPaginated, useCreateProduto, useUpdateProduto, useDeleteProduto } from "@/hooks/api/useProdutos";
import { useFornecedores } from "@/hooks/api/useFornecedores";
import { usePagination } from "@/hooks/usePagination";
import { useDebounce } from "@/hooks/useDebounce";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import { produtoSchema, sanitizeFormData, prepareForDatabase } from "@/lib/validations";
import { formatCurrency } from "@/lib/utils/currency";
import { formatCurrencyForExport } from "@/lib/utils/export";

interface Produto {
  id: string;
  nome: string;
  codigo: string;
  descricao: string;
  preco_compra: number;
  preco_venda: number;
  margem_lucro: number;
  fornecedor_id: string;
  quantidade_estoque: number;
  estoque_minimo: number;
  fornecedores?: { nome: string };
}

export default function Produtos() {
  const { toast } = useToast();

  // Busca com debouncing
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);

  // Paginação
  const PAGE_SIZE = 10;
  const { currentPage, goToPage } = usePagination(0, PAGE_SIZE);

  // React Query hooks com paginação e busca
  const { data: produtosData, isLoading, error, refetch } = useProdutosPaginated(currentPage, PAGE_SIZE, debouncedSearch);
  const { data: fornecedores, isLoading: fornecedoresLoading } = useFornecedores();
  const createMutation = useCreateProduto();
  const updateMutation = useUpdateProduto();
  const deleteMutation = useDeleteProduto();

  const produtos = produtosData?.data || [];
  const totalPages = produtosData?.totalPages || 0;
  const totalItems = produtosData?.totalItems || 0;

  // Resetar para página 1 quando a busca mudar
  useEffect(() => {
    goToPage(1);
  }, [debouncedSearch]);

  // Local state (UI apenas)
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [produtoToDelete, setProdutoToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nome: "", codigo: "", descricao: "", preco_compra: "", preco_venda: "", fornecedor_id: "",
    quantidade_estoque: "", estoque_minimo: "10"
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const precoCompra = parseFloat(formData.preco_compra) || 0;
    const precoVenda = parseFloat(formData.preco_venda) || 0;
    const quantidadeEstoque = parseInt(formData.quantidade_estoque) || 0;
    const estoqueMinimo = parseInt(formData.estoque_minimo) || 10;

    const dataToValidate = {
      nome: formData.nome,
      codigo: formData.codigo,
      descricao: formData.descricao,
      preco_compra: precoCompra,
      preco_venda: precoVenda,
      fornecedor_id: formData.fornecedor_id || undefined,
      quantidade_estoque: quantidadeEstoque,
      estoque_minimo: estoqueMinimo,
    };

    const validation = produtoSchema.safeParse(dataToValidate);

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

    if (precoVenda < precoCompra) {
      toast({
        title: "Erro",
        description: "Preço de venda não pode ser menor que preço de compra",
        variant: "destructive"
      });
      return;
    }

    try {
      const sanitized = sanitizeFormData({
        nome: formData.nome,
        codigo: formData.codigo,
        descricao: formData.descricao,
      });

      const dataToSave = prepareForDatabase({
        ...sanitized,
        preco_compra: precoCompra,
        preco_venda: precoVenda,
        fornecedor_id: formData.fornecedor_id || null,
        quantidade_estoque: quantidadeEstoque,
        estoque_minimo: estoqueMinimo,
      });

      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, ...dataToSave });
        toast({ title: "Produto atualizado com sucesso!" });
      } else {
        await createMutation.mutateAsync(dataToSave);
        toast({ title: "Produto cadastrado com sucesso!" });
      }
      setOpen(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar produto",
        description: error.message || "Tente novamente",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (produto: Produto) => {
    setFormData({
      nome: produto.nome || "",
      codigo: produto.codigo || "",
      descricao: produto.descricao || "",
      preco_compra: produto.preco_compra?.toString() || "",
      preco_venda: produto.preco_venda?.toString() || "",
      fornecedor_id: produto.fornecedor_id || "",
      quantidade_estoque: produto.quantidade_estoque?.toString() || "0",
      estoque_minimo: produto.estoque_minimo?.toString() || "10",
    });
    setEditingId(produto.id);
    setErrors({});
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    setProdutoToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!produtoToDelete) return;

    try {
      await deleteMutation.mutateAsync(produtoToDelete);
      toast({ title: "Produto excluído com sucesso!" });
    } catch (error: any) {
      toast({
        title: "Erro ao excluir produto",
        description: error.message || "Tente novamente",
        variant: "destructive"
      });
    } finally {
      setDeleteDialogOpen(false);
      setProdutoToDelete(null);
    }
  };

  const resetForm = () => {
    setFormData({
      nome: "", codigo: "", descricao: "", preco_compra: "", preco_venda: "", fornecedor_id: "",
      quantidade_estoque: "", estoque_minimo: "10"
    });
    setEditingId(null);
    setErrors({});
  };

  const isMutating = createMutation.isLoading || updateMutation.isLoading;

  // Estado: Error
  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl sm:text-3xl font-bold">Produtos</h2>
        <ErrorState error={error} retry={refetch} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl sm:text-3xl font-bold">Produtos</h2>
        <div className="flex gap-2 w-full sm:w-auto">
          <ExportButton
            data={produtos}
            config={{
              filename: "produtos",
              columns: {
                codigo: "Código",
                nome: "Nome",
                descricao: "Descrição",
                preco_compra: "Preço de Compra",
                preco_venda: "Preço de Venda",
                margem_lucro: "Margem de Lucro (%)",
                fornecedores: "Fornecedor",
              },
              formatters: {
                preco_compra: formatCurrencyForExport,
                preco_venda: formatCurrencyForExport,
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
                Novo Produto
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-sm sm:max-w-2xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Produto" : "Novo Produto"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="col-span-1 sm:col-span-2">
                  <FormField label="Nome" error={errors.nome} required htmlFor="nome">
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) => setFormData({...formData, nome: e.target.value})}
                      maxLength={150}
                    />
                  </FormField>
                </div>

                <FormField label="Código" htmlFor="codigo">
                  <Input
                    id="codigo"
                    value={formData.codigo}
                    onChange={(e) => setFormData({...formData, codigo: e.target.value})}
                    maxLength={50}
                  />
                </FormField>

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

                <FormField label="Preço de Compra" error={errors.preco_compra} required htmlFor="preco_compra">
                  <Input
                    id="preco_compra"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="999999.99"
                    value={formData.preco_compra}
                    onChange={(e) => setFormData({...formData, preco_compra: e.target.value})}
                  />
                </FormField>

                <FormField label="Preço de Venda" error={errors.preco_venda} required htmlFor="preco_venda">
                  <Input
                    id="preco_venda"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="999999.99"
                    value={formData.preco_venda}
                    onChange={(e) => setFormData({...formData, preco_venda: e.target.value})}
                  />
                </FormField>

                <FormField label="Quantidade em Estoque" error={errors.quantidade_estoque} required htmlFor="quantidade_estoque">
                  <Input
                    id="quantidade_estoque"
                    type="number"
                    min="0"
                    max="999999"
                    value={formData.quantidade_estoque}
                    onChange={(e) => setFormData({...formData, quantidade_estoque: e.target.value})}
                  />
                </FormField>

                <FormField label="Estoque Mínimo (Alerta)" error={errors.estoque_minimo} required htmlFor="estoque_minimo">
                  <Input
                    id="estoque_minimo"
                    type="number"
                    min="0"
                    max="999999"
                    value={formData.estoque_minimo}
                    onChange={(e) => setFormData({...formData, estoque_minimo: e.target.value})}
                  />
                </FormField>

                <div className="col-span-2">
                  <FormField label="Descrição" htmlFor="descricao">
                    <Textarea
                      id="descricao"
                      value={formData.descricao}
                      onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                      maxLength={500}
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

      <div className="flex items-center gap-2">
        <Search className="h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou código..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="bg-card rounded-lg border">
        <div className="overflow-x-auto">
          {isLoading ? (
            <LoadingState message="Carregando produtos..." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Nome</TableHead>
                  <TableHead className="whitespace-nowrap hidden md:table-cell">Fornecedor</TableHead>
                  <TableHead className="whitespace-nowrap text-right hidden xl:table-cell">Preço Compra</TableHead>
                  <TableHead className="whitespace-nowrap text-right hidden sm:table-cell">Preço Venda</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Estoque</TableHead>
                  <TableHead className="whitespace-nowrap text-right hidden lg:table-cell">Margem</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {produtos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      {searchTerm ? "Nenhum produto encontrado para essa busca" : "Nenhum produto cadastrado"}
                    </TableCell>
                  </TableRow>
                ) : (
                  produtos.map((produto) => (
                    <TableRow key={produto.id}>
                      <TableCell className="font-medium">{produto.nome}</TableCell>
                      <TableCell className="hidden md:table-cell">{produto.fornecedores?.nome || "-"}</TableCell>
                      <TableCell className="text-right hidden xl:table-cell">{formatCurrency(produto.preco_compra)}</TableCell>
                      <TableCell className="text-right hidden sm:table-cell">{formatCurrency(produto.preco_venda)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className={
                            produto.quantidade_estoque === 0 ? "text-destructive font-semibold" :
                            produto.quantidade_estoque <= produto.estoque_minimo ? "text-yellow-600 font-semibold" :
                            "text-foreground"
                          }>
                            {produto.quantidade_estoque}
                          </span>
                          {produto.quantidade_estoque === 0 && (
                            <Badge variant="destructive" className="text-xs">Esgotado</Badge>
                          )}
                          {produto.quantidade_estoque > 0 && produto.quantidade_estoque <= produto.estoque_minimo && (
                            <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-600">Baixo</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-success font-semibold hidden lg:table-cell">
                        {produto.margem_lucro?.toFixed(1) || 0}%
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(produto)}
                          disabled={deleteMutation.isLoading}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(produto.id)}
                          disabled={deleteMutation.isLoading}
                        >
                          {deleteMutation.isLoading && produtoToDelete === produto.id ? (
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
          {!isLoading && produtos.length > 0 && (
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
              Esta ação não pode ser desfeita. O produto será permanentemente excluído do banco de dados.
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
