-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'customer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Addresses table
CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Categories table
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES categories(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  compare_at_price DECIMAL(10, 2),
  cost_price DECIMAL(10, 2) NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  barcode TEXT,
  weight DECIMAL(10, 2) NOT NULL,
  dimensions JSONB NOT NULL,
  inventory_quantity INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  category_id UUID NOT NULL REFERENCES categories(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Product images table
CREATE TABLE product_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt_text TEXT NOT NULL,
  position INTEGER NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Carts table
CREATE TABLE carts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Cart items table
CREATE TABLE cart_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(cart_id, product_id)
);

-- Orders table (updated with shipping fields)
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending',
  total_amount DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  tax DECIMAL(10, 2) NOT NULL,
  shipping_cost DECIMAL(10, 2) NOT NULL,
  discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  stripe_payment_intent_id TEXT,
  billing_address_id UUID NOT NULL REFERENCES addresses(id),
  shipping_address_id UUID NOT NULL REFERENCES addresses(id),
  shipping_method TEXT NOT NULL,
  shipping_rate_id TEXT,
  carrier TEXT,
  label_url TEXT,
  shipping_label_created_at TIMESTAMP WITH TIME ZONE,
  carrier_account_id TEXT,
  tracking_number TEXT,
  notes TEXT,
  receipt_url TEXT,
  payment_method_details JSONB,
  dispute_status TEXT,
  dispute_reason TEXT,
  dispute_evidence JSONB,
  dispute_created_at TIMESTAMP WITH TIME ZONE,
  dispute_resolved_at TIMESTAMP WITH TIME ZONE,
  fraud_warning BOOLEAN DEFAULT false,
  fraud_warning_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Order items table
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Shipping events table (new)
CREATE TABLE shipping_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  tracking_number TEXT NOT NULL,
  carrier TEXT NOT NULL,
  status TEXT NOT NULL,
  status_details TEXT,
  description TEXT,
  location TEXT,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Function to increment inventory quantity
CREATE OR REPLACE FUNCTION increment_inventory(p_product_id UUID, p_quantity INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE products
  SET inventory_quantity = inventory_quantity + p_quantity,
      updated_at = now()
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql;

-- RLS (Row Level Security) Policies

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_events ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admin can view all users" ON users
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

-- Addresses table policies
CREATE POLICY "Users can CRUD their own addresses" ON addresses
  USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all addresses" ON addresses
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

-- Categories table policies
CREATE POLICY "Categories are publicly viewable" ON categories
  FOR SELECT USING (true);

CREATE POLICY "Admin can manage categories" ON categories
  USING (auth.jwt() ->> 'role' = 'admin');

-- Products table policies
CREATE POLICY "Active products are publicly viewable" ON products
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admin can manage products" ON products
  USING (auth.jwt() ->> 'role' = 'admin');

-- Product images table policies
CREATE POLICY "Product images are publicly viewable" ON product_images
  FOR SELECT USING (true);

CREATE POLICY "Admin can manage product images" ON product_images
  USING (auth.jwt() ->> 'role' = 'admin');

-- Carts table policies
CREATE POLICY "Users can manage their own carts" ON carts
  USING (
    auth.uid() = user_id OR 
    (user_id IS NULL AND session_id = current_setting('request.headers')::json->>'cart-session-id')
  );

CREATE POLICY "Admin can view all carts" ON carts
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

-- Cart items table policies
CREATE POLICY "Users can manage their own cart items" ON cart_items
  USING (
    EXISTS (
      SELECT 1 FROM carts
      WHERE carts.id = cart_id
      AND (
        carts.user_id = auth.uid() OR
        (carts.user_id IS NULL AND carts.session_id = current_setting('request.headers')::json->>'cart-session-id')
      )
    )
  );

CREATE POLICY "Admin can view all cart items" ON cart_items
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

-- Orders table policies
CREATE POLICY "Users can view their own orders" ON orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admin can manage all orders" ON orders
  USING (auth.jwt() ->> 'role' = 'admin');

-- Order items table policies
CREATE POLICY "Users can view their own order items" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_id
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin can manage all order items" ON order_items
  USING (auth.jwt() ->> 'role' = 'admin');

-- Shipping events table policies
CREATE POLICY "Users can view their own shipping events" ON shipping_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_id
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin can manage all shipping events" ON shipping_events
  USING (auth.jwt() ->> 'role' = 'admin');

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_addresses_user_id ON addresses(user_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_is_active ON products(is_active);
CREATE INDEX idx_product_images_product_id ON product_images(product_id);
CREATE INDEX idx_carts_user_id ON carts(user_id);
CREATE INDEX idx_carts_session_id ON carts(session_id);
CREATE INDEX idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX idx_cart_items_product_id ON cart_items(product_id);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
CREATE INDEX idx_orders_payment_intent_id ON orders(stripe_payment_intent_id);
CREATE INDEX idx_shipping_events_order_id ON shipping_events(order_id);
CREATE INDEX idx_shipping_events_tracking ON shipping_events(tracking_number);
