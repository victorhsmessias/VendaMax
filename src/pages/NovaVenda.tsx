import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, ShoppingCart } from "lucide-react";

interface Cliente {
  id: string;
  nome: string;
}

interface Produto {
  id: string;
  nome: string;
  preco_venda: number;
  preco_compra: number;
}

interface ItemCarrinho {
  produto_id: string;
  produto_nome: string;
  quantidade: number;
  preco_unitario: number;
  custo_unitario: number;
  subtotal: number;
}

export default function NovaVenda() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [desconto, setDesconto] = useState("0");
  const [observacoes, setObservacoes] = useState("");
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [openProduto, setOpenProduto] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState("");
  const [quantidade, setQuantidade] = useState("1");

  useEffect(() => {
    loadClientes();
    loadProdutos();
  }, []);

  const loadClientes = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const response = await (supabase as any)
      .from("clientes")
      .select("id, nome")
      .eq("user_id", user.id)
      .eq("ativo", true)
      .order("nome");

    setClientes(response?.data || []);
  };

  const loadProdutos = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const response = await (supabase as any)
      .from("produtos")
      .select("id, nome, preco_venda, preco_compra")
      .eq("user_id", user.id)
      .eq("ativo", true)
      .order("nome");

    setProdutos(response?.data || []);
  };

  const adicionarProduto = () => {
    const produto = produtos.find(p => p.id === produtoSelecionado);
    if (!produto) return;

    const qtd = parseInt(quantidade);
    if (qtd <= 0) {
      toast({ title: "Quantidade inválida", variant: "destructive" });
      return;
    }

    const item: ItemCarrinho = {
      produto_id: produto.id,
      produto_nome: produto.nome,
      quantidade: qtd,
      preco_unitario: produto.preco_venda,
      custo_unitario: produto.preco_compra,
      subtotal: qtd * produto.preco_venda,
    };

    setCarrinho([...carrinho, item]);
    setProdutoSelecionado("");
    setQuantidade("1");
    setOpenProduto(false);
  };

  const removerProduto = (index: number) => {
    setCarrinho(carrinho.filter((_, i) => i !== index));
  };

  const calcularValorBruto = () => {
    return carrinho.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const calcularValorTotal = () => {
    return calcularValorBruto() - parseFloat(desconto || "0");
  };

  const finalizarVenda = async () => {
    if (!clienteId) {
      toast({ title: "Selecione um cliente", variant: "destructive" });
      return;
    }

    if (carrinho.length === 0) {
      toast({ title: "Adicione pelo menos um produto", variant: "destructive" });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const numeroVendaResponse = await (supabase as any).rpc("generate_numero_venda");
      const numeroVenda = numeroVendaResponse?.data;

      const valorBruto = calcularValorBruto();
      const descontoValor = parseFloat(desconto || "0");
      const valorTotal = valorBruto - descontoValor;

      const vendaResponse = await (supabase as any)
        .from("vendas")
        .insert({
          user_id: user.id,
          cliente_id: clienteId,
          numero_venda: numeroVenda,
          valor_bruto: valorBruto,
          desconto: descontoValor,
          valor_total: valorTotal,
          observacoes: observacoes,
        })
        .select()
        .single();

      const vendaId = vendaResponse?.data?.id;

      const itens = carrinho.map(item => ({
        user_id: user.id,
        venda_id: vendaId,
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario,
        custo_unitario: item.custo_unitario,
      }));

      await (supabase as any).from("itens_venda").insert(itens);

      toast({ title: "Venda criada com sucesso!" });

      if (confirm("Cliente pagou agora?")) {
        navigate(`/vendas/${vendaId}`);
      } else {
        navigate("/vendas");
      }
    } catch (error: any) {
      console.error("Erro ao criar venda:", error);
      toast({ title: "Erro ao criar venda", description: error.message, variant: "destructive" });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  return (
    
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-2xl sm:text-3xl font-bold">Nova Venda</h2>
          <Button variant="outline" onClick={() => navigate("/vendas")} className="w-full sm:w-auto">Cancelar</Button>
        </div>

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Itens da Venda
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Dialog open={openProduto} onOpenChange={setOpenProduto}>
                <DialogTrigger asChild>
                  <Button className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Produto
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar Produto</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Produto</Label>
                      <Select value={produtoSelecionado} onValueChange={setProdutoSelecionado}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {produtos.map(p => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.nome} - {formatCurrency(p.preco_venda)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Quantidade</Label>
                      <Input type="number" min="1" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
                    </div>
                    <Button onClick={adicionarProduto} className="w-full">Adicionar</Button>
                  </div>
                </DialogContent>
              </Dialog>

              {carrinho.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum produto adicionado</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-center">Qtd</TableHead>
                      <TableHead className="text-right">Preço</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {carrinho.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.produto_nome}</TableCell>
                        <TableCell className="text-center">{item.quantidade}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.preco_unitario)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(item.subtotal)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => removerProduto(index)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Informações da Venda</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Cliente *</Label>
                  <Select value={clienteId} onValueChange={setClienteId} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Observações</Label>
                  <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={3} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Totais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor Bruto:</span>
                  <span className="font-semibold">{formatCurrency(calcularValorBruto())}</span>
                </div>
                <div>
                  <Label>Desconto:</Label>
                  <Input type="number" step="0.01" min="0" max={calcularValorBruto()} value={desconto} onChange={(e) => setDesconto(e.target.value)} />
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-3">
                  <span>Valor Total:</span>
                  <span className="text-primary">{formatCurrency(calcularValorTotal())}</span>
                </div>
                <Button onClick={finalizarVenda} className="w-full" size="lg">
                  Finalizar Venda
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    
  );
}
