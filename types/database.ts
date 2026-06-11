// Supabase database types.
// In a real project these are generated via:
//   supabase gen types typescript --local > types/database.ts
// They are hand-written here to match supabase/migrations exactly so the app
// is fully typed without a running database.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Role = 'owner' | 'manager' | 'staff'

export type MovementType =
  | 'delivery'
  | 'count'
  | 'waste'
  | 'adjustment'
  | 'sale'
  | 'production_input'
  | 'production_output'
  | 'expiry_writeoff'
  | 'transfer'

export type BatchStatus = 'active' | 'depleted' | 'expired' | 'written_off'

export type TenantStatus =
  | 'active'
  | 'trial'
  | 'suspended'
  | 'churned'
  | 'deleted'

// plan_tier is a text FK → public.plans(key). These are the seeded defaults;
// admins may add more plans, so the column type stays `string`.
export type PlanKey = 'trial' | 'normal'

export type PaymentMethod = 'bank_transfer' | 'cash' | 'other'

export type InvitationStatus = 'unused' | 'redeemed' | 'revoked' | 'expired'

export type NotificationType =
  | 'new_signup'
  | 'trial_expiring'
  | 'onboarding_stuck'
  | 'no_login'
  | 'payment_overdue'
  | 'plan_upgraded'

export type AdminRole = 'super' | 'readonly'

