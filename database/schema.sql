-- Clothes Shipping App Database Schema
-- PostgreSQL Database Schema for E-commerce Platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (customers and admins)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) DEFAULT 'customer' CHECK (role IN ('customer', 'admin', 'supplier')),
    language_preference VARCHAR(5) DEFAULT 'en' CHECK (language_preference IN ('en', 'pt', 'de', 'fr', 'es')),
    currency_preference VARCHAR(3) DEFAULT 'EUR' CHECK (currency_preference IN ('EUR', 'BRL', 'NAD')),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User addresses
CREATE TABLE user_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) DEFAULT 'shipping' CHECK (type IN ('shipping', 'billing')),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    company VARCHAR(100),
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state_province VARCHAR(100),
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(2) NOT NULL CHECK (country IN ('DE', 'FR', 'ES', 'IT', 'PT', 'NL', 'BE', 'AT', 'BR', 'NA')),
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Suppliers (Chinese manufacturers)
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    province VARCHAR(100),
    country VARCHAR(2) DEFAULT 'CN',
    business_license VARCHAR(100),
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    rating DECIMAL(3,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product categories
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID REFERENCES categories(id),
    name_en VARCHAR(100) NOT NULL,
    name_pt VARCHAR(100),
    name_de VARCHAR(100),
    name_fr VARCHAR(100),
    name_es VARCHAR(100),
    slug VARCHAR(100) UNIQUE NOT NULL,
    description_en TEXT,
    description_pt TEXT,
    description_de TEXT,
    description_fr TEXT,
    description_es TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    category_id UUID NOT NULL REFERENCES categories(id),
    sku VARCHAR(50) UNIQUE NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    name_pt VARCHAR(255),
    name_de VARCHAR(255),
    name_fr VARCHAR(255),
    name_es VARCHAR(255),
    description_en TEXT,
    description_pt TEXT,
    description_de TEXT,
    description_fr TEXT,
    description_es TEXT,
    base_price DECIMAL(10,2) NOT NULL,
    cost_price DECIMAL(10,2) NOT NULL,
    weight_grams INTEGER NOT NULL,
    dimensions_cm VARCHAR(20), -- "20x15x5"
    material VARCHAR(100),
    care_instructions_en TEXT,
    care_instructions_pt TEXT,
    care_instructions_de TEXT,
    care_instructions_fr TEXT,
    care_instructions_es TEXT,
    is_active BOOLEAN DEFAULT true,
    featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product variants (sizes, colors)
CREATE TABLE product_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku VARCHAR(50) UNIQUE NOT NULL,
    size VARCHAR(20),
    color_en VARCHAR(50),
    color_pt VARCHAR(50),
    color_de VARCHAR(50),
    color_fr VARCHAR(50),
    color_es VARCHAR(50),
    color_hex VARCHAR(7),
    price_adjustment DECIMAL(10,2) DEFAULT 0.00,
    stock_quantity INTEGER DEFAULT 0,
    reserved_quantity INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product images
CREATE TABLE product_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    image_url VARCHAR(500) NOT NULL,
    alt_text_en VARCHAR(255),
    alt_text_pt VARCHAR(255),
    alt_text_de VARCHAR(255),
    alt_text_fr VARCHAR(255),
    alt_text_es VARCHAR(255),
    sort_order INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(20) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('EUR', 'BRL', 'NAD')),
    subtotal DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    shipping_cost DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    payment_method VARCHAR(20) CHECK (payment_method IN ('stripe_card', 'paypal', 'google_pay')),
    payment_intent_id VARCHAR(100),
    shipping_address JSONB NOT NULL,
    billing_address JSONB NOT NULL,
    estimated_delivery DATE,
    tracking_number VARCHAR(100),
    dhl_shipment_id VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order items
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    variant_id UUID REFERENCES product_variants(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shopping cart
CREATE TABLE cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id, variant_id)
);

-- Inventory tracking
CREATE TABLE inventory_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    variant_id UUID NOT NULL REFERENCES product_variants(id),
    type VARCHAR(20) NOT NULL CHECK (type IN ('restock', 'sale', 'reserve', 'release', 'adjustment')),
    quantity INTEGER NOT NULL,
    reference_id UUID, -- order_id or other reference
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Exchange rates (updated daily)
CREATE TABLE exchange_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    rate DECIMAL(10,6) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(from_currency, to_currency)
);

-- Shipping zones and rates
CREATE TABLE shipping_zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    countries TEXT[] NOT NULL, -- Array of country codes
    base_rate DECIMAL(10,2) NOT NULL,
    per_kg_rate DECIMAL(10,2) NOT NULL,
    free_shipping_threshold DECIMAL(10,2),
    estimated_days_min INTEGER NOT NULL,
    estimated_days_max INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_products_supplier ON products(supplier_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_variants_product ON product_variants(product_id);
CREATE INDEX idx_variants_stock ON product_variants(stock_quantity);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_date ON orders(created_at);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_cart_user ON cart_items(user_id);
CREATE INDEX idx_inventory_variant ON inventory_movements(variant_id);

-- Insert default data
INSERT INTO categories (name_en, name_pt, name_de, name_fr, name_es, slug) VALUES
('Women''s Clothing', 'Roupas Femininas', 'Damenbekleidung', 'Vêtements Femmes', 'Ropa de Mujer', 'womens-clothing'),
('Men''s Clothing', 'Roupas Masculinas', 'Herrenbekleidung', 'Vêtements Hommes', 'Ropa de Hombre', 'mens-clothing'),
('Accessories', 'Acessórios', 'Accessoires', 'Accessoires', 'Accesorios', 'accessories'),
('Shoes', 'Calçados', 'Schuhe', 'Chaussures', 'Zapatos', 'shoes');

-- Insert shipping zones
INSERT INTO shipping_zones (name, countries, base_rate, per_kg_rate, free_shipping_threshold, estimated_days_min, estimated_days_max) VALUES
('European Union', ARRAY['DE','FR','ES','IT','PT','NL','BE','AT'], 5.99, 2.50, 50.00, 7, 14),
('Brazil', ARRAY['BR'], 12.99, 5.00, 100.00, 14, 28),
('Namibia', ARRAY['NA'], 15.99, 6.00, 150.00, 21, 35);

-- Insert base exchange rates (will be updated by API)
INSERT INTO exchange_rates (from_currency, to_currency, rate) VALUES
('EUR', 'BRL', 5.50),
('EUR', 'NAD', 20.00),
('BRL', 'EUR', 0.18),
('NAD', 'EUR', 0.05);