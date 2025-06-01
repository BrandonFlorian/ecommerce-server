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
      addresses: {
        Row: {
          address_line1: string
          address_line2: string | null
          city: string
          country: string
          created_at: string | null
          id: string
          is_default: boolean
          name: string
          postal_code: string
          state: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          city: string
          country: string
          created_at?: string | null
          id?: string
          is_default?: boolean
          name: string
          postal_code: string
          state: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          city?: string
          country?: string
          created_at?: string | null
          id?: string
          is_default?: boolean
          name?: string
          postal_code?: string
          state?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          cart_id: string
          created_at: string | null
          id: string
          product_id: string
          quantity: number
          updated_at: string | null
        }
        Insert: {
          cart_id: string
          created_at?: string | null
          id?: string
          product_id: string
          quantity: number
          updated_at?: string | null
        }
        Update: {
          cart_id?: string
          created_at?: string | null
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          parent_id: string | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          parent_id?: string | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          slug?: string
          updated_at?: string | null
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
      order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          product_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          product_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          billing_address_id: string
          carrier: string | null
          carrier_account_id: string | null
          created_at: string | null
          discount_amount: number
          dispute_created_at: string | null
          dispute_evidence: Json | null
          dispute_reason: string | null
          dispute_resolved_at: string | null
          dispute_status: string | null
          fraud_warning: boolean | null
          fraud_warning_details: Json | null
          id: string
          label_url: string | null
          notes: string | null
          payment_method_details: Json | null
          receipt_url: string | null
          shipping_address_id: string
          shipping_cost: number
          shipping_label_created_at: string | null
          shipping_method: string
          shipping_rate_id: string | null
          status: string
          stripe_payment_intent_id: string | null
          subtotal: number
          tax: number
          total_amount: number
          tracking_number: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          billing_address_id: string
          carrier?: string | null
          carrier_account_id?: string | null
          created_at?: string | null
          discount_amount?: number
          dispute_created_at?: string | null
          dispute_evidence?: Json | null
          dispute_reason?: string | null
          dispute_resolved_at?: string | null
          dispute_status?: string | null
          fraud_warning?: boolean | null
          fraud_warning_details?: Json | null
          id?: string
          label_url?: string | null
          notes?: string | null
          payment_method_details?: Json | null
          receipt_url?: string | null
          shipping_address_id: string
          shipping_cost: number
          shipping_label_created_at?: string | null
          shipping_method: string
          shipping_rate_id?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          subtotal: number
          tax: number
          total_amount: number
          tracking_number?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          billing_address_id?: string
          carrier?: string | null
          carrier_account_id?: string | null
          created_at?: string | null
          discount_amount?: number
          dispute_created_at?: string | null
          dispute_evidence?: Json | null
          dispute_reason?: string | null
          dispute_resolved_at?: string | null
          dispute_status?: string | null
          fraud_warning?: boolean | null
          fraud_warning_details?: Json | null
          id?: string
          label_url?: string | null
          notes?: string | null
          payment_method_details?: Json | null
          receipt_url?: string | null
          shipping_address_id?: string
          shipping_cost?: number
          shipping_label_created_at?: string | null
          shipping_method?: string
          shipping_rate_id?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          subtotal?: number
          tax?: number
          total_amount?: number
          tracking_number?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_billing_address_id_fkey"
            columns: ["billing_address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_shipping_address_id_fkey"
            columns: ["shipping_address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string
          created_at: string | null
          id: string
          is_primary: boolean
          position: number
          product_id: string
          url: string
        }
        Insert: {
          alt_text: string
          created_at?: string | null
          id?: string
          is_primary?: boolean
          position: number
          product_id: string
          url: string
        }
        Update: {
          alt_text?: string
          created_at?: string | null
          id?: string
          is_primary?: boolean
          position?: number
          product_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          category_id: string
          compare_at_price: number | null
          cost_price: number
          created_at: string | null
          description: string
          dimensions: Json
          id: string
          inventory_quantity: number
          is_active: boolean
          name: string
          price: number
          sku: string
          updated_at: string | null
          weight: number
        }
        Insert: {
          barcode?: string | null
          category_id: string
          compare_at_price?: number | null
          cost_price: number
          created_at?: string | null
          description: string
          dimensions: Json
          id?: string
          inventory_quantity?: number
          is_active?: boolean
          name: string
          price: number
          sku: string
          updated_at?: string | null
          weight: number
        }
        Update: {
          barcode?: string | null
          category_id?: string
          compare_at_price?: number | null
          cost_price?: number
          created_at?: string | null
          description?: string
          dimensions?: Json
          id?: string
          inventory_quantity?: number
          is_active?: boolean
          name?: string
          price?: number
          sku?: string
          updated_at?: string | null
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_events: {
        Row: {
          carrier: string
          created_at: string | null
          description: string | null
          event_date: string
          id: string
          location: string | null
          order_id: string
          status: string
          status_details: string | null
          tracking_number: string
        }
        Insert: {
          carrier: string
          created_at?: string | null
          description?: string | null
          event_date: string
          id?: string
          location?: string | null
          order_id: string
          status: string
          status_details?: string | null
          tracking_number: string
        }
        Update: {
          carrier?: string
          created_at?: string | null
          description?: string | null
          event_date?: string
          id?: string
          location?: string | null
          order_id?: string
          status?: string
          status_details?: string | null
          tracking_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          created_at: string | null
          email: string
          first_name: string
          id: string
          last_name: string
          phone: string | null
          role: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          first_name: string
          id: string
          last_name: string
          phone?: string | null
          role?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_item_to_cart: {
        Args:
          | { p_product_id: string; p_quantity: number; p_user_id: string }
          | {
              p_product_id: string
              p_quantity?: number
              p_user_id?: string
              p_session_id?: string
            }
        Returns: {
          cart_id: string
          user_id: string
          session_id: string
          created_at: string
          updated_at: string
          items: Json
        }[]
      }
      clear_cart: {
        Args: { p_user_id?: string; p_session_id?: string }
        Returns: {
          cart_id: string
          user_id: string
          session_id: string
          created_at: string
          updated_at: string
          items: Json
        }[]
      }
      get_or_create_cart_with_items: {
        Args:
          | { p_user_id: string }
          | { p_user_id?: string; p_session_id?: string }
        Returns: {
          cart_id: string
          user_id: string
          session_id: string
          created_at: string
          updated_at: string
          items: Json
        }[]
      }
      increment_inventory: {
        Args: { p_product_id: string; p_quantity: number }
        Returns: undefined
      }
      merge_anonymous_cart: {
        Args: { p_real_user_id: string; p_anonymous_user_id: string }
        Returns: {
          cart_id: string
          user_id: string
          created_at: string
          updated_at: string
          items: Json
        }[]
      }
      merge_carts: {
        Args: { p_user_id: string; p_session_id: string }
        Returns: {
          cart_id: string
          user_id: string
          session_id: string
          created_at: string
          updated_at: string
          items: Json
        }[]
      }
      remove_item_from_cart: {
        Args: {
          p_product_id: string
          p_user_id?: string
          p_session_id?: string
        }
        Returns: {
          cart_id: string
          user_id: string
          session_id: string
          created_at: string
          updated_at: string
          items: Json
        }[]
      }
      update_cart_item_quantity: {
        Args: {
          p_product_id: string
          p_quantity: number
          p_user_id?: string
          p_session_id?: string
        }
        Returns: {
          cart_id: string
          user_id: string
          session_id: string
          created_at: string
          updated_at: string
          items: Json
        }[]
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
