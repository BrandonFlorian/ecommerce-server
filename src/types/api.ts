export interface ProductImage {
  url: string;
  alt_text: string;
  is_primary: boolean;
}

export interface ProductWithImages {
  id: string;
  name: string;
  price: number;
  compare_at_price: number | null;
  sku: string;
  weight: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  inventory_quantity: number;
  product_images: ProductImage[];
}

export interface CartItemWithProduct {
  id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
  products: ProductWithImages;
}

export interface CartWithItems {
  cart: {
    id: string;
    user_id: string | null;
    session_id: string | null;
    created_at: string;
    updated_at: string;
  };
  items: CartItemWithProduct[];
  summary: {
    subtotal: number;
    totalItems: number;
  };
}
