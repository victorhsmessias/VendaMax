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
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    nome: "", cpf: "", telefone: "", email: "", endereco: "",
    bairro: "", cidade: "", estado: "", cep: "", observacoes: ""
  });

  useEffect(() => {
    loadClientes();
  }, []);

  const loadClientes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const response = await (supabase as any)
        .from("clientes")
        .select("*")
        .eq("user_id", user.id)
        .eq("ativo", true)
        .order("nome");

      setClientes(response?.data || []);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Sessão expirada", description: "Faça login novamente", variant: "destructive" });
      return;
    }

    try {
      const dataToSave = prepareForDatabase(sanitized);

      if (editingId) {
        await (supabase as any).from("clientes").update(dataToSave).eq("id", editingId).eq("user_id", user.id);
        toast({ title: "Cliente atualizado com sucesso!" });
      } else {
        await (supabase as any).from("clientes").insert({ ...dataToSave, user_id: user.id });
        toast({ title: "Cliente cadastrado com sucesso!" });
      }
      setOpen(false);
      resetForm();
      loadClientes();
    } catch (error: any) {
      toast({ title: "Erro ao salvar cliente", description: "Tente novamente", variant: "destructive" });
    }
  };

  const handleEdit = (cliente: Cliente) => {
    setFormData(cliente);
    setEditingId(cliente.id);
    setErrors({});
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este cliente?")) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      await (supabase as any).from("clientes").update({ ativo: false }).eq("id", id).eq("user_id", user.id);
      toast({ title: "Cliente excluído com sucesso!" });
      loadClientes();
    } catch (error: any) {
      toast({ title: "Erro ao excluir cliente", description: "Tente novamente", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setFormData({ nome: "", cpf: "", telefone: "", email: "", endereco: "", bairro: "", cidade: "", estado: "", cep: "", observacoes: "" });
    setEditingId(null);
    setErrors({});
  };

  const filteredClientes = clientes.filter(c => 
    c.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-2xl sm:text-3xl font-bold">Clientes</h2>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-2" />Novo Cliente</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
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
                    <Label htmlFor="cpf">CPF</Label>
                    <Input 
                      id="cpf" 
                      value={formData.cpf} 
                      onChange={(e) => setFormData({...formData, cpf: formatCPF(e.target.value)})} 
                      placeholder="000.000.000-00"
                      maxLength={14}
                      className={errors.cpf ? "border-destructive" : ""}
                    />
                    {errors.cpf && <p className="text-sm text-destructive mt-1">{errors.cpf}</p>}
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
                  <div className="col-span-2">
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
                  <div className="col-span-2">
                    <Label htmlFor="endereco">Endereço</Label>
                    <Input 
                      id="endereco" 
                      value={formData.endereco} 
                      onChange={(e) => setFormData({...formData, endereco: e.target.value})} 
                      maxLength={200}
                    />
                  </div>
                  <div>
                    <Label htmlFor="bairro">Bairro</Label>
                    <Input 
                      id="bairro" 
                      value={formData.bairro} 
                      onChange={(e) => setFormData({...formData, bairro: e.target.value})} 
                      maxLength={100}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cidade">Cidade</Label>
                    <Input 
                      id="cidade" 
                      value={formData.cidade} 
                      onChange={(e) => setFormData({...formData, cidade: e.target.value})} 
                      maxLength={100}
                    />
                  </div>
                  <div>
                    <Label htmlFor="estado">Estado</Label>
                    <Input 
                      id="estado" 
                      value={formData.estado} 
                      onChange={(e) => setFormData({...formData, estado: e.target.value.toUpperCase()})} 
                      maxLength={2}
                      placeholder="SP"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cep">CEP</Label>
                    <Input 
                      id="cep" 
                      value={formData.cep} 
                      onChange={(e) => setFormData({...formData, cep: formatCEP(e.target.value)})} 
                      placeholder="00000-000"
                      maxLength={9}
                      className={errors.cep ? "border-destructive" : ""}
                    />
                    {errors.cep && <p className="text-sm text-destructive mt-1">{errors.cep}</p>}
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
                <TableHead className="whitespace-nowrap hidden sm:table-cell">CPF</TableHead>
                <TableHead className="whitespace-nowrap hidden md:table-cell">Telefone</TableHead>
                <TableHead className="whitespace-nowrap hidden lg:table-cell">Cidade</TableHead>
                <TableHead className="whitespace-nowrap text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center">Carregando...</TableCell></TableRow>
              ) : filteredClientes.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum cliente encontrado</TableCell></TableRow>
              ) : (
                filteredClientes.map((cliente) => (
                  <TableRow key={cliente.id}>
                    <TableCell className="font-medium">{cliente.nome}</TableCell>
                    <TableCell className="hidden sm:table-cell">{cliente.cpf || "-"}</TableCell>
                    <TableCell className="hidden md:table-cell">{cliente.telefone || "-"}</TableCell>
                    <TableCell className="hidden lg:table-cell">{cliente.cidade || "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(cliente)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(cliente.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
