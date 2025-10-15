-- =====================================================
-- Migration 005: Dropshipping Platform - Phase 1
-- =====================================================
-- Date: October 15, 2025
-- Description: Core dropshipping infrastructure for multi-vendor platform
--
-- Features:
--   - Flexible inventory sourcing (own warehouse, suppliers, 3PL)
--   - Multi-method supplier integration (Email, API, CSV, Portal)
--   - Supplier order routing and tracking
--   - Flexible pricing rules (global, category, product, supplier)
--   - Supplier performance tracking
--
-- Estimated Duration: ~5 minutes
-- Rollback: See 005_dropshipping_platform_phase1_rollback.sql
-- =====================================================

BEGIN;

-- =====================================================
-- 1. INVENTORY SOURCES
-- Defines all possible sources for each product
-- =====================================================
CREATE TABLE inventory_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    source_type VARCHAR(30) NOT NULL CHECK (source_type IN ('own_warehouse', 'supplier', 'fulfillment_partner')),
    source_id UUID NOT NULL,
    priority INTEGER DEFAULT 5,
    is_active BOOLEAN DEFAULT true,
    cost_price DECIMAL(10,2),
    lead_time_days INTEGER DEFAULT 14,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_inventory_sources_product ON inventory_sources(product_id) WHERE is_active = true;
CREATE INDEX idx_inventory_sources_priority ON inventory_sources(priority DESC, source_type);
CREATE INDEX idx_inventory_sources_variant ON inventory_sources(variant_id) WHERE variant_id IS NOT NULL;

COMMENT ON TABLE inventory_sources IS 'Defines fulfillment sources for each product (warehouse, supplier, 3PL)';
COMMENT ON COLUMN inventory_sources.priority IS 'Higher value = preferred source (used in routing algorithm)';
COMMENT ON COLUMN inventory_sources.source_id IS 'References suppliers.id or fulfillment_partners.id';
COMMENT ON COLUMN inventory_sources.lead_time_days IS 'Expected delivery time from this source';

-- =====================================================
-- 2. FULFILLMENT INVENTORY
-- Own warehouse stock tracking
-- =====================================================
CREATE TABLE fulfillment_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    warehouse_location VARCHAR(100),
    quantity_available INTEGER DEFAULT 0,
    reserved_quantity INTEGER DEFAULT 0,
    reorder_point INTEGER DEFAULT 10,
    last_counted_at TIMESTAMP WITH TIME ZONE,
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_id, variant_id)
);

CREATE INDEX idx_fulfillment_inventory_product ON fulfillment_inventory(product_id, variant_id);
CREATE INDEX idx_fulfillment_inventory_low_stock ON fulfillment_inventory(quantity_available)
    WHERE quantity_available <= reorder_point;
CREATE INDEX idx_fulfillment_inventory_reserved ON fulfillment_inventory(reserved_quantity)
    WHERE reserved_quantity > 0;

COMMENT ON TABLE fulfillment_inventory IS 'Own warehouse inventory levels';
COMMENT ON COLUMN fulfillment_inventory.reserved_quantity IS 'Quantity reserved for pending orders (prevents overselling)';
COMMENT ON COLUMN fulfillment_inventory.reorder_point IS 'Alert threshold for low stock';

-- =====================================================
-- 3. SUPPLIER CATALOGS
-- Supplier product information and stock levels
-- =====================================================
CREATE TABLE supplier_catalogs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    external_product_id VARCHAR(200) NOT NULL,
    external_product_name VARCHAR(500),
    supplier_price DECIMAL(10,2) NOT NULL,
    supplier_currency VARCHAR(3) DEFAULT 'EUR',
    stock_quantity INTEGER DEFAULT 0,
    stock_status VARCHAR(20),
    lead_time_days INTEGER DEFAULT 14,
    minimum_order_quantity INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    sync_method VARCHAR(20),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(supplier_id, external_product_id)
);

CREATE INDEX idx_supplier_catalogs_supplier ON supplier_catalogs(supplier_id) WHERE is_active = true;
CREATE INDEX idx_supplier_catalogs_product ON supplier_catalogs(product_id) WHERE is_active = true;
CREATE INDEX idx_supplier_catalogs_external_id ON supplier_catalogs(external_product_id);
CREATE INDEX idx_supplier_catalogs_stock ON supplier_catalogs(stock_status, stock_quantity);
CREATE INDEX idx_supplier_catalogs_sync ON supplier_catalogs(last_sync_at);
CREATE INDEX idx_supplier_catalogs_metadata ON supplier_catalogs USING GIN(metadata);

