-- =====================================================
-- ROLLBACK Migration 005: Dropshipping Platform - Phase 1
-- =====================================================
-- Date: October 15, 2025
-- Description: Rollback script for dropshipping infrastructure
--
-- WARNING: This will DELETE all data in the following tables:
--   - supplier_performance
--   - pricing_rules
--   - supplier_order_items
--   - supplier_orders
--   - supplier_catalogs
--   - fulfillment_inventory
--   - inventory_sources
--
-- Also REMOVES columns from suppliers table.
--
-- Use only if migration 005 needs to be undone!
-- =====================================================

BEGIN;

-- =====================================================
-- 1. DROP TRIGGERS
-- =====================================================
DROP TRIGGER IF EXISTS update_inventory_sources_updated_at ON inventory_sources;
DROP TRIGGER IF EXISTS update_supplier_catalogs_updated_at ON supplier_catalogs;
DROP TRIGGER IF EXISTS update_supplier_orders_updated_at ON supplier_orders;
DROP TRIGGER IF EXISTS update_pricing_rules_updated_at ON pricing_rules;
DROP TRIGGER IF EXISTS update_supplier_performance_updated_at ON supplier_performance;

-- =====================================================
-- 2. DROP TABLES (in reverse order of dependencies)
-- =====================================================
DROP TABLE IF EXISTS supplier_performance CASCADE;
DROP TABLE IF EXISTS pricing_rules CASCADE;
DROP TABLE IF EXISTS supplier_order_items CASCADE;
DROP TABLE IF EXISTS supplier_orders CASCADE;
DROP TABLE IF EXISTS supplier_catalogs CASCADE;
DROP TABLE IF EXISTS fulfillment_inventory CASCADE;
DROP TABLE IF EXISTS inventory_sources CASCADE;

-- =====================================================
-- 3. REMOVE COLUMNS FROM SUPPLIERS TABLE
-- =====================================================
ALTER TABLE suppliers DROP COLUMN IF EXISTS integration_methods;
ALTER TABLE suppliers DROP COLUMN IF EXISTS api_endpoint;
ALTER TABLE suppliers DROP COLUMN IF EXISTS api_key_encrypted;
ALTER TABLE suppliers DROP COLUMN IF EXISTS ftp_host;
ALTER TABLE suppliers DROP COLUMN IF EXISTS ftp_username;
ALTER TABLE suppliers DROP COLUMN IF EXISTS ftp_password_encrypted;
ALTER TABLE suppliers DROP COLUMN IF EXISTS email_order_address;
ALTER TABLE suppliers DROP COLUMN IF EXISTS portal_url;
ALTER TABLE suppliers DROP COLUMN IF EXISTS portal_username;
ALTER TABLE suppliers DROP COLUMN IF EXISTS portal_password_encrypted;
ALTER TABLE suppliers DROP COLUMN IF EXISTS integration_config;
ALTER TABLE suppliers DROP COLUMN IF EXISTS last_sync_at;
ALTER TABLE suppliers DROP COLUMN IF EXISTS sync_frequency_hours;

-- =====================================================
-- 4. DROP INDEXES (if not already dropped with tables)
-- =====================================================
DROP INDEX IF EXISTS idx_suppliers_integration;
DROP INDEX IF EXISTS idx_suppliers_sync;

-- =====================================================
-- ROLLBACK COMPLETE
-- =====================================================
COMMIT;

-- Verify tables removed
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
    'inventory_sources',
    'fulfillment_inventory',
    'supplier_catalogs',
    'supplier_orders',
    'supplier_order_items',
    'pricing_rules',
    'supplier_performance'
);
-- Should return 0 rows if rollback successful
