import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
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
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    nome: "", cnpj: "", telefone: "", email: "", site: "", observacoes: ""
  });

  useEffect(() => {
    loadFornecedores();
  }, []);

  const loadFornecedores = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const response = await (supabase as any)
        .from("fornecedores")
        .select("*")
        .eq("user_id", user.id)
        .eq("ativo", true)
        .order("nome");

      setFornecedores(response?.data || []);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Sessão expirada", description: "Faça login novamente", variant: "destructive" });
      return;
    }

    try {
      const dataToSave = prepareForDatabase(sanitized);

      if (editingId) {
        await (supabase as any).from("fornecedores").update(dataToSave).eq("id", editingId).eq("user_id", user.id);
        toast({ title: "Fornecedor atualizado com sucesso!" });
      } else {
        await (supabase as any).from("fornecedores").insert({ ...dataToSave, user_id: user.id });
        toast({ title: "Fornecedor cadastrado com sucesso!" });
      }
      setOpen(false);
      resetForm();
      loadFornecedores();
    } catch (error: any) {
      toast({ title: "Erro ao salvar fornecedor", description: "Tente novamente", variant: "destructive" });
    }
  };

  const handleEdit = (fornecedor: Fornecedor) => {
    setFormData(fornecedor);
    setEditingId(fornecedor.id);
    setErrors({});
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este fornecedor?")) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      await (supabase as any).from("fornecedores").update({ ativo: false }).eq("id", id).eq("user_id", user.id);
      toast({ title: "Fornecedor excluído com sucesso!" });
      loadFornecedores();
    } catch (error: any) {
      toast({ title: "Erro ao excluir fornecedor", description: "Tente novamente", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setFormData({ nome: "", cnpj: "", telefone: "", email: "", site: "", observacoes: "" });
    setEditingId(null);
    setErrors({});
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-2xl sm:text-3xl font-bold">Fornecedores</h2>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-2" />Novo Fornecedor</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar Fornecedor" : "Novo Fornecedor"}</DialogTitle>
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
                      maxLength={100}
                      className={errors.nome ? "border-destructive" : ""}
                    />
                    {errors.nome && <p className="text-sm text-destructive mt-1">{errors.nome}</p>}
                  </div>
                  <div>
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input 
                      id="cnpj" 
                      value={formData.cnpj} 
                      onChange={(e) => setFormData({...formData, cnpj: formatCNPJ(e.target.value)})} 
                      placeholder="00.000.000/0000-00"
                      maxLength={18}
                      className={errors.cnpj ? "border-destructive" : ""}
                    />
                    {errors.cnpj && <p className="text-sm text-destructive mt-1">{errors.cnpj}</p>}
                  </div>
                  <div>
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input 
                      id="telefone" 
                      value={formData.telefone} 
                      onChange={(e) => setFormData({...formData, telefone: formatTelefone(e.target.value)})} 
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                      className={errors.telefone ? "border-destructive" : ""}
                    />
                    {errors.telefone && <p className="text-sm text-destructive mt-1">{errors.telefone}</p>}
                  </div>
                  <div>
                    <Label htmlFor="email">E-mail</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      value={formData.email} 
                      onChange={(e) => setFormData({...formData, email: e.target.value})} 
                      maxLength={255}
                      className={errors.email ? "border-destructive" : ""}
                    />
                    {errors.email && <p className="text-sm text-destructive mt-1">{errors.email}</p>}
                  </div>
                  <div>
                    <Label htmlFor="site">Site</Label>
                    <Input
                      id="site"
                      value={formData.site}
                      onChange={(e) => setFormData({...formData, site: e.target.value})}
                      placeholder="https://exemplo.com"
                      maxLength={255}
                      className={errors.site ? "border-destructive" : ""}
                    />
                    {errors.site && <p className="text-sm text-destructive mt-1">{errors.site}</p>}
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="observacoes">Observações</Label>
                    <Textarea 
                      id="observacoes" 
                      value={formData.observacoes} 
                      onChange={(e) => setFormData({...formData, observacoes: e.target.value})} 
                      maxLength={1000}
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

        <div className="bg-card rounded-lg border">
          <div className="overflow-x-auto">
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
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center">Carregando...</TableCell></TableRow>
              ) : fornecedores.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum fornecedor encontrado</TableCell></TableRow>
              ) : (
                fornecedores.map((fornecedor) => (
                  <TableRow key={fornecedor.id}>
                    <TableCell className="font-medium">{fornecedor.nome}</TableCell>
                    <TableCell className="hidden sm:table-cell">{fornecedor.cnpj || "-"}</TableCell>
                    <TableCell className="hidden md:table-cell">{fornecedor.telefone || "-"}</TableCell>
                    <TableCell className="hidden lg:table-cell">{fornecedor.email || "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(fornecedor)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(fornecedor.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