COMMENT ON TABLE supplier_catalogs IS 'Supplier product catalog with pricing and stock info';
COMMENT ON COLUMN supplier_catalogs.external_product_id IS 'Supplier SKU/ID';
COMMENT ON COLUMN supplier_catalogs.metadata IS 'Flexible JSONB for supplier-specific fields';
COMMENT ON COLUMN supplier_catalogs.sync_method IS 'How data was synced: api, csv, manual, email';

-- =====================================================
-- 4. SUPPLIER ORDERS
-- Orders routed to suppliers for fulfillment
-- =====================================================
CREATE TABLE supplier_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN (
        'pending', 'sent', 'acknowledged', 'accepted', 'processing',
        'shipped', 'delivered', 'rejected', 'cancelled', 'failed'
    )),
    routing_method VARCHAR(20) DEFAULT 'automatic',
    notification_method VARCHAR(20),
    notification_sent_at TIMESTAMP WITH TIME ZONE,
    notification_response JSONB,

    -- Supplier tracking info
    supplier_order_number VARCHAR(100),
    tracking_number VARCHAR(200),
    shipping_carrier VARCHAR(50),
    estimated_delivery_date DATE,

    -- Timestamps
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    accepted_at TIMESTAMP WITH TIME ZONE,
    shipped_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,

    -- Notes
    rejection_reason TEXT,
    admin_notes TEXT,
    supplier_notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_supplier_orders_order ON supplier_orders(order_id);
CREATE INDEX idx_supplier_orders_supplier ON supplier_orders(supplier_id, status);
CREATE INDEX idx_supplier_orders_status ON supplier_orders(status, created_at DESC);
CREATE INDEX idx_supplier_orders_created ON supplier_orders(created_at DESC);
CREATE INDEX idx_supplier_orders_tracking ON supplier_orders(tracking_number) WHERE tracking_number IS NOT NULL;

COMMENT ON TABLE supplier_orders IS 'Orders forwarded to suppliers for fulfillment';
COMMENT ON COLUMN supplier_orders.routing_method IS 'automatic or manual routing';
COMMENT ON COLUMN supplier_orders.notification_method IS 'email, api, portal, csv';
COMMENT ON COLUMN supplier_orders.notification_response IS 'API response or email delivery status';

-- =====================================================
-- 5. SUPPLIER ORDER ITEMS
-- Line items for supplier orders
-- =====================================================
CREATE TABLE supplier_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_order_id UUID NOT NULL REFERENCES supplier_orders(id) ON DELETE CASCADE,
    order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    variant_id UUID REFERENCES product_variants(id),
    quantity INTEGER NOT NULL,
    unit_cost DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    margin_percentage DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_supplier_order_items_supplier_order ON supplier_order_items(supplier_order_id);
CREATE INDEX idx_supplier_order_items_order_item ON supplier_order_items(order_item_id);
CREATE INDEX idx_supplier_order_items_product ON supplier_order_items(product_id);

COMMENT ON TABLE supplier_order_items IS 'Line items for supplier orders';
COMMENT ON COLUMN supplier_order_items.unit_cost IS 'Cost from supplier';
COMMENT ON COLUMN supplier_order_items.unit_price IS 'Sell price to customer';
COMMENT ON COLUMN supplier_order_items.margin_percentage IS 'Calculated margin';

-- =====================================================
-- 6. PRICING RULES
-- Flexible margin rules (global, category, product, supplier)
-- =====================================================
CREATE TABLE pricing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name VARCHAR(200) NOT NULL,
    rule_type VARCHAR(30) CHECK (rule_type IN ('global', 'category', 'product', 'supplier')),

    -- References (only one active)
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,

    -- Margin settings
    margin_type VARCHAR(20) DEFAULT 'percentage' CHECK (margin_type IN ('percentage', 'fixed')),
    margin_minimum DECIMAL(5,2) DEFAULT 35.00,
    margin_target DECIMAL(5,2) DEFAULT 45.00,
    margin_premium DECIMAL(5,2) DEFAULT 55.00,

    -- Price constraints
    minimum_price DECIMAL(10,2) DEFAULT 10.00,
    maximum_price DECIMAL(10,2),

    -- Priority & Status
    priority INTEGER DEFAULT 5,
    is_active BOOLEAN DEFAULT true,
    effective_from DATE,
    effective_until DATE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Validation: Only one of category_id, product_id, supplier_id can be set
    CHECK (
        (category_id IS NOT NULL AND product_id IS NULL AND supplier_id IS NULL) OR
        (category_id IS NULL AND product_id IS NOT NULL AND supplier_id IS NULL) OR
        (category_id IS NULL AND product_id IS NULL AND supplier_id IS NOT NULL) OR
        (category_id IS NULL AND product_id IS NULL AND supplier_id IS NULL)
    )
);

