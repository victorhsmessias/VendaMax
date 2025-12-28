import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email({ message: "E-mail inválido" }).max(255, { message: "E-mail muito longo" }),
  password: z.string().min(6, { message: "Senha deve ter pelo menos 6 caracteres" }).max(128, { message: "Senha muito longa" }),
});

export const signupSchema = z.object({
  nome: z.string().trim().min(2, { message: "Nome deve ter pelo menos 2 caracteres" }).max(100, { message: "Nome muito longo" }),
  email: z.string().trim().email({ message: "E-mail inválido" }).max(255, { message: "E-mail muito longo" }),
  password: z.string().min(6, { message: "Senha deve ter pelo menos 6 caracteres" }).max(128, { message: "Senha muito longa" }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/;
const cnpjRegex = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$|^\d{14}$/;
const telefoneRegex = /^\(\d{2}\)\s?\d{4,5}-\d{4}$|^\d{10,11}$/;
const cepRegex = /^\d{5}-?\d{3}$/;

export const clienteSchema = z.object({
  nome: z.string().trim().min(2, { message: "Nome deve ter pelo menos 2 caracteres" }).max(100, { message: "Nome muito longo" }),
  cpf: z.string().trim().refine((val) => val === "" || cpfRegex.test(val), { message: "CPF inválido" }),
  telefone: z.string().trim().refine((val) => val === "" || telefoneRegex.test(val), { message: "Telefone inválido" }),
  email: z.string().trim().refine((val) => val === "" || z.string().email().safeParse(val).success, { message: "E-mail inválido" }),
  endereco: z.string().trim().max(200, { message: "Endereço muito longo" }),
  bairro: z.string().trim().max(100, { message: "Bairro muito longo" }),
  cidade: z.string().trim().max(100, { message: "Cidade muito longa" }),
  estado: z.string().trim().max(2, { message: "Use a sigla do estado (2 letras)" }),
  cep: z.string().trim().refine((val) => val === "" || cepRegex.test(val), { message: "CEP inválido" }),
  observacoes: z.string().trim().max(1000, { message: "Observações muito longas" }),
});

export const fornecedorSchema = z.object({
  nome: z.string().trim().min(2, { message: "Nome deve ter pelo menos 2 caracteres" }).max(100, { message: "Nome muito longo" }),
  cnpj: z.string().trim().refine((val) => val === "" || cnpjRegex.test(val), { message: "CNPJ inválido" }),
  telefone: z.string().trim().refine((val) => val === "" || telefoneRegex.test(val), { message: "Telefone inválido" }),
  email: z.string().trim().refine((val) => val === "" || z.string().email().safeParse(val).success, { message: "E-mail inválido" }),
  site: z.string().trim().refine((val) => val === "" || z.string().url().safeParse(val).success, { message: "URL inválida" }),
  observacoes: z.string().trim().max(1000, { message: "Observações muito longas" }),
});

export const produtoSchema = z.object({
  nome: z.string().trim().min(2, { message: "Nome deve ter pelo menos 2 caracteres" }).max(150, { message: "Nome muito longo" }),
  fornecedor_id: z.string().uuid({ message: "Selecione um fornecedor válido" }),
  codigo: z.string().trim().max(50, { message: "Código muito longo" }),
  descricao: z.string().trim().max(500, { message: "Descrição muito longa" }),
  preco_compra: z.number().positive({ message: "Preço de compra deve ser positivo" }).max(999999.99, { message: "Preço muito alto" }),
  preco_venda: z.number().positive({ message: "Preço de venda deve ser positivo" }).max(999999.99, { message: "Preço muito alto" }),
});

export const contaPagarSchema = z.object({
  descricao: z.string().trim().min(2, { message: "Descrição obrigatória" }).max(200, { message: "Descrição muito longa" }),
  valor: z.number().positive({ message: "Valor deve ser positivo" }).max(9999999.99, { message: "Valor muito alto" }),
  data_vencimento: z.string().min(1, { message: "Data de vencimento obrigatória" }),
  fornecedor_id: z.string().uuid().nullable(),
  observacoes: z.string().trim().max(1000, { message: "Observações muito longas" }),
});

export const sanitizeString = (str: string): string => {
  return str
    .replace(/<[^>]*>/g, "")
    .replace(/[<>"'&]/g, "")
    .trim();
};

export const sanitizeFormData = <T extends Record<string, any>>(data: T): T => {
  const sanitized = { ...data };
  for (const key in sanitized) {
    if (typeof sanitized[key] === "string") {
      sanitized[key] = sanitizeString(sanitized[key]) as any;
    }
  }
  return sanitized;
};

export const prepareForDatabase = <T extends Record<string, any>>(data: T): T => {
  const prepared = { ...data };
  for (const key in prepared) {
    if (typeof prepared[key] === "string" && prepared[key].trim() === "") {
      prepared[key] = null as any;
    }
  }
  return prepared;
};

export const formatCPF = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

export const formatCNPJ = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
};

export const formatTelefone = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

export const formatCEP = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

export type LoginData = z.infer<typeof loginSchema>;
export type SignupData = z.infer<typeof signupSchema>;
export type ClienteData = z.infer<typeof clienteSchema>;
export type FornecedorData = z.infer<typeof fornecedorSchema>;
export type ProdutoData = z.infer<typeof produtoSchema>;
export type ContaPagarData = z.infer<typeof contaPagarSchema>;
