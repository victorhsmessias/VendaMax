import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import type { TablesInsert } from "@/integrations/supabase/types";

type Venda = {
  id: string;
  numero_venda: string;
  data_venda: string;
  valor_total: number;
  valor_pago: number;
  saldo_devedor: number;
  status: string;
  clientes?: { nome: string };
};

/**
 * Hook para buscar todas as vendas
 */
export function useVendas() {
  const { handleError } = useErrorHandler();

  return useQuery({
    queryKey: ["vendas"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("vendas")
        .select("*, clientes(nome)")
        .eq("user_id", user.id)
        .order("data_venda", { ascending: false });

      if (error) throw error;
      return data as Venda[];
    },
    onError: (error) => {
      handleError(error, { context: "Ao carregar vendas" });
    },
  });
}

/**
 * Hook para buscar uma venda específica com itens
 */
export function useVenda(id: string | undefined) {
  const { handleError } = useErrorHandler();

  return useQuery({
    queryKey: ["vendas", id],
    queryFn: async () => {
      if (!id) return null;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("vendas")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
    onError: (error) => {
      handleError(error, { context: "Ao carregar venda" });
    },
  });
}

/**
 * Hook para criar nova venda com itens
 *
 * IMPORTANTE: Usa função transacional do banco para garantir atomicidade.
 * Ou TUDO é salvo (venda + itens) ou NADA é salvo.
 */
export function useCreateVenda() {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: async (params: {
      venda: TablesInsert<"vendas">;
      itens: Array<{
        produto_id: string;
        quantidade: number;
        preco_unitario: number;
        custo_unitario: number;
      }>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Validação
      if (!params.itens || params.itens.length === 0) {
        throw new Error("A venda deve ter pelo menos um item");
      }

      // Chama função transacional do banco
      const { data, error } = await supabase.rpc("create_venda_with_items", {
        p_user_id: user.id,
        p_cliente_id: params.venda.cliente_id,
        p_data_venda: params.venda.data_venda || new Date().toISOString(),
        p_valor_bruto: params.venda.valor_bruto || 0,
        p_desconto: params.venda.desconto || 0,
        p_valor_total: params.venda.valor_total,
        p_valor_pago: params.venda.valor_pago || 0,
        p_observacoes: params.venda.observacoes || null,
        p_itens: params.itens.map(item => ({
          produto_id: item.produto_id,
          quantidade: item.quantidade,
          preco_unitario: item.preco_unitario,
          custo_unitario: item.custo_unitario,
        })),
      });

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Erro ao criar venda: resposta vazia do servidor");
      }

      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendas"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => {
      handleError(error, { context: "Ao criar venda" });
    },
  });
}
