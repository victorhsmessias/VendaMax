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
import { Plus, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { contaPagarSchema, sanitizeFormData, prepareForDatabase } from "@/lib/validations";

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
}

interface Fornecedor {
  id: string;
  nome: string;
}

export default function ContasPagar() {
  const { toast } = useToast();
  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [openPagamento, setOpenPagamento] = useState(false);
  const [selectedConta, setSelectedConta] = useState<ContaPagar | null>(null);
  const [valorPagamento, setValorPagamento] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    fornecedor_id: "", descricao: "", valor: "", data_vencimento: "", observacoes: ""
  });

  useEffect(() => {
    loadContas();
    loadFornecedores();
  }, []);

  const loadContas = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const response = await (supabase as any)
        .from("contas_pagar_fornecedor")
        .select("*, fornecedores(nome)")
        .eq("user_id", user.id)
        .order("data_vencimento", { ascending: false });

      setContas(response?.data || []);
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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Sessão expirada", description: "Faça login novamente", variant: "destructive" });
      return;
    }

    try {
      const sanitized = sanitizeFormData({
        descricao: formData.descricao,
        observacoes: formData.observacoes,
      });

      const dataToSave = prepareForDatabase({
        ...sanitized,
        fornecedor_id: formData.fornecedor_id || null,
        valor,
        data_vencimento: formData.data_vencimento || null,
        user_id: user.id,
      });

      await (supabase as any).from("contas_pagar_fornecedor").insert(dataToSave);
      toast({ title: "Conta cadastrada com sucesso!" });
      setOpen(false);
      resetForm();
      loadContas();
    } catch (error: any) {
      toast({ title: "Erro ao salvar conta", description: "Tente novamente", variant: "destructive" });
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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Sessão expirada", description: "Faça login novamente", variant: "destructive" });
      return;
    }

    try {
      const novoValorPago = selectedConta.valor_pago + valor;
      const novoStatus = novoValorPago >= selectedConta.valor ? "PAGO" : "PENDENTE";

      await (supabase as any)
        .from("contas_pagar_fornecedor")
        .update({
          valor_pago: novoValorPago,
          status: novoStatus,
          data_pagamento: novoStatus === "PAGO" ? new Date().toISOString() : null,
        })
        .eq("id", selectedConta.id)
        .eq("user_id", user.id);

      toast({ title: "Pagamento registrado com sucesso!" });
      setOpenPagamento(false);
      setSelectedConta(null);
      setValorPagamento("");
      loadContas();
    } catch (error: any) {
      toast({ title: "Erro ao registrar pagamento", description: "Tente novamente", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setFormData({ fornecedor_id: "", descricao: "", valor: "", data_vencimento: "", observacoes: "" });
    setErrors({});
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR");
  };

  const getStatusBadge = (status: string) => {
    return status === "PAGO" ? (
      <Badge variant="default">PAGO</Badge>
    ) : (
      <Badge variant="outline">PENDENTE</Badge>
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-2xl sm:text-3xl font-bold">Contas a Pagar</h2>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-2" />Nova Conta</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nova Conta a Pagar</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="fornecedor">Fornecedor</Label>
                    <Select value={formData.fornecedor_id} onValueChange={(v) => setFormData({...formData, fornecedor_id: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {fornecedores.map(f => (
                          <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="descricao">Descrição *</Label>
                    <Input 
                      id="descricao" 
                      value={formData.descricao} 
                      onChange={(e) => setFormData({...formData, descricao: e.target.value})} 
                      required 
                      maxLength={200}
                      className={errors.descricao ? "border-destructive" : ""}
                    />
                    {errors.descricao && <p className="text-sm text-destructive mt-1">{errors.descricao}</p>}
                  </div>
                  <div>
                    <Label htmlFor="valor">Valor *</Label>
                    <Input 
                      id="valor" 
                      type="number" 
                      step="0.01" 
                      min="0.01" 
                      max="9999999.99"
                      value={formData.valor} 
                      onChange={(e) => setFormData({...formData, valor: e.target.value})} 
                      required 
                      className={errors.valor ? "border-destructive" : ""}
                    />
                    {errors.valor && <p className="text-sm text-destructive mt-1">{errors.valor}</p>}
                  </div>
                  <div>
                    <Label htmlFor="data_vencimento">Data de Vencimento *</Label>
                    <Input 
                      id="data_vencimento" 
                      type="date" 
                      value={formData.data_vencimento} 
                      onChange={(e) => setFormData({...formData, data_vencimento: e.target.value})} 
                      required
                      className={errors.data_vencimento ? "border-destructive" : ""}
                    />
                    {errors.data_vencimento && <p className="text-sm text-destructive mt-1">{errors.data_vencimento}</p>}
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
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center">Carregando...</TableCell></TableRow>
              ) : contas.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Nenhuma conta encontrada</TableCell></TableRow>
              ) : (
                contas.map((conta) => (
                  <TableRow key={conta.id}>
                    <TableCell className="font-medium">{conta.fornecedores?.nome || "-"}</TableCell>
                    <TableCell className="hidden md:table-cell">{conta.descricao}</TableCell>
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
                <Button type="button" variant="outline" onClick={() => setOpenPagamento(false)}>Cancelar</Button>
                <Button type="submit">Confirmar Pagamento</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
