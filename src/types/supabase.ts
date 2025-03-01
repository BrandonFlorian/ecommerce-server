export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          first_name: string;
          last_name: string;
          phone: string | null;
          created_at: string;
          updated_at: string;
          role: "customer" | "admin";
        };
        Insert: {
          id?: string;
          email: string;
          first_name: string;
          last_name: string;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
          role?: "customer" | "admin";
        };
        Update: {
          id?: string;
          email?: string;
          first_name?: string;
          last_name?: string;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
          role?: "customer" | "admin";
        };
      };
      addresses: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          address_line1: string;
          address_line2: string | null;
          city: string;
          state: string;
          postal_code: string;
          country: string;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          address_line1: string;
          address_line2?: string | null;
          city: string;
          state: string;
          postal_code: string;
          country: string;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          address_line1?: string;
          address_line2?: string | null;
          city?: string;
          state?: string;
          postal_code?: string;
          country?: string;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          name: string;
          description: string;
          price: number;
          compare_at_price: number | null;
          cost_price: number;
          sku: string;
          barcode: string | null;
          weight: number;
          dimensions: Json;
          inventory_quantity: number;
          is_active: boolean;
          category_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description: string;
          price: number;
          compare_at_price?: number | null;
          cost_price: number;
          sku: string;
          barcode?: string | null;
          weight: number;
          dimensions: Json;
          inventory_quantity: number;
          is_active?: boolean;
          category_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          price?: number;
          compare_at_price?: number | null;
          cost_price?: number;
          sku?: string;
          barcode?: string | null;
          weight?: number;
          dimensions?: Json;
          inventory_quantity?: number;
          is_active?: boolean;
          category_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      product_images: {
        Row: {
          id: string;
          product_id: string;
          url: string;
          alt_text: string;
          position: number;
          is_primary: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          url: string;
          alt_text: string;
          position: number;
          is_primary?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          url?: string;
          alt_text?: string;
          position?: number;
          is_primary?: boolean;
          created_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          parent_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          parent_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          parent_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          user_id: string;
          status:
            | "pending"
            | "paid"
            | "processing"
            | "shipped"
            | "delivered"
            | "cancelled"
            | "refunded";
          total_amount: number;
          subtotal: number;
          tax: number;
          shipping_cost: number;
          discount_amount: number;
          stripe_payment_intent_id: string;
          billing_address_id: string;
          shipping_address_id: string;
          shipping_method: string;
          tracking_number: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          status?:
            | "pending"
            | "paid"
            | "processing"
            | "shipped"
            | "delivered"
            | "cancelled"
            | "refunded";
          total_amount: number;
          subtotal: number;
          tax: number;
          shipping_cost: number;
          discount_amount: number;
          stripe_payment_intent_id: string;
          billing_address_id: string;
          shipping_address_id: string;
          shipping_method: string;
          tracking_number?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          status?:
            | "pending"
            | "paid"
            | "processing"
            | "shipped"
            | "delivered"
            | "cancelled"
            | "refunded";
          total_amount?: number;
          subtotal?: number;
          tax?: number;
          shipping_cost?: number;
          discount_amount?: number;
          stripe_payment_intent_id?: string;
          billing_address_id?: string;
          shipping_address_id?: string;
          shipping_method?: string;
          tracking_number?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          total_price: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          total_price: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string;
          quantity?: number;
          unit_price?: number;
          total_price?: number;
          created_at?: string;
        };
      };
      carts: {
        Row: {
          id: string;
          user_id: string | null;
          session_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          session_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          session_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      cart_items: {
        Row: {
          id: string;
          cart_id: string;
          product_id: string;
          quantity: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cart_id: string;
          product_id: string;
          quantity: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          cart_id?: string;
          product_id?: string;
          quantity?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
