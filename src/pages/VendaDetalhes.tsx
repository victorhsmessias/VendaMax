import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { LoadingState, LoadingSpinner } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { useToast } from "@/hooks/use-toast";
import { useVenda, useCancelarVenda, useRegistrarPagamentoVenda } from "@/hooks/api/useVendas";
import { ArrowLeft, Plus, XCircle } from "lucide-react";
import { format } from "date-fns";

export default function VendaDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // React Query hooks
  const { data: vendaData, isLoading, error, refetch } = useVenda(id);
  const cancelarMutation = useCancelarVenda();
  const pagamentoMutation = useRegistrarPagamentoVenda();

  // Local state (UI apenas)
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formaPagamento, setFormaPagamento] = useState("");
  const [valorPagamento, setValorPagamento] = useState("");
  const [numeroComprovante, setNumeroComprovante] = useState("");
  const [observacoesPagamento, setObservacoesPagamento] = useState("");

  const venda = vendaData?.venda;
  const cliente = vendaData?.cliente;
  const itens = vendaData?.itens || [];
  const pagamentos = vendaData?.pagamentos || [];

  const registrarPagamento = async () => {
    if (!id) return;

    const valor = parseFloat(valorPagamento);

    if (!valor || valor <= 0) {
      toast({
        title: "Valor inválido",
        description: "Informe um valor válido para o pagamento",
        variant: "destructive",
      });
      return;
    }

    if (venda && valor > venda.saldo_devedor) {
      toast({
        title: "Valor excede saldo",
        description: `O valor não pode ser maior que o saldo devedor (R$ ${venda.saldo_devedor.toFixed(2)})`,
        variant: "destructive",
      });
      return;
    }

    if (!formaPagamento) {
      toast({
        title: "Forma de pagamento obrigatória",
        variant: "destructive",
      });
      return;
    }

    try {
      await pagamentoMutation.mutateAsync({
        venda_id: id,
        valor,
        forma_pagamento: formaPagamento,
        numero_comprovante: numeroComprovante || undefined,
        observacoes: observacoesPagamento || undefined,
      });

      toast({
        title: "Pagamento registrado",
        description: "O pagamento foi registrado com sucesso",
      });

      setDialogOpen(false);
      setFormaPagamento("");
      setValorPagamento("");
      setNumeroComprovante("");
      setObservacoesPagamento("");
    } catch (error: any) {
      toast({
        title: "Erro ao registrar pagamento",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
    }
  };

  const cancelarVenda = async () => {
    if (!id) return;

    try {
      await cancelarMutation.mutateAsync(id);

      toast({
        title: "Venda cancelada",
        description: "A venda foi cancelada com sucesso",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao cancelar venda",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
    }
  };

  // Estado: Loading
  if (isLoading) {
    return <LoadingState message="Carregando detalhes da venda..." />;
  }

  // Estado: Error
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/vendas")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold">Detalhes da Venda</h1>
        </div>
        <ErrorState error={error} retry={refetch} />
      </div>
    );
  }

  // Estado: Venda não encontrada
  if (!venda) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Venda não encontrada</p>
      </div>
    );
  }

  const isMutating = cancelarMutation.isLoading || pagamentoMutation.isLoading;

  const getStatusBadge = (status: string) => {
    const variants: any = {
      PENDENTE: "outline",
      PAGO: "default",
      CANCELADO: "destructive",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/vendas")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Detalhes da Venda</h1>
              <p className="text-muted-foreground">{venda.numero_venda}</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {venda.status === "PENDENTE" && (
              <>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => setValorPagamento(venda.saldo_devedor.toString())} className="w-full sm:w-auto">
                      <Plus className="h-4 w-4 mr-2" />
                      Registrar Pagamento
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Registrar Pagamento</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Saldo Devedor</label>
                        <p className="text-2xl font-bold text-primary">
                          R$ {venda.saldo_devedor.toFixed(2)}
                        </p>
                      </div>

                      <FormField label="Valor do Pagamento" required htmlFor="valor">
                        <Input
                          id="valor"
                          type="number"
                          step="0.01"
                          value={valorPagamento}
                          onChange={(e) => setValorPagamento(e.target.value)}
                          placeholder="0.00"
                        />
                      </FormField>

                      <FormField label="Forma de Pagamento" required htmlFor="forma">
                        <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                          <SelectTrigger id="forma">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="DINHEIRO">Dinheiro</SelectItem>
                            <SelectItem value="PIX">PIX</SelectItem>
                            <SelectItem value="CARTAO_DEBITO">Cartão de Débito</SelectItem>
                            <SelectItem value="CARTAO_CREDITO">Cartão de Crédito</SelectItem>
                            <SelectItem value="TRANSFERENCIA">Transferência</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormField>

                      <FormField label="Número do Comprovante" htmlFor="comprovante">
                        <Input
                          id="comprovante"
                          value={numeroComprovante}
                          onChange={(e) => setNumeroComprovante(e.target.value)}
                        />
                      </FormField>

                      <FormField label="Observações" htmlFor="obs">
                        <Textarea
                          id="obs"
                          value={observacoesPagamento}
                          onChange={(e) => setObservacoesPagamento(e.target.value)}
                          rows={3}
                        />
                      </FormField>
                      <Button
                        onClick={registrarPagamento}
                        disabled={pagamentoMutation.isLoading}
                        className="w-full"
                      >
                        {pagamentoMutation.isLoading && <LoadingSpinner className="mr-2" size="sm" />}
                        {pagamentoMutation.isLoading ? "Processando..." : "Confirmar Pagamento"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full sm:w-auto">
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancelar Venda
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancelar Venda</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja cancelar esta venda? Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={cancelarMutation.isLoading}>Não</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={cancelarVenda}
                        disabled={cancelarMutation.isLoading}
                      >
                        {cancelarMutation.isLoading && <LoadingSpinner className="mr-2" size="sm" />}
                        {cancelarMutation.isLoading ? "Cancelando..." : "Sim, Cancelar"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Informações da Venda</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                {getStatusBadge(venda.status)}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Data</p>
                <p className="font-medium">{format(new Date(venda.data_venda), "dd/MM/yyyy HH:mm")}</p>
              </div>
              {venda.observacoes && (
                <div>
                  <p className="text-sm text-muted-foreground">Observações</p>
                  <p className="text-sm">{venda.observacoes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Nome</p>
                <p className="font-medium">{cliente?.nome}</p>
              </div>
              {cliente?.telefone && (
                <div>
                  <p className="text-sm text-muted-foreground">Telefone</p>
                  <p className="text-sm">{cliente.telefone}</p>
                </div>
              )}
              {cliente?.email && (
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="text-sm">{cliente.email}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Valores</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Valor Bruto:</span>
                <span className="font-medium">R$ {venda.valor_bruto.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Desconto:</span>
                <span className="font-medium">R$ {venda.desconto.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-sm font-semibold">Valor Total:</span>
                <span className="font-bold">R$ {venda.valor_total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Valor Pago:</span>
                <span className="font-medium text-green-600">R$ {venda.valor_pago.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-sm font-semibold">Saldo Devedor:</span>
                <span className="font-bold text-primary">R$ {venda.saldo_devedor.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Itens da Venda</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Produto</TableHead>
                  <TableHead className="whitespace-nowrap hidden sm:table-cell">Código</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Quantidade</TableHead>
                  <TableHead className="whitespace-nowrap text-right hidden md:table-cell">Preço Unit.</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itens.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{(item.produtos as any)?.nome}</TableCell>
                    <TableCell className="text-muted-foreground hidden sm:table-cell">{(item.produtos as any)?.codigo || "-"}</TableCell>
                    <TableCell className="text-right">{item.quantidade}</TableCell>
                    <TableCell className="text-right hidden md:table-cell">R$ {item.preco_unitario.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-medium">R$ {item.subtotal.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Histórico de Pagamentos</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {pagamentos.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhum pagamento registrado</p>
            ) : (
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Data</TableHead>
                    <TableHead className="whitespace-nowrap">Forma</TableHead>
                    <TableHead className="whitespace-nowrap hidden sm:table-cell">Comprovante</TableHead>
                    <TableHead className="whitespace-nowrap text-right">Valor</TableHead>
                    <TableHead className="whitespace-nowrap hidden md:table-cell">Observações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagamentos.map((pag) => (
                    <TableRow key={pag.id}>
                      <TableCell>{format(new Date(pag.data_pagamento), "dd/MM/yyyy HH:mm")}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{pag.forma_pagamento.replace("_", " ")}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden sm:table-cell">{pag.numero_comprovante || "-"}</TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        R$ {pag.valor.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{pag.observacoes || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
  );
}
