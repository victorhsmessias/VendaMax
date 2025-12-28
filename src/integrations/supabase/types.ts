export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      clientes: {
        Row: {
          id: string
          user_id: string
          nome: string
          cpf: string | null
          telefone: string | null
          email: string | null
          endereco: string | null
          bairro: string | null
          cidade: string | null
          estado: string | null
          cep: string | null
          observacoes: string | null
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          nome: string
          cpf?: string | null
          telefone?: string | null
          email?: string | null
          endereco?: string | null
          bairro?: string | null
          cidade?: string | null
          estado?: string | null
          cep?: string | null
          observacoes?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          nome?: string
          cpf?: string | null
          telefone?: string | null
          email?: string | null
          endereco?: string | null
          bairro?: string | null
          cidade?: string | null
          estado?: string | null
          cep?: string | null
          observacoes?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clientes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      fornecedores: {
        Row: {
          id: string
          user_id: string
          nome: string
          cnpj: string | null
          telefone: string | null
          email: string | null
          site: string | null
          observacoes: string | null
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          nome: string
          cnpj?: string | null
          telefone?: string | null
          email?: string | null
          site?: string | null
          observacoes?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          nome?: string
          cnpj?: string | null
          telefone?: string | null
          email?: string | null
          site?: string | null
          observacoes?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fornecedores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      produtos: {
        Row: {
          id: string
          user_id: string
          nome: string
          codigo: string | null
          descricao: string | null
          preco_compra: number
          preco_venda: number
          margem_lucro: number | null
          fornecedor_id: string | null
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          nome: string
          codigo?: string | null
          descricao?: string | null
          preco_compra: number
          preco_venda: number
          margem_lucro?: number | null
          fornecedor_id?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          nome?: string
          codigo?: string | null
          descricao?: string | null
          preco_compra?: number
          preco_venda?: number
          margem_lucro?: number | null
          fornecedor_id?: string | null
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "produtos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          }
        ]
      }
      vendas: {
        Row: {
          id: string
          user_id: string
          cliente_id: string
          numero_venda: string
          data_venda: string
          valor_bruto: number
          desconto: number
          valor_total: number
          valor_pago: number
          saldo_devedor: number
          status: string
          observacoes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          cliente_id: string
          numero_venda?: string
          data_venda?: string
          valor_bruto?: number
          desconto?: number
          valor_total: number
          valor_pago?: number
          saldo_devedor?: number
          status?: string
          observacoes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          cliente_id?: string
          numero_venda?: string
          data_venda?: string
          valor_bruto?: number
          desconto?: number
          valor_total?: number
          valor_pago?: number
          saldo_devedor?: number
          status?: string
          observacoes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendas_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          }
        ]
      }
      itens_venda: {
        Row: {
          id: string
          user_id: string
          venda_id: string
          produto_id: string
          quantidade: number
          preco_unitario: number
          custo_unitario: number
          subtotal: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          venda_id: string
          produto_id: string
          quantidade: number
          preco_unitario: number
          custo_unitario: number
          subtotal?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          venda_id?: string
          produto_id?: string
          quantidade?: number
          preco_unitario?: number
          custo_unitario?: number
          subtotal?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "itens_venda_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_venda_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_venda_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          }
        ]
      }
      contas_pagar_fornecedor: {
        Row: {
          id: string
          user_id: string
          fornecedor_id: string | null
          descricao: string
          valor: number
          valor_pago: number
          saldo_devedor: number
          data_vencimento: string
          status: string
          observacoes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          fornecedor_id?: string | null
          descricao: string
          valor: number
          valor_pago?: number
          saldo_devedor?: number
          data_vencimento: string
          status?: string
          observacoes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          fornecedor_id?: string | null
          descricao?: string
          valor?: number
          valor_pago?: number
          saldo_devedor?: number
          data_vencimento?: string
          status?: string
          observacoes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contas_pagar_fornecedor_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_fornecedor_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          }
        ]
      }
      pagamentos_venda: {
        Row: {
          id: string
          user_id: string
          venda_id: string
          valor: number
          data_pagamento: string
          observacoes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          venda_id: string
          valor: number
          data_pagamento?: string
          observacoes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          venda_id?: string
          valor?: number
          data_pagamento?: string
          observacoes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_venda_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamentos_venda_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          }
        ]
      }
      pagamentos_fornecedor: {
        Row: {
          id: string
          user_id: string
          conta_id: string
          valor: number
          data_pagamento: string
          observacoes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          conta_id: string
          valor: number
          data_pagamento?: string
          observacoes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          conta_id?: string
          valor?: number
          data_pagamento?: string
          observacoes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_fornecedor_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamentos_fornecedor_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "contas_pagar_fornecedor"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_numero_venda: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database["public"]

export type Tables<
  TableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends TableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[TableNameOrOptions["schema"]]["Tables"] &
        Database[TableNameOrOptions["schema"]]["Views"])
    : never = never,
> = TableNameOrOptions extends { schema: keyof Database }
  ? (Database[TableNameOrOptions["schema"]]["Tables"] &
      Database[TableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : TableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[TableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  TableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends TableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[TableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = TableNameOrOptions extends { schema: keyof Database }
  ? Database[TableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : TableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][TableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  TableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends TableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[TableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = TableNameOrOptions extends { schema: keyof Database }
  ? Database[TableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : TableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][TableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  EnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends EnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[EnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = EnumNameOrOptions extends { schema: keyof Database }
  ? Database[EnumNameOrOptions["schema"]]["Enums"][EnumName]
  : EnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][EnumNameOrOptions]
    : never
