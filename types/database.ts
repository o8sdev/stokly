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

export type BatchStatus = 'active' | 'depleted' | 'expired' | 'written_off'

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
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          currency?: string
          locale?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['tenants']['Insert']>
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
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['recipes']['Insert']>
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
        Row: { user_id: string; created_at: string }
        Insert: { user_id: string; created_at?: string }
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
        }
        Insert: {
          id?: string
          name_az: string
          name_ru?: string | null
          category: string
          default_unit: string
          default_yield_percent?: number | null
          sort_order?: number | null
        }
        Update: Partial<
          Database['public']['Tables']['global_ingredient_library']['Insert']
        >
        Relationships: []
      }
    }
    Views: Record<never, never>
    Functions: {
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
      submit_demo_request: {
        Args: {
          p_name: string
          p_restaurant: string
          p_email: string
          p_message: string
        }
        Returns: undefined
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
export type Ingredient = Database['public']['Tables']['ingredients']['Row']
export type Recipe = Database['public']['Tables']['recipes']['Row']
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
