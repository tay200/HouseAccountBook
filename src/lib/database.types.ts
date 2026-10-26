export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      bank_accounts: {
        Row: {
          account_number: string | null
          balance: number
          bank: string | null
          created_at: string
          id: string
          kind: string | null
          member_id: string | null
          memo: string | null
          name: string
          opened_on: string | null
          purpose: string | null
          term: string
          user_id: string
        }
        Insert: {
          account_number?: string | null
          balance?: number
          bank?: string | null
          created_at?: string
          id?: string
          kind?: string | null
          member_id?: string | null
          memo?: string | null
          name: string
          opened_on?: string | null
          purpose?: string | null
          term?: string
          user_id?: string
        }
        Update: {
          account_number?: string | null
          balance?: number
          bank?: string | null
          created_at?: string
          id?: string
          kind?: string | null
          member_id?: string | null
          memo?: string | null
          name?: string
          opened_on?: string | null
          purpose?: string | null
          term?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          amount: number
          category_id: string
          created_at: string
          id: string
          month: string
          user_id: string
        }
        Insert: {
          amount: number
          category_id: string
          created_at?: string
          id?: string
          month: string
          user_id?: string
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string
          id?: string
          month?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          parent_id: string | null
          rollover: boolean
          type: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          rollover?: boolean
          type: string
          user_id?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          rollover?: boolean
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      deposits: {
        Row: {
          bank: string | null
          created_at: string
          id: string
          maturity_date: string
          member_id: string | null
          memo: string | null
          name: string
          principal: number
          rate: number
          start_date: string
          tax_rate: number
          user_id: string
        }
        Insert: {
          bank?: string | null
          created_at?: string
          id?: string
          maturity_date: string
          member_id?: string | null
          memo?: string | null
          name: string
          principal: number
          rate?: number
          start_date: string
          tax_rate?: number
          user_id?: string
        }
        Update: {
          bank?: string | null
          created_at?: string
          id?: string
          maturity_date?: string
          member_id?: string | null
          memo?: string | null
          name?: string
          principal?: number
          rate?: number
          start_date?: string
          tax_rate?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deposits_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          id: string
          monthly_saving_target: number
          saving_rate_target: number
          user_id: string
          year: number
        }
        Insert: {
          id?: string
          monthly_saving_target?: number
          saving_rate_target?: number
          user_id?: string
          year: number
        }
        Update: {
          id?: string
          monthly_saving_target?: number
          saving_rate_target?: number
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      installment_savings: {
        Row: {
          bank: string | null
          created_at: string
          id: string
          maturity_date: string
          member_id: string | null
          memo: string | null
          method: string
          monthly_amount: number
          name: string
          rate: number
          start_date: string
          tax_rate: number
          user_id: string
        }
        Insert: {
          bank?: string | null
          created_at?: string
          id?: string
          maturity_date: string
          member_id?: string | null
          memo?: string | null
          method?: string
          monthly_amount: number
          name: string
          rate?: number
          start_date: string
          tax_rate?: number
          user_id?: string
        }
        Update: {
          bank?: string | null
          created_at?: string
          id?: string
          maturity_date?: string
          member_id?: string | null
          memo?: string | null
          method?: string
          monthly_amount?: number
          name?: string
          rate?: number
          start_date?: string
          tax_rate?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "installment_savings_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      invest_accounts: {
        Row: {
          created_at: string
          id: string
          included: boolean
          member_id: string | null
          memo: string | null
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          included?: boolean
          member_id?: string | null
          memo?: string | null
          name: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          included?: boolean
          member_id?: string | null
          memo?: string | null
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invest_accounts_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      invest_incomes: {
        Row: {
          account_id: string
          amount: number
          created_at: string
          id: string
          income_date: string
          kind: string
          market: string
          memo: string | null
          stock_code: string | null
          stock_name: string
          user_id: string
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string
          id?: string
          income_date: string
          kind: string
          market?: string
          memo?: string | null
          stock_code?: string | null
          stock_name: string
          user_id?: string
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string
          id?: string
          income_date?: string
          kind?: string
          market?: string
          memo?: string | null
          stock_code?: string | null
          stock_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invest_incomes_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "invest_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_entries: {
        Row: {
          amount: number
          book: string
          created_at: string
          date: string
          direction: string
          id: string
          member_id: string | null
          memo: string | null
          user_id: string
        }
        Insert: {
          amount: number
          book: string
          created_at?: string
          date: string
          direction: string
          id?: string
          member_id?: string | null
          memo?: string | null
          user_id?: string
        }
        Update: {
          amount?: number
          book?: string
          created_at?: string
          date?: string
          direction?: string
          id?: string
          member_id?: string | null
          memo?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          created_at: string
          id: string
          lender: string | null
          maturity_date: string
          memo: string | null
          method: string
          name: string
          principal: number
          rate: number
          start_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lender?: string | null
          maturity_date: string
          memo?: string | null
          method?: string
          name: string
          principal: number
          rate?: number
          start_date: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          lender?: string | null
          maturity_date?: string
          memo?: string | null
          method?: string
          name?: string
          principal?: number
          rate?: number
          start_date?: string
          user_id?: string
        }
        Relationships: []
      }
      members: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      monthly_snapshots: {
        Row: {
          debt: number
          financial: number
          id: string
          invest_accounts: Json
          invest_cost: number
          invest_realized: number
          invest_value: number
          month: string
          net_worth: number
          real_assets: number
          saved_at: string
          user_id: string
        }
        Insert: {
          debt: number
          financial: number
          id?: string
          invest_accounts?: Json
          invest_cost: number
          invest_realized: number
          invest_value: number
          month: string
          net_worth: number
          real_assets: number
          saved_at?: string
          user_id?: string
        }
        Update: {
          debt?: number
          financial?: number
          id?: string
          invest_accounts?: Json
          invest_cost?: number
          invest_realized?: number
          invest_value?: number
          month?: string
          net_worth?: number
          real_assets?: number
          saved_at?: string
          user_id?: string
        }
        Relationships: []
      }
      net_worth_snapshots: {
        Row: {
          amount: number
          id: string
          memo: string | null
          user_id: string
          year: number
        }
        Insert: {
          amount: number
          id?: string
          memo?: string | null
          user_id?: string
          year: number
        }
        Update: {
          amount?: number
          id?: string
          memo?: string | null
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          created_at: string
          id: string
          kind: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          name: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      real_assets: {
        Row: {
          amount: number
          created_at: string
          id: string
          memo: string | null
          name: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          memo?: string | null
          name: string
          user_id?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          memo?: string | null
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      recurring_rules: {
        Row: {
          active: boolean
          amount: number
          category_id: string | null
          created_at: string
          day: number
          end_month: string | null
          id: string
          kind: string
          member_id: string | null
          memo: string
          payment_method_id: string | null
          start_month: string
          type: string
          user_id: string
        }
        Insert: {
          active?: boolean
          amount: number
          category_id?: string | null
          created_at?: string
          day?: number
          end_month?: string | null
          id?: string
          kind: string
          member_id?: string | null
          memo: string
          payment_method_id?: string | null
          start_month: string
          type: string
          user_id?: string
        }
        Update: {
          active?: boolean
          amount?: number
          category_id?: string | null
          created_at?: string
          day?: number
          end_month?: string | null
          id?: string
          kind?: string
          member_id?: string | null
          memo?: string
          payment_method_id?: string | null
          start_month?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_rules_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_rules_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      saving_goals: {
        Row: {
          bank_account_id: string | null
          book: string | null
          created_at: string
          due_month: string
          id: string
          kind: string
          memo: string | null
          name: string
          repeat_yearly: boolean
          saved_amount: number
          source: string
          start_month: string
          target_amount: number
          user_id: string
        }
        Insert: {
          bank_account_id?: string | null
          book?: string | null
          created_at?: string
          due_month: string
          id?: string
          kind?: string
          memo?: string | null
          name: string
          repeat_yearly?: boolean
          saved_amount?: number
          source?: string
          start_month: string
          target_amount: number
          user_id?: string
        }
        Update: {
          bank_account_id?: string | null
          book?: string | null
          created_at?: string
          due_month?: string
          id?: string
          kind?: string
          memo?: string | null
          name?: string
          repeat_yearly?: boolean
          saved_amount?: number
          source?: string
          start_month?: string
          target_amount?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saving_goals_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      schema_migrations: {
        Row: {
          applied_at: string
          version: string
        }
        Insert: {
          applied_at?: string
          version: string
        }
        Update: {
          applied_at?: string
          version?: string
        }
        Relationships: []
      }
      shares: {
        Row: {
          created_at: string
          member_id: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          member_id: string
          owner_id: string
        }
        Update: {
          created_at?: string
          member_id?: string
          owner_id?: string
        }
        Relationships: []
      }
      stock_holdings: {
        Row: {
          account_id: string
          avg_fx_rate: number | null
          avg_price: number
          created_at: string
          id: string
          market: string
          memo: string | null
          quantity: number
          stock_code: string
          stock_name: string
          user_id: string
        }
        Insert: {
          account_id: string
          avg_fx_rate?: number | null
          avg_price: number
          created_at?: string
          id?: string
          market?: string
          memo?: string | null
          quantity: number
          stock_code: string
          stock_name: string
          user_id?: string
        }
        Update: {
          account_id?: string
          avg_fx_rate?: number | null
          avg_price?: number
          created_at?: string
          id?: string
          market?: string
          memo?: string | null
          quantity?: number
          stock_code?: string
          stock_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_holdings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "invest_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_prices: {
        Row: {
          price: number
          stock_code: string
          updated_at: string
          user_id: string
        }
        Insert: {
          price: number
          stock_code: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          price?: number
          stock_code?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stock_trades: {
        Row: {
          account_id: string
          created_at: string
          fee: number
          fx_rate: number | null
          id: string
          market: string
          memo: string | null
          price: number
          quantity: number
          side: string
          stock_code: string
          stock_name: string
          trade_date: string | null
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          fee?: number
          fx_rate?: number | null
          id?: string
          market?: string
          memo?: string | null
          price: number
          quantity: number
          side: string
          stock_code: string
          stock_name: string
          trade_date?: string | null
          user_id?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          fee?: number
          fx_rate?: number | null
          id?: string
          market?: string
          memo?: string | null
          price?: number
          quantity?: number
          side?: string
          stock_code?: string
          stock_name?: string
          trade_date?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_trades_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "invest_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      trades: {
        Row: {
          account_id: string
          buy_date: string | null
          buy_fx_rate: number | null
          buy_price: number
          created_at: string
          fee: number
          id: string
          market: string
          memo: string | null
          quantity: number
          sell_date: string | null
          sell_fx_rate: number | null
          sell_price: number | null
          stock_code: string
          stock_name: string
          user_id: string
        }
        Insert: {
          account_id: string
          buy_date?: string | null
          buy_fx_rate?: number | null
          buy_price: number
          created_at?: string
          fee?: number
          id?: string
          market?: string
          memo?: string | null
          quantity: number
          sell_date?: string | null
          sell_fx_rate?: number | null
          sell_price?: number | null
          stock_code: string
          stock_name: string
          user_id?: string
        }
        Update: {
          account_id?: string
          buy_date?: string | null
          buy_fx_rate?: number | null
          buy_price?: number
          created_at?: string
          fee?: number
          id?: string
          market?: string
          memo?: string | null
          quantity?: number
          sell_date?: string | null
          sell_fx_rate?: number | null
          sell_price?: number | null
          stock_code?: string
          stock_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trades_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "invest_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          date: string
          discount: number
          id: string
          kind: string
          member_id: string | null
          memo: string | null
          payment_method_id: string | null
          recurring_id: string | null
          tags: string[]
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          date: string
          discount?: number
          id?: string
          kind: string
          member_id?: string | null
          memo?: string | null
          payment_method_id?: string | null
          recurring_id?: string | null
          tags?: string[]
          type: string
          user_id?: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          date?: string
          discount?: number
          id?: string
          kind?: string
          member_id?: string | null
          memo?: string | null
          payment_method_id?: string | null
          recurring_id?: string | null
          tags?: string[]
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_recurring_id_fkey"
            columns: ["recurring_id"]
            isOneToOne: false
            referencedRelation: "recurring_rules"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      my_owner_id: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
