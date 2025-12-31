import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
  description?: string;
}

/**
 * Componente FormField - Campo de formulário com label, erro inline e descrição
 *
 * @example
 * ```tsx
 * <FormField
 *   label="Nome"
 *   error={errors.nome}
 *   required
 *   htmlFor="nome"
 * >
 *   <Input id="nome" {...field} />
 * </FormField>
 * ```
 */
export function FormField({
  label,
  error,
  required = false,
  htmlFor,
  className,
  children,
  description,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label
        htmlFor={htmlFor}
        className={cn(
          "text-sm font-medium",
          error && "text-destructive"
        )}
      >
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>

      {description && !error && (
        <p className="text-sm text-muted-foreground">
          {description}
        </p>
      )}

      {children}

      {error && (
        <p
          className="text-sm font-medium text-destructive"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}
    </div>
  );
}
