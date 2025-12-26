import { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  variant?: "default" | "success" | "warning" | "danger";
}

export function MetricCard({ title, value, icon: Icon, trend, variant = "default" }: MetricCardProps) {
  const variantStyles = {
    default: "bg-gradient-card",
    success: "bg-gradient-to-br from-success/10 to-success/5",
    warning: "bg-gradient-to-br from-warning/10 to-warning/5",
    danger: "bg-gradient-to-br from-destructive/10 to-destructive/5",
  };

  const iconStyles = {
    default: "text-primary",
    success: "text-success",
    warning: "text-warning",
    danger: "text-destructive",
  };

  return (
    <Card className={`${variantStyles[variant]} border-2 hover:shadow-lg transition-shadow`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={`h-5 w-5 ${iconStyles[variant]}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend && <p className="text-xs text-muted-foreground mt-1">{trend}</p>}
      </CardContent>
    </Card>
  );
}