export type FeatureKey =
  | 'ingredient_library'
  | 'bulk_import'
  | 'batch_expiry'
  | 'onboarding_screen'
  | 'report_food_cost'
  | 'report_inventory_value'
  | 'multi_location'

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          name: string
          slug: string
          currency: string
          locale: string
          status: TenantStatus
          plan_tier: string
          trial_started_at: string | null
          trial_ends_at: string | null
          last_active_at: string | null
          suspended_at: string | null
          churned_at: string | null
          deleted_at: string | null
          count_cycle_days: number
          business_type: string | null
          onboarding_dismissed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          currency?: string
          locale?: string
          status?: TenantStatus
          plan_tier?: string
          trial_started_at?: string | null
          trial_ends_at?: string | null
          last_active_at?: string | null
          suspended_at?: string | null
          churned_at?: string | null
          deleted_at?: string | null
          count_cycle_days?: number
          business_type?: string | null
          onboarding_dismissed_at?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['tenants']['Insert']>
        Relationships: []
      }
      daily_sales: {
        Row: {
          id: string
          tenant_id: string
          sale_date: string
          total_amount: number
          revenue_source: 'manual' | 'items'
          status: 'draft' | 'confirmed'
          confirmed_at: string | null
          confirmed_by: string | null
          note: string | null
          recorded_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          sale_date: string
          total_amount?: number
          revenue_source?: 'manual' | 'items'
          status?: 'draft' | 'confirmed'
          confirmed_at?: string | null
          confirmed_by?: string | null
          note?: string | null
          recorded_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['daily_sales']['Insert']>
        Relationships: []
      }
      daily_sales_items: {
        Row: {
          id: string
          tenant_id: string
          daily_sales_id: string
          recipe_id: string
          quantity: number
          unit_price: number
          is_comp: boolean
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          daily_sales_id: string
          recipe_id: string
          quantity: number
          unit_price?: number
          is_comp?: boolean
          created_at?: string
        }
        Update: Partial<
          Database['public']['Tables']['daily_sales_items']['Insert']
        >
        Relationships: []
      }
      daily_sales_theoretical_usage: {
        Row: {
          id: string
          tenant_id: string
          daily_sales_id: string
          ingredient_id: string
          quantity: number
          unit_cost: number
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          daily_sales_id: string
          ingredient_id: string
          quantity: number
          unit_cost?: number
          created_at?: string
        }
        Update: Partial<
          Database['public']['Tables']['daily_sales_theoretical_usage']['Insert']
        >
        Relationships: []
      }
      ingredient_unit_conversions: {
        Row: {
          id: string
          tenant_id: string
          ingredient_id: string
          unit: string
          factor_to_base: number
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          ingredient_id: string
          unit: string
          factor_to_base: number
          created_at?: string
        }
        Update: Partial<
          Database['public']['Tables']['ingredient_unit_conversions']['Insert']
        >
        Relationships: []
      }
      count_periods: {
        Row: {
          id: string
          tenant_id: string
          period_start: string
          period_end: string
          days_in_period: number
          counted_at: string
          recorded_by: string | null
          missing_sales_dates: string[]
          has_missing_sales: boolean
          regeneration_count: number
          report_data: Json | null
          report_generated_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          period_start: string
          period_end: string
          days_in_period?: number
          counted_at?: string
          recorded_by?: string | null
          missing_sales_dates?: string[]
          has_missing_sales?: boolean
          regeneration_count?: number
          report_data?: Json | null
          report_generated_at?: string | null
          created_at?: string
        }
        Update: Partial<
          Database['public']['Tables']['count_periods']['Insert']
        >
        Relationships: []
      }
      blog_posts: {
        Row: {
          id: string
          slug: string
          title_az: string
          title_ru: string | null
          excerpt_az: string | null
          excerpt_ru: string | null
          body_az: string
          body_ru: string | null
          cover_url: string | null
          tag: string | null
          status: 'draft' | 'published'
          published_at: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          title_az: string
          title_ru?: string | null
          excerpt_az?: string | null
          excerpt_ru?: string | null
          body_az: string
          body_ru?: string | null
          cover_url?: string | null
          tag?: string | null
          status?: 'draft' | 'published'
          published_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['blog_posts']['Insert']>
        Relationships: []
      }
      tenant_members: {
        Row: {
          id: string
          tenant_id: string
          user_id: string
          role: Role
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          user_id: string
          role: Role
          created_at?: string
        }
        Update: Partial<
          Database['public']['Tables']['tenant_members']['Insert']
        >
        Relationships: []
      }
      suppliers: {
        Row: {
          id: string
          tenant_id: string
          name: string
          phone: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          phone?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['suppliers']['Insert']>
        Relationships: []
      }
      ingredients: {
        Row: {
          id: string
          tenant_id: string
          name: string
          name_az: string | null
          name_ru: string | null
          unit: string
          cost_per_unit: number
          yield_percent: number
          supplier_id: string | null
          low_stock_threshold: number | null
          par_level: number | null
          is_produced: boolean
          default_shelf_life_days: number | null
          storage_location: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          name_az?: string | null
          name_ru?: string | null
          unit: string
          cost_per_unit?: number
          yield_percent?: number
          supplier_id?: string | null
          low_stock_threshold?: number | null
          par_level?: number | null
          is_produced?: boolean
          default_shelf_life_days?: number | null
          storage_location?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<
          Database['public']['Tables']['ingredients']['Insert']
        >
        Relationships: []
      }
      recipes: {
        Row: {
          id: string
          tenant_id: string
          name: string
          name_az: string | null
          name_ru: string | null
          is_sub_recipe: boolean
          serving_size: number | null
          serving_unit: string | null
          sale_price: number | null
          yield_percent: number | null
          consumption_location_id: string | null
          category_id: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          name_az?: string | null
          name_ru?: string | null
          is_sub_recipe?: boolean
          serving_size?: number | null
          serving_unit?: string | null
          sale_price?: number | null
          yield_percent?: number | null
          consumption_location_id?: string | null
          category_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['recipes']['Insert']>
        Relationships: []
      }
      recipe_categories: {
        Row: {
          id: string
          tenant_id: string
          name: string
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          sort_order?: number
          created_at?: string
        }
        Update: Partial<
          Database['public']['Tables']['recipe_categories']['Insert']
        >
        Relationships: []
      }
      recipe_ingredients: {
        Row: {
          id: string
          recipe_id: string
          ingredient_id: string | null
          sub_recipe_id: string | null
          quantity: number
          unit: string
          yield_override: number | null
        }
        Insert: {
          id?: string
          recipe_id: string
          ingredient_id?: string | null
          sub_recipe_id?: string | null
          quantity: number
          unit: string
          yield_override?: number | null
        }
        Update: Partial<
          Database['public']['Tables']['recipe_ingredients']['Insert']
        >
        Relationships: []
      }
      stock_movements: {
        Row: {
          id: string
          tenant_id: string
          ingredient_id: string
          movement_type: MovementType
          quantity: number
          is_absolute: boolean
          unit_cost: number | null
          supplier_id: string | null
          reason: string | null
          notes: string | null
          recorded_by: string | null
          batch_id: string | null
          expiry_date: string | null
          waste_category_id: string | null
          reverses_movement_id: string | null
          daily_sales_id: string | null
          from_location_id: string | null
          to_location_id: string | null
          production_run_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          ingredient_id: string
          movement_type: MovementType
          quantity: number
          is_absolute?: boolean
          unit_cost?: number | null
          supplier_id?: string | null
          reason?: string | null
          notes?: string | null
          recorded_by?: string | null
          batch_id?: string | null
          expiry_date?: string | null
          waste_category_id?: string | null
          reverses_movement_id?: string | null
          daily_sales_id?: string | null
          from_location_id?: string | null
          to_location_id?: string | null
          production_run_id?: string | null
          created_at?: string
        }
        // Append-only by domain rule (enforced via RLS — no update policy).
        // The type stays a valid object so the typed client resolves; app code
        // simply never issues updates against this table.
        Update: Partial<
          Database['public']['Tables']['stock_movements']['Insert']
        >
        Relationships: []
      }
      waste_categories: {
        Row: {
          id: string
          tenant_id: string
          name: string
          name_az: string | null
          name_ru: string | null
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          name_az?: string | null
          name_ru?: string | null
        }
        Update: Partial<
          Database['public']['Tables']['waste_categories']['Insert']
        >
        Relationships: []
      }
      storage_locations: {
        Row: {
          id: string
          tenant_id: string
          name: string
          is_default_receiving: boolean
          is_frozen: boolean
          kind: string | null
          is_consumption_point: boolean
          is_default_consumption: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          is_default_receiving?: boolean
          is_frozen?: boolean
          kind?: string | null
          is_consumption_point?: boolean
          is_default_consumption?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: Partial<
          Database['public']['Tables']['storage_locations']['Insert']
        >
        Relationships: []
      }
      ingredient_batches: {
        Row: {
          id: string
          tenant_id: string
          ingredient_id: string
          supplier_id: string | null
          quantity_received: number
          quantity_remaining: number
          unit: string
          unit_cost: number
          received_date: string
          expiry_date: string | null
          status: BatchStatus
          created_from_movement_id: string | null
          batch_code: string | null
          supplier_lot_no: string | null
          location_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          ingredient_id: string
          supplier_id?: string | null
          quantity_received: number
          quantity_remaining: number
          unit: string
          unit_cost: number
          received_date?: string
          expiry_date?: string | null
          status?: BatchStatus
          created_from_movement_id?: string | null
          batch_code?: string | null
          supplier_lot_no?: string | null
          location_id?: string | null
          created_at?: string
        }
        Update: Partial<
          Database['public']['Tables']['ingredient_batches']['Insert']
        >
        Relationships: []
      }
      production_runs: {
        Row: {
          id: string
          tenant_id: string
          output_ingredient_id: string
          output_quantity: number
          output_unit: string
          output_batch_expiry: string | null
          output_unit_cost: number | null
          theoretical_yield_percent: number | null
          actual_yield_percent: number | null
          recipe_id: string | null
          produced_by: string | null
          storage_location: string | null
          notes: string | null
          produced_at: string
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          output_ingredient_id: string
          output_quantity: number
          output_unit: string
          output_batch_expiry?: string | null
          output_unit_cost?: number | null
          theoretical_yield_percent?: number | null
          actual_yield_percent?: number | null
          recipe_id?: string | null
          produced_by?: string | null
          storage_location?: string | null
          notes?: string | null
          produced_at?: string
          created_at?: string
        }
        Update: Partial<
          Database['public']['Tables']['production_runs']['Insert']
        >
        Relationships: []
      }
      production_run_inputs: {
        Row: {
          id: string
          production_run_id: string
          ingredient_id: string
          quantity_used: number
          unit: string
          source_batch_id: string | null
          unit_cost_at_time: number
        }
        Insert: {
          id?: string
          production_run_id: string
          ingredient_id: string
          quantity_used: number
          unit: string
          source_batch_id?: string | null
          unit_cost_at_time: number
        }
        Update: Partial<
          Database['public']['Tables']['production_run_inputs']['Insert']
        >
        Relationships: []
      }
      demo_requests: {
        Row: {
          id: string
          name: string
          restaurant_name: string | null
          email: string
          message: string | null
          status: 'new' | 'contacted' | 'sent' | 'closed'
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          restaurant_name?: string | null
          email: string
          message?: string | null
          status?: 'new' | 'contacted' | 'sent' | 'closed'
          created_at?: string
        }
        Update: Partial<
          Database['public']['Tables']['demo_requests']['Insert']
        >
        Relationships: []
      }
      platform_admins: {
        Row: { user_id: string; role: AdminRole; created_at: string }
        Insert: { user_id: string; role?: AdminRole; created_at?: string }
        Update: Partial<
          Database['public']['Tables']['platform_admins']['Insert']
        >
        Relationships: []
      }
      global_ingredient_library: {
        Row: {
          id: string
          name_az: string
          name_ru: string | null
          category: string
          default_unit: string
          default_yield_percent: number | null
          sort_order: number | null
          is_common: boolean
        }
        Insert: {
          id?: string
          name_az: string
          name_ru?: string | null
          category: string
          default_unit: string
          default_yield_percent?: number | null
          sort_order?: number | null
          is_common?: boolean
        }
        Update: Partial<
          Database['public']['Tables']['global_ingredient_library']['Insert']
        >
        Relationships: []
      }
      plans: {
        Row: {
          key: string
          name_az: string
          name_ru: string
          description_az: string | null
          description_ru: string | null
          monthly_price: number
          currency: string
          is_trial: boolean
          is_active: boolean
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          key: string
          name_az: string
          name_ru: string
          description_az?: string | null
          description_ru?: string | null
          monthly_price?: number
          currency?: string
          is_trial?: boolean
          is_active?: boolean
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: Partial<Database['public']['Tables']['plans']['Insert']>
        Relationships: []
      }
      features: {
        Row: {
          key: string
          name_az: string
          name_ru: string
          description_az: string | null
          description_ru: string | null
          category: string | null
          global_enabled: boolean
          sort_order: number
        }
        Insert: {
          key: string
          name_az: string
          name_ru: string
          description_az?: string | null
          description_ru?: string | null
          category?: string | null
          global_enabled?: boolean
          sort_order?: number
        }
        Update: Partial<Database['public']['Tables']['features']['Insert']>
        Relationships: []
      }
      plan_features: {
        Row: { plan_key: string; feature_key: string; included: boolean }
        Insert: { plan_key: string; feature_key: string; included?: boolean }
        Update: Partial<
          Database['public']['Tables']['plan_features']['Insert']
        >
        Relationships: []
      }
      tenant_feature_overrides: {
        Row: {
          feature_key: string
          tenant_id: string
          enabled: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          feature_key: string
          tenant_id: string
          enabled: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: Partial<
          Database['public']['Tables']['tenant_feature_overrides']['Insert']
        >
        Relationships: []
      }
      activity_events: {
        Row: {
          id: string
          tenant_id: string
          user_id: string | null
          type: string
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          user_id?: string | null
          type: string
          metadata?: Json
          created_at?: string
        }
        Update: Partial<
          Database['public']['Tables']['activity_events']['Insert']
        >
        Relationships: []
      }
      manual_payments: {
        Row: {
          id: string
          tenant_id: string
          amount: number
          currency: string
          method: PaymentMethod
          plan_key: string | null
          reference: string | null
          period_start: string | null
          period_end: string | null
          paid_at: string
          note: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          amount: number
          currency?: string
          method?: PaymentMethod
          plan_key?: string | null
          reference?: string | null
          period_start?: string | null
          period_end?: string | null
          paid_at?: string
          note?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: Partial<
          Database['public']['Tables']['manual_payments']['Insert']
        >
        Relationships: []
      }
      invitations: {
        Row: {
          id: string
          code: string
          email: string | null
          plan_key: string
          status: InvitationStatus
          tenant_id: string | null
          expires_at: string | null
          redeemed_at: string | null
          note: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          email?: string | null
          plan_key?: string
          status?: InvitationStatus
          tenant_id?: string | null
          expires_at?: string | null
          redeemed_at?: string | null
          note?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['invitations']['Insert']>
        Relationships: []
      }
      admin_notes: {
        Row: {
          id: string
          tenant_id: string
          body: string
          author_id: string | null
          author_email: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          body: string
          author_id?: string | null
          author_email?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['admin_notes']['Insert']>
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          id: string
          actor_id: string | null
          actor_email: string | null
          action: string
          target_tenant_id: string | null
          details: Json
          created_at: string
        }
        Insert: {
          id?: string
          actor_id?: string | null
          actor_email?: string | null
          action: string
          target_tenant_id?: string | null
          details?: Json
          created_at?: string
        }
        Update: Partial<
          Database['public']['Tables']['admin_audit_log']['Insert']
        >
        Relationships: []
      }
      admin_notifications: {
        Row: {
          id: string
          type: NotificationType
          tenant_id: string | null
          title: string
          body: string | null
          dedupe_key: string
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          type: NotificationType
          tenant_id?: string | null
          title: string
          body?: string | null
          dedupe_key: string
          read_at?: string | null
          created_at?: string
        }
        Update: Partial<
          Database['public']['Tables']['admin_notifications']['Insert']
        >
        Relationships: []
      }
    }
    Views: Record<never, never>
    Functions: {
      delete_tenant_cascade: {
        Args: {
          p_tenant: string
        }
        Returns: undefined
      }
      current_tenant_id: {
        Args: Record<string, never>
        Returns: string
      }
      current_user_role: {
        Args: Record<string, never>
        Returns: string
      }
      is_platform_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      confirm_daily_sales: {
        Args: { p_day_id: string; p_usage: Json }
        Returns: undefined
      }
      void_daily_sales: {
        Args: { p_day_id: string }
        Returns: undefined
      }
      transfer_stock: {
        Args: {
          p_ingredient_id: string
          p_from_location_id: string
          p_to_location_id: string
          p_quantity: number
          p_expiry_date?: string | null
        }
        Returns: undefined
      }
      record_waste: {
        Args: {
          p_ingredient_id: string
          p_quantity: number
          p_category_id: string
          p_unit_cost: number
          p_reason: string | null
          p_notes: string | null
          p_occurred_at?: string | null
        }
        Returns: undefined
      }
      reverse_waste: {
        Args: { p_movement_id: string }
        Returns: undefined
      }
      execute_production_run: {
        Args: {
          p_output_ingredient_id: string
          p_output_quantity: number
          p_expiry: string | null
          p_recipe_id: string | null
          p_notes: string | null
          p_inputs: Json
        }
        Returns: string
      }
      void_production_run: {
        Args: { p_run_id: string }
        Returns: undefined
      }
      write_off_expired: {
        Args: { p_tenant: string }
        Returns: number
      }
      submit_demo_request: {
        Args: {
          p_name: string
          p_restaurant: string
          p_email: string
          p_message: string
        }
        Returns: undefined
      }
      is_super_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      plan_rank: {
        Args: { p_key: string }
        Returns: number
      }
      tenant_has_feature: {
        Args: { p_tenant: string; p_feature: string }
        Returns: boolean
      }
      tenant_entitlements: {
        Args: { p_tenant: string }
        Returns: { feature_key: string; enabled: boolean }[]
      }
      log_activity: {
        Args: {
          p_tenant: string
          p_user: string | null
          p_type: string
          p_meta?: Json
        }
        Returns: undefined
      }
      admin_tenant_metrics: {
        Args: { p_ids: string[] }
        Returns: {
          tenant_id: string
          login_days_last_14: number
          has_recipes: boolean
          stock_count_last_7_days: number
          delivery_logged_last_30_days: boolean
          waste_logged_last_30_days: boolean
          report_viewed_last_30_days: boolean
          recipe_count: number
          ingredient_count: number
          stock_counts_last_28_days: number
          payment_status: string
        }[]
      }
      admin_onboarding_progress: {
        Args: { p_ids: string[] }
        Returns: {
          tenant_id: string
          created_at: string
          first_ingredient_at: string | null
          tenth_ingredient_at: string | null
          first_recipe_at: string | null
          first_count_at: string | null
          first_delivery_at: string | null
          first_waste_at: string | null
          first_report_at: string | null
          login_dates: string[] | null
          first_payment_at: string | null
          status: TenantStatus
        }[]
      }
    }
    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
}

// Convenience row aliases used across the app.
export type Tenant = Database['public']['Tables']['tenants']['Row']
export type TenantMember =
  Database['public']['Tables']['tenant_members']['Row']
export type Supplier = Database['public']['Tables']['suppliers']['Row']
export type StorageLocation =
  Database['public']['Tables']['storage_locations']['Row']
export type Ingredient = Database['public']['Tables']['ingredients']['Row']
export type Recipe = Database['public']['Tables']['recipes']['Row']
export type RecipeCategory =
  Database['public']['Tables']['recipe_categories']['Row']
export type RecipeIngredient =
  Database['public']['Tables']['recipe_ingredients']['Row']
export type StockMovement =
  Database['public']['Tables']['stock_movements']['Row']
export type WasteCategory =
  Database['public']['Tables']['waste_categories']['Row']
export type IngredientBatchRow =
  Database['public']['Tables']['ingredient_batches']['Row']
export type ProductionRunRow =
  Database['public']['Tables']['production_runs']['Row']
export type ProductionRunInputRow =
  Database['public']['Tables']['production_run_inputs']['Row']
export type DemoRequest =
  Database['public']['Tables']['demo_requests']['Row']
export type DemoRequestStatus = DemoRequest['status']
export type GlobalIngredient =
  Database['public']['Tables']['global_ingredient_library']['Row']
export type DailySale = Database['public']['Tables']['daily_sales']['Row']
export type DailySaleItem =
  Database['public']['Tables']['daily_sales_items']['Row']
export type CountPeriod = Database['public']['Tables']['count_periods']['Row']
export type BlogPost = Database['public']['Tables']['blog_posts']['Row']
export type Plan = Database['public']['Tables']['plans']['Row']
export type Feature = Database['public']['Tables']['features']['Row']
export type PlanFeature =
  Database['public']['Tables']['plan_features']['Row']
export type TenantFeatureOverride =
  Database['public']['Tables']['tenant_feature_overrides']['Row']
export type ActivityEvent =
  Database['public']['Tables']['activity_events']['Row']
export type ManualPayment =
  Database['public']['Tables']['manual_payments']['Row']
export type Invitation = Database['public']['Tables']['invitations']['Row']
export type AdminNote = Database['public']['Tables']['admin_notes']['Row']
export type AdminAuditLog =
  Database['public']['Tables']['admin_audit_log']['Row']
export type AdminNotification =
  Database['public']['Tables']['admin_notifications']['Row']
