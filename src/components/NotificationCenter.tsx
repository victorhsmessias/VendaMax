import { Bell, Package, AlertTriangle, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications } from "@/hooks/useNotifications";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

/**
 * Centro de Notificações
 *
 * 🔔 NOTIFICATION CENTER: Painel de notificações do sistema
 * - Mostra alertas de estoque baixo
 * - Mostra contas a vencer e vencidas
 * - Badge com contador de notificações
 * - Cores por prioridade (vermelho=high, amarelo=medium)
 * - Links para páginas relevantes
 * - Scroll automático quando muitas notificações
 */
export function NotificationCenter() {
  const {
    notifications,
    totalCount,
    highPriorityCount,
    estoqueBaixoCount,
    contasVencidasCount,
    contasAVencerCount,
  } = useNotifications();

  const navigate = useNavigate();

  const getIcon = (type: string) => {
    switch (type) {
      case "estoque_baixo":
        return <Package className="h-4 w-4" />;
      case "conta_vencida":
      case "conta_vencer":
        return <DollarSign className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const handleNavigate = (type: string) => {
    switch (type) {
      case "estoque_baixo":
        navigate("/produtos");
        break;
      case "conta_vencida":
      case "conta_vencer":
        navigate("/contas-pagar");
        break;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 relative">
          <Bell className="h-5 w-5" />
          {totalCount > 0 && (
            <Badge
              variant={highPriorityCount > 0 ? "destructive" : "secondary"}
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {totalCount > 9 ? "9+" : totalCount}
            </Badge>
          )}
          <span className="sr-only">Notificações</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificações</span>
          {totalCount > 0 && (
            <Badge variant="outline" className="ml-auto">
              {totalCount}
            </Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {totalCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <Bell className="h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Nenhuma notificação</p>
            <p className="text-xs text-muted-foreground mt-1">
              Você está em dia com tudo!
            </p>
          </div>
        ) : (
          <>
            {/* Resumo por tipo */}
            <div className="px-2 py-2 space-y-1">
              {estoqueBaixoCount > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Package className="h-3 w-3 text-yellow-600" />
                    <span className="text-muted-foreground">Estoque Baixo</span>
                  </div>
                  <Badge variant="outline" className="text-yellow-600">
                    {estoqueBaixoCount}
                  </Badge>
                </div>
              )}
              {contasVencidasCount > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-3 w-3 text-destructive" />
                    <span className="text-muted-foreground">Contas Vencidas</span>
                  </div>
                  <Badge variant="outline" className="text-destructive">
                    {contasVencidasCount}
                  </Badge>
                </div>
              )}
              {contasAVencerCount > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-3 w-3 text-blue-600" />
                    <span className="text-muted-foreground">Contas a Vencer</span>
                  </div>
                  <Badge variant="outline" className="text-blue-600">
                    {contasAVencerCount}
                  </Badge>
                </div>
              )}
            </div>
            <DropdownMenuSeparator />

            {/* Lista de notificações */}
            <ScrollArea className="h-[400px]">
              {notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className={cn(
                    "flex flex-col items-start gap-1 p-3 cursor-pointer",
                    notification.priority === "high" && "bg-destructive/5",
                    notification.priority === "medium" && "bg-yellow-500/5"
                  )}
                  onClick={() => handleNavigate(notification.type)}
                >
                  <div className="flex items-start gap-2 w-full">
                    <div
                      className={cn(
                        "mt-0.5",
                        notification.priority === "high" && "text-destructive",
                        notification.priority === "medium" && "text-yellow-600",
                        notification.priority === "low" && "text-muted-foreground"
                      )}
                    >
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
            </ScrollArea>

            <DropdownMenuSeparator />
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => navigate("/")}
              >
                Ver Dashboard
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
