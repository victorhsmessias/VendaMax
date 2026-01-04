import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LoadingState, LoadingSpinner } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useClientes } from "@/hooks/api/useClientes";
import { useProdutos } from "@/hooks/api/useProdutos";
import { useFornecedores } from "@/hooks/api/useFornecedores";
import { useCreateVenda } from "@/hooks/api/useVendas";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, ShoppingCart, DollarSign, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";

interface Cliente {
  id: string;
  nome: string;
}

interface Produto {
  id: string;
  nome: string;
  preco_venda: number;
  preco_compra: number;
  quantidade_estoque: number;
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

  // React Query hooks
  const { data: clientes, isLoading: clientesLoading, error: clientesError } = useClientes();
  const { data: produtos, isLoading: produtosLoading, error: produtosError } = useProdutos();
  const { data: fornecedores, isLoading: fornecedoresLoading, error: fornecedoresError } = useFornecedores();
  const createVendaMutation = useCreateVenda();

  // Local state - Modo de venda (padrão: manual)
  const [modoManual, setModoManual] = useState(true);

  // Local state - Comum a ambos os modos
  const [clienteId, setClienteId] = useState("");
  const [desconto, setDesconto] = useState("0");
  const [observacoes, setObservacoes] = useState("");
  const [parcelas, setParcelas] = useState("1");

  // Local state - Modo com produtos
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [openProduto, setOpenProduto] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState("");
  const [quantidade, setQuantidade] = useState("1");

  // Local state - Modo manual
  const [valorManual, setValorManual] = useState("");
  const [fornecedoresSelecionados, setFornecedoresSelecionados] = useState<string[]>([]);

