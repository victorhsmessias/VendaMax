import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { useProdutosEstoqueBaixo } from "@/hooks/api/useProdutos";
import { AlertTriangle, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * Componente de alerta de estoque baixo
 *
 * Exibe produtos com quantidade_estoque <= estoque_minimo
 * Usado no Dashboard para notificar sobre necessidade de reposição
 */
export function EstoqueAlert() {
  const { data: produtosEstoqueBaixo, isLoading, error, refetch } = useProdutosEstoqueBaixo();
  const navigate = useNavigate();

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Alertas de Estoque
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LoadingState message="Carregando alertas..." />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Alertas de Estoque
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorState error={error} retry={refetch} />
        </CardContent>
      </Card>
    );
  }

  const produtos = produtosEstoqueBaixo || [];
  const produtosEsgotados = produtos.filter((p) => p.quantidade_estoque === 0);
  const produtosBaixo = produtos.filter((p) => p.quantidade_estoque > 0 && p.quantidade_estoque <= p.estoque_minimo);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          Alertas de Estoque
        </CardTitle>
        <CardDescription>
          {produtos.length === 0
            ? "Todos os produtos com estoque adequado"
            : `${produtos.length} ${produtos.length === 1 ? "produto requer" : "produtos requerem"} atenção`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {produtos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Package className="h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Nenhum produto com estoque baixo
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Produtos Esgotados */}
            {produtosEsgotados.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="destructive" className="text-xs">
                    {produtosEsgotados.length} Esgotado{produtosEsgotados.length > 1 && "s"}
                  </Badge>
                </div>
                <div className="space-y-1">
                  {produtosEsgotados.slice(0, 3).map((produto) => (
                    <div
                      key={produto.id}
                      className="flex items-center justify-between p-2 rounded-md bg-destructive/10 hover:bg-destructive/20 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-destructive">
                          {produto.nome}
                        </p>
                        {produto.codigo && (
                          <p className="text-xs text-muted-foreground">
                            Código: {produto.codigo}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-destructive">0</p>
                        <p className="text-xs text-muted-foreground">
                          Min: {produto.estoque_minimo}
                        </p>
                      </div>
                    </div>
                  ))}
                  {produtosEsgotados.length > 3 && (
                    <p className="text-xs text-muted-foreground pl-2">
                      + {produtosEsgotados.length - 3} outro{produtosEsgotados.length - 3 > 1 && "s"}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Produtos com Estoque Baixo */}
            {produtosBaixo.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-600">
                    {produtosBaixo.length} Estoque Baixo
                  </Badge>
                </div>
                <div className="space-y-1">
                  {produtosBaixo.slice(0, 3).map((produto) => (
                    <div
                      key={produto.id}
                      className="flex items-center justify-between p-2 rounded-md bg-yellow-50 dark:bg-yellow-950/20 hover:bg-yellow-100 dark:hover:bg-yellow-950/30 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                          {produto.nome}
                        </p>
                        {produto.codigo && (
                          <p className="text-xs text-muted-foreground">
                            Código: {produto.codigo}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-500">
                          {produto.quantidade_estoque}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Min: {produto.estoque_minimo}
                        </p>
                      </div>
                    </div>
                  ))}
                  {produtosBaixo.length > 3 && (
                    <p className="text-xs text-muted-foreground pl-2">
                      + {produtosBaixo.length - 3} outro{produtosBaixo.length - 3 > 1 && "s"}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Botão para ver todos */}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => navigate("/produtos")}
            >
              Ver Todos os Produtos
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
