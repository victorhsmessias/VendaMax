import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Plus, Eye } from "lucide-react";

interface Venda {
  id: string;
  numero_venda: string;
  data_venda: string;
  valor_total: number;
  valor_pago: number;
  saldo_devedor: number;
  status: string;
  clientes?: { nome: string };
}

export default function Vendas() {
  const navigate = useNavigate();
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVendas();
  }, []);

  const loadVendas = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const response = await (supabase as any)
        .from("vendas")
        .select("*, clientes(nome)")
        .eq("user_id", user.id)
        .order("data_venda", { ascending: false });

      setVendas(response?.data || []);
    } catch (error) {
      console.error("Erro ao carregar vendas:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR");
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "destructive" | "outline"> = {
      PAGO: "default",
      PENDENTE: "outline",
      CANCELADO: "destructive",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-2xl sm:text-3xl font-bold">Vendas</h2>
          <Button onClick={() => navigate("/vendas/nova")} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />Nova Venda
          </Button>
        </div>

        <div className="bg-card rounded-lg border">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Número</TableHead>
                <TableHead className="whitespace-nowrap">Cliente</TableHead>
                <TableHead className="whitespace-nowrap hidden sm:table-cell">Data</TableHead>
                <TableHead className="whitespace-nowrap text-right">Total</TableHead>
                <TableHead className="whitespace-nowrap text-right hidden md:table-cell">Pago</TableHead>
                <TableHead className="whitespace-nowrap text-right hidden lg:table-cell">Saldo</TableHead>
                <TableHead className="whitespace-nowrap hidden sm:table-cell">Status</TableHead>
                <TableHead className="whitespace-nowrap text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center">Carregando...</TableCell></TableRow>
              ) : vendas.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Nenhuma venda encontrada</TableCell></TableRow>
              ) : (
                vendas.map((venda) => (
                  <TableRow key={venda.id}>
                    <TableCell className="font-medium">{venda.numero_venda}</TableCell>
                    <TableCell>{venda.clientes?.nome || "-"}</TableCell>
                    <TableCell className="hidden sm:table-cell">{formatDate(venda.data_venda)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(venda.valor_total)}</TableCell>
                    <TableCell className="text-right hidden md:table-cell">{formatCurrency(venda.valor_pago)}</TableCell>
                    <TableCell className="text-right hidden lg:table-cell">
                      <span className={venda.saldo_devedor > 0 ? "text-destructive font-semibold" : "text-success"}>
                        {formatCurrency(venda.saldo_devedor)}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{getStatusBadge(venda.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/vendas/${venda.id}`)}>
                        <Eye className="h-4 w-4" />
                      </Button>
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
