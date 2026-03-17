export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      bread_prices: {
        Row: {
          bread_type: string
          created_at: string | null
          effective_from: string
          effective_until: string | null
          id: string
          is_active: boolean | null
          price_per_loaf: number
        }
        Insert: {
          bread_type: string
          created_at?: string | null
          effective_from?: string
          effective_until?: string | null
          id?: string
          is_active?: boolean | null
          price_per_loaf: number
        }
        Update: {
          bread_type?: string
          created_at?: string | null
          effective_from?: string
          effective_until?: string | null
          id?: string
          is_active?: boolean | null
          price_per_loaf?: number
        }
        Relationships: []
      }
      daily_credits: {
        Row: {
          applied_amount: number
          created_at: string | null
          credit_amount: number
          credit_date: string
          id: string
          notes: string | null
          remaining_balance: number | null
          updated_at: string | null
        }
        Insert: {
          applied_amount?: number
          created_at?: string | null
          credit_amount?: number
          credit_date: string
          id?: string
          notes?: string | null
          remaining_balance?: number | null
          updated_at?: string | null
        }
        Update: {
          applied_amount?: number
          created_at?: string | null
          credit_amount?: number
          credit_date?: string
          id?: string
          notes?: string | null
          remaining_balance?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      daily_donation_log: {
        Row: {
          created_at: string | null
          donation_id: string
          id: string
          processed_for_summary: boolean | null
          summary_date: string | null
        }
        Insert: {
          created_at?: string | null
          donation_id: string
          id?: string
          processed_for_summary?: boolean | null
          summary_date?: string | null
        }
        Update: {
          created_at?: string | null
          donation_id?: string
          id?: string
          processed_for_summary?: boolean | null
          summary_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_donation_log_donation_id_fkey"
            columns: ["donation_id"]
            isOneToOne: false
            referencedRelation: "donations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_donation_log_donation_id_fkey"
            columns: ["donation_id"]
            isOneToOne: false
            referencedRelation: "donations_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      donations: {
        Row: {
          brown_bread_price_id: string | null
          brown_bread_qty: number
          calculated_brown_bread_qty: number | null
          calculation_notes: string | null
          collected_at: string
          collector_id: string
          created_at: string | null
          deficit_percentage_applied: number | null
          id: string
          photo_url: string
          sales_period_id: string | null
          store_id: string | null
          store_name_manual: string | null
          white_bread_monetary_value: number | null
          white_bread_price_id: string | null
          white_bread_qty: number
        }
        Insert: {
          brown_bread_price_id?: string | null
          brown_bread_qty?: number
          calculated_brown_bread_qty?: number | null
          calculation_notes?: string | null
          collected_at?: string
          collector_id: string
          created_at?: string | null
          deficit_percentage_applied?: number | null
          id?: string
          photo_url: string
          sales_period_id?: string | null
          store_id?: string | null
          store_name_manual?: string | null
          white_bread_monetary_value?: number | null
          white_bread_price_id?: string | null
          white_bread_qty?: number
        }
        Update: {
          brown_bread_price_id?: string | null
          brown_bread_qty?: number
          calculated_brown_bread_qty?: number | null
          calculation_notes?: string | null
          collected_at?: string
          collector_id?: string
          created_at?: string | null
          deficit_percentage_applied?: number | null
          id?: string
          photo_url?: string
          sales_period_id?: string | null
          store_id?: string | null
          store_name_manual?: string | null
          white_bread_monetary_value?: number | null
          white_bread_price_id?: string | null
          white_bread_qty?: number
        }
        Relationships: [
          {
            foreignKeyName: "donations_brown_bread_price_id_fkey"
            columns: ["brown_bread_price_id"]
            isOneToOne: false
            referencedRelation: "bread_prices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_collector_id_fkey"
            columns: ["collector_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_sales_period_id_fkey"
            columns: ["sales_period_id"]
            isOneToOne: false
            referencedRelation: "current_sales_period_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_sales_period_id_fkey"
            columns: ["sales_period_id"]
            isOneToOne: false
            referencedRelation: "sales_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_sales_period_id_fkey"
            columns: ["sales_period_id"]
            isOneToOne: false
            referencedRelation: "zoho_sales_data_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_white_bread_price_id_fkey"
            columns: ["white_bread_price_id"]
            isOneToOne: false
            referencedRelation: "bread_prices"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          employee_id: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          role: string | null
          short_code: string | null
          short_code_created_at: string | null
          short_code_last_used: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          employee_id?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean | null
          role?: string | null
          short_code?: string | null
          short_code_created_at?: string | null
          short_code_last_used?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          employee_id?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          role?: string | null
          short_code?: string | null
          short_code_created_at?: string | null
          short_code_last_used?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sales_periods: {
        Row: {
          created_at: string | null
          created_by: string | null
          end_date: string
          id: string
          notes: string | null
          period_name: string
          required_donation_value: number | null
          start_date: string
          status: string | null
          target_deficit_percentage: number | null
          total_sales_amount: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          end_date: string
          id?: string
          notes?: string | null
          period_name: string
          required_donation_value?: number | null
          start_date: string
          status?: string | null
          target_deficit_percentage?: number | null
          total_sales_amount: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          end_date?: string
          id?: string
          notes?: string | null
          period_name?: string
          required_donation_value?: number | null
          start_date?: string
          status?: string | null
          target_deficit_percentage?: number | null
          total_sales_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_periods_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          address: string | null
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          address?: string | null
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_favorites: {
        Row: {
          created_at: string | null
          id: string
          store_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          store_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          store_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_favorites_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_favorites_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      zoho_sales_data: {
        Row: {
          id: string
          last_updated_at: string
          total_sales_order_quantity: number
        }
        Insert: {
          id?: string
          last_updated_at?: string
          total_sales_order_quantity: number
        }
        Update: {
          id?: string
          last_updated_at?: string
          total_sales_order_quantity?: number
        }
        Relationships: []
      }
    }
    Views: {
      current_bread_prices: {
        Row: {
          bread_type: string | null
          effective_from: string | null
          effective_until: string | null
          price_per_loaf: number | null
        }
        Insert: {
          bread_type?: string | null
          effective_from?: string | null
          effective_until?: string | null
          price_per_loaf?: number | null
        }
        Update: {
          bread_type?: string | null
          effective_from?: string | null
          effective_until?: string | null
          price_per_loaf?: number | null
        }
        Relationships: []
      }
      current_sales_period_analytics: {
        Row: {
          actual_donation_value: number | null
          created_at: string | null
          created_by: string | null
          daily_target_remaining: number | null
          days_remaining: number | null
          end_date: string | null
          id: string | null
          notes: string | null
          period_name: string | null
          progress_percentage: number | null
          remaining_deficit_value: number | null
          required_donation_value: number | null
          start_date: string | null
          status: string | null
          target_deficit_percentage: number | null
          total_brown_bread: number | null
          total_donations: number | null
          total_sales_amount: number | null
          total_white_bread: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_periods_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_donation_progress: {
        Row: {
          daily_brown_bread: number | null
          daily_donations: number | null
          daily_value: number | null
          daily_white_bread: number | null
          donation_date: string | null
          period_name: string | null
          running_total_value: number | null
        }
        Relationships: []
      }
      donations_with_details: {
        Row: {
          brown_bread_price_id: string | null
          brown_bread_price_used: number | null
          brown_bread_qty: number | null
          calculated_brown_bread_qty: number | null
          calculation_notes: string | null
          collected_at: string | null
          collector_email: string | null
          collector_id: string | null
          collector_name: string | null
          collector_role: string | null
          created_at: string | null
          deficit_percentage_applied: number | null
          id: string | null
          photo_url: string | null
          sales_period_id: string | null
          store_address: string | null
          store_id: string | null
          store_name: string | null
          store_name_manual: string | null
          total_brown_bread_value: number | null
          total_donation_value: number | null
          total_white_bread_value: number | null
          white_bread_monetary_value: number | null
          white_bread_price_id: string | null
          white_bread_price_used: number | null
          white_bread_qty: number | null
        }
        Relationships: [
          {
            foreignKeyName: "donations_brown_bread_price_id_fkey"
            columns: ["brown_bread_price_id"]
            isOneToOne: false
            referencedRelation: "bread_prices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_collector_id_fkey"
            columns: ["collector_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_sales_period_id_fkey"
            columns: ["sales_period_id"]
            isOneToOne: false
            referencedRelation: "current_sales_period_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_sales_period_id_fkey"
            columns: ["sales_period_id"]
            isOneToOne: false
            referencedRelation: "sales_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_sales_period_id_fkey"
            columns: ["sales_period_id"]
            isOneToOne: false
            referencedRelation: "zoho_sales_data_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_white_bread_price_id_fkey"
            columns: ["white_bread_price_id"]
            isOneToOne: false
            referencedRelation: "bread_prices"
            referencedColumns: ["id"]
          },
        ]
      }
      stores_summary: {
        Row: {
          address: string | null
          id: string | null
          last_donation_date: string | null
          name: string | null
          total_brown_bread: number | null
          total_donations: number | null
          total_value: number | null
          total_white_bread: number | null
        }
        Relationships: []
      }
      zoho_sales_data_compat: {
        Row: {
          id: string | null
          last_updated_at: string | null
          total_sales_order_quantity: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_daily_credit: {
        Args: {
          credit_date: string
          credit_amount: number
          credit_notes?: string
        }
        Returns: string
      }
      apply_daily_credits: {
        Args: { amount_to_apply: number }
        Returns: number
      }
      calculate_brown_bread_equivalent: {
        Args: { white_bread_value: number; deficit_percentage?: number }
        Returns: number
      }
      create_sales_period: {
        Args: {
          p_period_name: string
          p_start_date: string
          p_end_date: string
          p_total_sales_amount: number
          p_target_percentage?: number
          p_notes?: string
        }
        Returns: string
      }
      extract_date_immutable: {
        Args: { timestamptz_val: string }
        Returns: string
      }
      generate_meaningful_short_code: {
        Args: { user_name: string; user_email: string; company_name?: string }
        Returns: string
      }
      generate_short_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_bread_price: {
        Args: { bread_type_param: string }
        Returns: number
      }
      get_current_credit_balance: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_current_sales_period: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string | null
          created_by: string | null
          end_date: string
          id: string
          notes: string | null
          period_name: string
          required_donation_value: number | null
          start_date: string
          status: string | null
          target_deficit_percentage: number | null
          total_sales_amount: number
          updated_at: string | null
        }
      }
      get_next_day_credit_projection_details: {
        Args: Record<PropertyKey, never>
        Returns: {
          current_balance: number
          avg_daily_generation: number
          avg_daily_application: number
          projected_balance: number
          projection_confidence: string
        }[]
      }
      get_next_day_projected_credit_balance: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      refresh_user_short_code: {
        Args: { user_email: string }
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