  const adicionarProduto = () => {
    if (!produtos) return;

    const produto = produtos.find(p => p.id === produtoSelecionado);
    if (!produto) return;

    const qtd = parseInt(quantidade);
    if (qtd <= 0) {
      toast({ title: "Quantidade inválida", variant: "destructive" });
      return;
    }

    // 📦 VALIDAÇÃO DE ESTOQUE
    // Verificar quantidade já no carrinho para este produto
    const quantidadeNoCarrinho = carrinho
      .filter(item => item.produto_id === produto.id)
      .reduce((sum, item) => sum + item.quantidade, 0);

    const quantidadeTotal = quantidadeNoCarrinho + qtd;

    if (quantidadeTotal > produto.quantidade_estoque) {
      const disponivel = produto.quantidade_estoque - quantidadeNoCarrinho;
      toast({
        title: "Estoque insuficiente",
        description: `${produto.nome} - Disponível: ${produto.quantidade_estoque} | No carrinho: ${quantidadeNoCarrinho} | Pode adicionar: ${disponivel}`,
        variant: "destructive"
      });
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

    // Mostrar alerta se estoque ficar baixo após venda
    const estoqueRestante = produto.quantidade_estoque - quantidadeTotal;
    if (estoqueRestante === 0) {
      toast({
        title: "Atenção: Produto esgotará",
        description: `${produto.nome} ficará sem estoque após esta venda`,
        variant: "default"
      });
    }
  };

  const removerProduto = (index: number) => {
    setCarrinho(carrinho.filter((_, i) => i !== index));
  };

  const adicionarFornecedor = (fornecedorId: string) => {
    if (!fornecedoresSelecionados.includes(fornecedorId)) {
      setFornecedoresSelecionados([...fornecedoresSelecionados, fornecedorId]);
    }
  };

  const removerFornecedor = (fornecedorId: string) => {
    setFornecedoresSelecionados(fornecedoresSelecionados.filter(id => id !== fornecedorId));
  };

  const calcularValorBruto = () => {
    if (modoManual) {
      return parseFloat(valorManual || "0");
    }
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

    if (modoManual) {
      // Modo manual: validar valor
      const valor = parseFloat(valorManual || "0");
      if (valor <= 0) {
        toast({ title: "Informe o valor da venda", variant: "destructive" });
        return;
      }

      try {
        const descontoValor = parseFloat(desconto || "0");
        const valorTotal = valor - descontoValor;

        // Adicionar informação sobre fornecedores nas observações
        let obsCompleta = observacoes || "";
        if (fornecedoresSelecionados.length > 0 && fornecedores) {
          const nomesFornecedores = fornecedoresSelecionados
            .map(id => fornecedores.find(f => f.id === id)?.nome)
            .filter(Boolean)
            .join(", ");
          obsCompleta = obsCompleta
            ? `${obsCompleta}\n\nFornecedores: ${nomesFornecedores}`
            : `Fornecedores: ${nomesFornecedores}`;
        }

        const venda = await createVendaMutation.mutateAsync({
          venda: {
            cliente_id: clienteId,
            valor_bruto: valor,
            desconto: descontoValor,
            valor_total: valorTotal,
            valor_pago: 0,
            observacoes: obsCompleta || null,
            parcelas: parseInt(parcelas) || 1,
          },
          itens: [], // Venda sem itens no modo manual
        });

        toast({ title: "Venda criada com sucesso!" });

        if (confirm("Cliente pagou agora?")) {
          navigate(`/vendas/${venda.id}`);
        } else {
          navigate("/vendas");
        }
      } catch (error: any) {
        toast({
          title: "Erro ao criar venda",
          description: error.message || "Tente novamente",
          variant: "destructive"
        });
      }
    } else {
      // Modo com produtos: validar carrinho
      if (carrinho.length === 0) {
        toast({ title: "Adicione pelo menos um produto", variant: "destructive" });
        return;
      }

      try {
        const valorBruto = calcularValorBruto();
        const descontoValor = parseFloat(desconto || "0");
        const valorTotal = valorBruto - descontoValor;

        const venda = await createVendaMutation.mutateAsync({
          venda: {
            cliente_id: clienteId,
            valor_bruto: valorBruto,
            desconto: descontoValor,
            valor_total: valorTotal,
            valor_pago: 0,
            observacoes: observacoes || null,
            parcelas: parseInt(parcelas) || 1,
          },
          itens: carrinho.map(item => ({
            produto_id: item.produto_id,
            quantidade: item.quantidade,
            preco_unitario: item.preco_unitario,
            custo_unitario: item.custo_unitario,
          })),
        });

        toast({ title: "Venda criada com sucesso!" });

        if (confirm("Cliente pagou agora?")) {
          navigate(`/vendas/${venda.id}`);
        } else {
          navigate("/vendas");
        }
      } catch (error: any) {
        toast({
          title: "Erro ao criar venda",
          description: error.message || "Tente novamente",
          variant: "destructive"
        });
      }
    }
  };

  // Estado: Loading
  const isLoading = clientesLoading || produtosLoading || fornecedoresLoading;
  const error = clientesError || produtosError || fornecedoresError;

  if (isLoading) {
    return <LoadingState message="Carregando dados..." />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl sm:text-3xl font-bold">Nova Venda</h2>
        <ErrorState error={error} retry={() => window.location.reload()} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-2xl sm:text-3xl font-bold">Nova Venda</h2>
          <Button variant="outline" onClick={() => navigate("/vendas")} className="w-full sm:w-auto">Cancelar</Button>
        </div>

        {/* Toggle Modo de Venda */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="modo-venda" className="text-base font-medium">
                  {modoManual ? "Venda Manual (Valor Direto)" : "Venda com Produtos"}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {modoManual
                    ? "Informe apenas o valor total da venda, sem adicionar produtos"
                    : "Adicione produtos ao carrinho para calcular o valor automaticamente"
                  }
                </p>
              </div>
              <Switch
                id="modo-venda"
                checked={modoManual}
                onCheckedChange={(checked) => {
                  setModoManual(checked);
                  // Limpar dados ao trocar de modo
                  if (checked) {
                    setCarrinho([]);
                  } else {
                    setValorManual("");
                    setFornecedoresSelecionados([]);
                  }
                }}
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
          {/* Modo com Produtos */}
          {!modoManual && (
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
                    <FormField label="Produto" required htmlFor="produto">
                      <Select value={produtoSelecionado} onValueChange={setProdutoSelecionado}>
                        <SelectTrigger id="produto">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {produtos?.map(p => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.nome} - {formatCurrency(p.preco_venda)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="Quantidade" required htmlFor="quantidade">
                      <Input id="quantidade" type="number" min="1" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
                    </FormField>
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
          )}

          {/* Modo Manual */}
          {modoManual && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Valor da Venda
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField label="Valor Total" required htmlFor="valor-manual">
                  <Input
                    id="valor-manual"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={valorManual}
                    onChange={(e) => setValorManual(e.target.value)}
                  />
                </FormField>

                <div className="space-y-2">
                  <Label>Fornecedores (Opcional)</Label>
                  <p className="text-sm text-muted-foreground">
                    Selecione os fornecedores relacionados a esta venda
                  </p>
                  <Select onValueChange={adicionarFornecedor}>
                    <SelectTrigger>
                      <SelectValue placeholder="Adicionar fornecedor..." />
                    </SelectTrigger>
                    <SelectContent>
                      {fornecedores?.map(f => (
                        <SelectItem key={f.id} value={f.id} disabled={fornecedoresSelecionados.includes(f.id)}>
                          {f.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {fornecedoresSelecionados.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {fornecedoresSelecionados.map(fornecedorId => {
                        const fornecedor = fornecedores?.find(f => f.id === fornecedorId);
                        return (
                          <Badge key={fornecedorId} variant="secondary" className="gap-1">
                            {fornecedor?.nome}
                            <button
                              type="button"
                              onClick={() => removerFornecedor(fornecedorId)}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Informações da Venda</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField label="Cliente" required htmlFor="cliente">
                  <Select value={clienteId} onValueChange={setClienteId} required>
                    <SelectTrigger id="cliente">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes?.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField label="Observações" htmlFor="observacoes">
                  <Textarea id="observacoes" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={3} />
                </FormField>
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
                <FormField label="Desconto" htmlFor="desconto">
                  <Input id="desconto" type="number" step="0.01" min="0" max={calcularValorBruto()} value={desconto} onChange={(e) => setDesconto(e.target.value)} />
                </FormField>
                <FormField label="Parcelas" htmlFor="parcelas">
                  <Select value={parcelas} onValueChange={setParcelas}>
                    <SelectTrigger id="parcelas">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">À vista</SelectItem>
                      {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                        <SelectItem key={n} value={n.toString()}>
                          {n}x de {formatCurrency(calcularValorTotal() / n)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <div className="flex justify-between text-lg font-bold border-t pt-3">
                  <span>Valor Total:</span>
                  <span className="text-primary">{formatCurrency(calcularValorTotal())}</span>
                </div>
                {parseInt(parcelas) > 1 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{parcelas}x de:</span>
                    <span className="font-semibold">{formatCurrency(calcularValorTotal() / parseInt(parcelas))}</span>
                  </div>
                )}
                <Button onClick={finalizarVenda} className="w-full" size="lg" disabled={createVendaMutation.isLoading}>
                  {createVendaMutation.isLoading && <LoadingSpinner className="mr-2" size="sm" />}
                  {createVendaMutation.isLoading ? "Processando..." : "Finalizar Venda"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    
  );
}