CREATE INDEX idx_pricing_rules_category ON pricing_rules(category_id, is_active);
CREATE INDEX idx_pricing_rules_product ON pricing_rules(product_id, is_active);
CREATE INDEX idx_pricing_rules_supplier ON pricing_rules(supplier_id, is_active);
CREATE INDEX idx_pricing_rules_priority ON pricing_rules(priority DESC) WHERE is_active = true;
CREATE INDEX idx_pricing_rules_effective ON pricing_rules(effective_from, effective_until) WHERE is_active = true;

COMMENT ON TABLE pricing_rules IS 'Flexible margin rules for pricing calculation';
COMMENT ON COLUMN pricing_rules.priority IS 'Higher priority rules override lower';
COMMENT ON COLUMN pricing_rules.effective_from IS 'Rule becomes active on this date';
COMMENT ON COLUMN pricing_rules.effective_until IS 'Rule expires after this date';

-- =====================================================
-- 7. SUPPLIER PERFORMANCE
-- Track supplier reliability and quality metrics
-- =====================================================
CREATE TABLE supplier_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Order metrics
    orders_total INTEGER DEFAULT 0,
    orders_accepted INTEGER DEFAULT 0,
    orders_rejected INTEGER DEFAULT 0,
    orders_fulfilled INTEGER DEFAULT 0,
    orders_cancelled INTEGER DEFAULT 0,

    -- Time metrics
    average_acknowledgement_hours DECIMAL(6,2),
    average_fulfillment_days DECIMAL(6,2),
    on_time_delivery_rate DECIMAL(5,2),

    -- Quality metrics
    defect_rate DECIMAL(5,4),
    return_rate DECIMAL(5,4),
    customer_rating DECIMAL(3,2),

    -- Overall rating
    performance_score DECIMAL(5,2),
    rating_category VARCHAR(20),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(supplier_id, period_start, period_end)
);

CREATE INDEX idx_supplier_performance_supplier ON supplier_performance(supplier_id, period_end DESC);
CREATE INDEX idx_supplier_performance_rating ON supplier_performance(rating_category, performance_score DESC);
CREATE INDEX idx_supplier_performance_period ON supplier_performance(period_start, period_end);

COMMENT ON TABLE supplier_performance IS 'Supplier performance metrics for routing algorithm';
COMMENT ON COLUMN supplier_performance.performance_score IS 'Overall score 0-100';
COMMENT ON COLUMN supplier_performance.rating_category IS 'excellent, good, fair, poor';

-- =====================================================
-- 8. EXTEND SUPPLIERS TABLE
-- Add integration methods and configuration
-- =====================================================
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS integration_methods VARCHAR(50)[];
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS api_endpoint VARCHAR(500);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS api_key_encrypted TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS ftp_host VARCHAR(200);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS ftp_username VARCHAR(100);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS ftp_password_encrypted TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS email_order_address VARCHAR(255);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS portal_url VARCHAR(500);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS portal_username VARCHAR(100);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS portal_password_encrypted TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS integration_config JSONB;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS sync_frequency_hours INTEGER DEFAULT 24;

CREATE INDEX idx_suppliers_integration ON suppliers USING GIN(integration_methods);
CREATE INDEX idx_suppliers_sync ON suppliers(last_sync_at);

COMMENT ON COLUMN suppliers.integration_methods IS 'Array of supported methods: email, api, csv, portal';
COMMENT ON COLUMN suppliers.integration_config IS 'Flexible JSONB for integration-specific settings';

-- =====================================================
-- 9. INSERT DEFAULT PRICING RULES
-- =====================================================
INSERT INTO pricing_rules (rule_name, rule_type, margin_minimum, margin_target, margin_premium, minimum_price, priority)
VALUES
    ('Global Default - Clothes', 'global', 35.00, 45.00, 55.00, 10.00, 1),
    ('Electronics Default', 'global', 15.00, 20.00, 25.00, 20.00, 1);

-- =====================================================
-- 10. TRIGGER FUNCTIONS FOR AUTO-TIMESTAMPS
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_inventory_sources_updated_at BEFORE UPDATE ON inventory_sources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_supplier_catalogs_updated_at BEFORE UPDATE ON supplier_catalogs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_supplier_orders_updated_at BEFORE UPDATE ON supplier_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pricing_rules_updated_at BEFORE UPDATE ON pricing_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_supplier_performance_updated_at BEFORE UPDATE ON supplier_performance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
COMMIT;

-- Verify tables created
\dt inventory_sources
\dt fulfillment_inventory
\dt supplier_catalogs
\dt supplier_orders
\dt supplier_order_items
\dt pricing_rules
\dt supplier_performance
