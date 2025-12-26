import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import { produtoSchema, sanitizeFormData, prepareForDatabase } from "@/lib/validations";

interface Produto {
  id: string;
  nome: string;
  codigo: string;
  descricao: string;
  preco_compra: number;
  preco_venda: number;
  margem_lucro: number;
  fornecedor_id: string;
  fornecedores?: { nome: string };
}

interface Fornecedor {
  id: string;
  nome: string;
}

export default function Produtos() {
  const { toast } = useToast();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    nome: "", codigo: "", descricao: "", preco_compra: "", preco_venda: "", fornecedor_id: ""
  });

  useEffect(() => {
    loadProdutos();
    loadFornecedores();
  }, []);

  const loadProdutos = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const response = await (supabase as any)
        .from("produtos")
        .select("*, fornecedores(nome)")
        .eq("user_id", user.id)
        .eq("ativo", true)
        .order("nome");

      setProdutos(response?.data || []);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const loadFornecedores = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const response = await (supabase as any)
        .from("fornecedores")
        .select("id, nome")
        .eq("user_id", user.id)
        .eq("ativo", true)
        .order("nome");

      setFornecedores(response?.data || []);
    } catch (error) {
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const precoCompra = parseFloat(formData.preco_compra) || 0;
    const precoVenda = parseFloat(formData.preco_venda) || 0;

    const dataToValidate = {
      nome: formData.nome,
      codigo: formData.codigo,
      descricao: formData.descricao,
      preco_compra: precoCompra,
      preco_venda: precoVenda,
      fornecedor_id: formData.fornecedor_id || undefined,
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
      toast({ title: "Erro", description: "Preço de venda não pode ser menor que preço de compra", variant: "destructive" });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Sessão expirada", description: "Faça login novamente", variant: "destructive" });
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
      });

      if (editingId) {
        await (supabase as any).from("produtos").update(dataToSave).eq("id", editingId).eq("user_id", user.id);
        toast({ title: "Produto atualizado com sucesso!" });
      } else {
        await (supabase as any).from("produtos").insert({ ...dataToSave, user_id: user.id });
        toast({ title: "Produto cadastrado com sucesso!" });
      }
      setOpen(false);
      resetForm();
      loadProdutos();
    } catch (error: any) {
      toast({ title: "Erro ao salvar produto", description: "Tente novamente", variant: "destructive" });
    }
  };

  const handleEdit = (produto: Produto) => {
    setFormData({
      nome: produto.nome,
      codigo: produto.codigo || "",
      descricao: produto.descricao || "",
      preco_compra: produto.preco_compra.toString(),
      preco_venda: produto.preco_venda.toString(),
      fornecedor_id: produto.fornecedor_id || "",
    });
    setEditingId(produto.id);
    setErrors({});
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este produto?")) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      await (supabase as any).from("produtos").update({ ativo: false }).eq("id", id).eq("user_id", user.id);
      toast({ title: "Produto excluído com sucesso!" });
      loadProdutos();
    } catch (error: any) {
      toast({ title: "Erro ao excluir produto", description: "Tente novamente", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setFormData({ nome: "", codigo: "", descricao: "", preco_compra: "", preco_venda: "", fornecedor_id: "" });
    setEditingId(null);
    setErrors({});
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const filteredProdutos = produtos.filter(p => 
    p.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-2xl sm:text-3xl font-bold">Produtos</h2>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-2" />Novo Produto</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar Produto" : "Novo Produto"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="nome">Nome *</Label>
                    <Input 
                      id="nome" 
                      value={formData.nome} 
                      onChange={(e) => setFormData({...formData, nome: e.target.value})} 
                      required 
                      maxLength={150}
                      className={errors.nome ? "border-destructive" : ""}
                    />
                    {errors.nome && <p className="text-sm text-destructive mt-1">{errors.nome}</p>}
                  </div>
                  <div>
                    <Label htmlFor="codigo">Código</Label>
                    <Input 
                      id="codigo" 
                      value={formData.codigo} 
                      onChange={(e) => setFormData({...formData, codigo: e.target.value})} 
                      maxLength={50}
                    />
                  </div>
                  <div>
                    <Label htmlFor="fornecedor">Fornecedor</Label>
                    <Select value={formData.fornecedor_id} onValueChange={(v) => setFormData({...formData, fornecedor_id: v})}>
                      <SelectTrigger className={errors.fornecedor_id ? "border-destructive" : ""}>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {fornecedores.map(f => (
                          <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.fornecedor_id && <p className="text-sm text-destructive mt-1">{errors.fornecedor_id}</p>}
                  </div>
                  <div>
                    <Label htmlFor="preco_compra">Preço de Compra *</Label>
                    <Input 
                      id="preco_compra" 
                      type="number" 
                      step="0.01" 
                      min="0.01" 
                      max="999999.99"
                      value={formData.preco_compra} 
                      onChange={(e) => setFormData({...formData, preco_compra: e.target.value})} 
                      required 
                      className={errors.preco_compra ? "border-destructive" : ""}
                    />
                    {errors.preco_compra && <p className="text-sm text-destructive mt-1">{errors.preco_compra}</p>}
                  </div>
                  <div>
                    <Label htmlFor="preco_venda">Preço de Venda *</Label>
                    <Input 
                      id="preco_venda" 
                      type="number" 
                      step="0.01" 
                      min="0.01"
                      max="999999.99" 
                      value={formData.preco_venda} 
                      onChange={(e) => setFormData({...formData, preco_venda: e.target.value})} 
                      required 
                      className={errors.preco_venda ? "border-destructive" : ""}
                    />
                    {errors.preco_venda && <p className="text-sm text-destructive mt-1">{errors.preco_venda}</p>}
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="descricao">Descrição</Label>
                    <Textarea 
                      id="descricao" 
                      value={formData.descricao} 
                      onChange={(e) => setFormData({...formData, descricao: e.target.value})} 
                      maxLength={500}
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button type="submit">Salvar</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-muted-foreground" />
          <Input placeholder="Buscar por nome..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="max-w-sm" />
        </div>

        <div className="bg-card rounded-lg border">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Nome</TableHead>
                <TableHead className="whitespace-nowrap hidden md:table-cell">Fornecedor</TableHead>
                <TableHead className="whitespace-nowrap text-right hidden sm:table-cell">Preço Compra</TableHead>
                <TableHead className="whitespace-nowrap text-right">Preço Venda</TableHead>
                <TableHead className="whitespace-nowrap text-right hidden lg:table-cell">Margem</TableHead>
                <TableHead className="whitespace-nowrap text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center">Carregando...</TableCell></TableRow>
              ) : filteredProdutos.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nenhum produto encontrado</TableCell></TableRow>
              ) : (
                filteredProdutos.map((produto) => (
                  <TableRow key={produto.id}>
                    <TableCell className="font-medium">{produto.nome}</TableCell>
                    <TableCell className="hidden md:table-cell">{produto.fornecedores?.nome || "-"}</TableCell>
                    <TableCell className="text-right hidden sm:table-cell">{formatCurrency(produto.preco_compra)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(produto.preco_venda)}</TableCell>
                    <TableCell className="text-right text-success font-semibold hidden lg:table-cell">{produto.margem_lucro?.toFixed(1) || 0}%</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(produto)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(produto.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
