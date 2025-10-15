# Migration 005 - Dropshipping Platform Phase 1

**Date:** October 15, 2025
**Status:** Ready for deployment
**Estimated Duration:** ~5 minutes

---

## 📋 OVERVIEW

This migration creates the core infrastructure for JNE Outlet's multi-vendor dropshipping platform.

### New Tables:
1. `inventory_sources` - Product sourcing options (warehouse, suppliers, 3PL)
2. `fulfillment_inventory` - Own warehouse stock levels
3. `supplier_catalogs` - Supplier product catalog with pricing
4. `supplier_orders` - Orders routed to suppliers
5. `supplier_order_items` - Line items for supplier orders
6. `pricing_rules` - Flexible margin rules
7. `supplier_performance` - Supplier metrics and ratings

### Extended Tables:
- `suppliers` - Added 13 new columns for integration methods

---

## ✅ PRE-DEPLOYMENT CHECKLIST

**BEFORE running this migration:**

- [ ] **Database Backup Created**
  ```bash
  ssh root@91.99.27.249 "docker exec jneoutlet_postgres pg_dump -U jneuser jneoutlet > /opt/jneoutlet/backups/backup_before_migration_005_$(date +%Y%m%d_%H%M%S).sql"
  ```

- [ ] **Backup Downloaded Locally**
  ```bash
  scp root@91.99.27.249:/opt/jneoutlet/backups/backup_before_migration_005_*.sql ./backups/
  ```

- [ ] **Production Traffic is Low** (check analytics)

- [ ] **Alert Team** (if applicable)

---

## 🚀 DEPLOYMENT STEPS

### 1. Upload Migration Files to Server
```bash
scp database/migrations/005_dropshipping_platform_phase1.sql root@91.99.27.249:/tmp/
scp database/migrations/005_dropshipping_platform_phase1_rollback.sql root@91.99.27.249:/tmp/
```

### 2. SSH to Server
```bash
ssh root@91.99.27.249
```

### 3. Test Migration (Dry Run in Transaction)
```bash
docker exec -it jneoutlet_postgres psql -U jneuser -d jneoutlet << 'EOF'
BEGIN;
\i /tmp/005_dropshipping_platform_phase1.sql
-- Review output, check for errors
ROLLBACK;  -- Don't commit on dry run!
EOF
```

**Expected Output:**
- All CREATE TABLE statements succeed
- All CREATE INDEX statements succeed
- All ALTER TABLE statements succeed
- 2 rows inserted into `pricing_rules`
- No errors

### 4. Apply Migration (FOR REAL)
```bash
docker exec -i jneoutlet_postgres psql -U jneuser -d jneoutlet < /tmp/005_dropshipping_platform_phase1.sql
```

### 5. Verify Migration Success
```bash
docker exec jneoutlet_postgres psql -U jneuser -d jneoutlet << 'EOF'
-- Check all tables exist
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

-- Count pricing rules
SELECT COUNT(*) FROM pricing_rules;  -- Should be 2

-- Check suppliers columns
\d suppliers
EOF
```

**Expected Results:**
- 7 tables listed
- 2 pricing rules
- suppliers table has 13+ new columns

### 6. Test API Health
```bash
curl -I https://api.jneoutlet.com/health
curl https://api.jneoutlet.com/api/products?limit=1
```

**Expected:**
- Health check returns 200 OK
- Products endpoint works (no database errors)

---

## 🔄 ROLLBACK PROCEDURE (IF NEEDED)

**ONLY if migration fails or causes issues:**

### 1. Apply Rollback
```bash
docker exec -i jneoutlet_postgres psql -U jneuser -d jneoutlet < /tmp/005_dropshipping_platform_phase1_rollback.sql
```

### 2. Verify Rollback
```bash
docker exec jneoutlet_postgres psql -U jneuser -d jneoutlet << 'EOF'
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
-- Should return 0 rows
EOF
```

### 3. Restore from Backup (if needed)
```bash
# Stop backend temporarily
docker stop jneoutlet_backend

# Restore database
docker exec -i jneoutlet_postgres psql -U jneuser -d jneoutlet < /opt/jneoutlet/backups/backup_before_migration_005_*.sql

# Restart backend
docker start jneoutlet_backend
```

---

## 📊 POST-DEPLOYMENT VERIFICATION

### 1. Check Database Logs
```bash
docker logs jneoutlet_postgres --tail 100 | grep -i error
```

### 2. Check Backend Logs
```bash
docker logs jneoutlet_backend --tail 50
```

### 3. Monitor Production
- [ ] API response times normal
- [ ] No 500 errors
- [ ] Frontend pages load correctly
- [ ] Can create test order

### 4. Smoke Tests
```bash
# Test products endpoint
curl https://api.jneoutlet.com/api/products?limit=5

# Test categories
curl https://api.jneoutlet.com/api/categories

# Test suppliers (authenticated)
# curl -H "Authorization: Bearer YOUR_TOKEN" https://api.jneoutlet.com/api/suppliers
```

---

## 📝 MIGRATION DETAILS

### Schema Changes Summary:

**New Tables (7):**
| Table | Rows Expected | Purpose |
|-------|---------------|---------|
| `inventory_sources` | 0 | Product sourcing definitions |
| `fulfillment_inventory` | 0 | Own warehouse stock |
| `supplier_catalogs` | 0 | Supplier product catalog |
| `supplier_orders` | 0 | Supplier order tracking |
| `supplier_order_items` | 0 | Supplier order line items |
| `pricing_rules` | 2 | Margin calculation rules |
| `supplier_performance` | 0 | Supplier metrics |

**Extended Tables:**
- `suppliers`: +13 columns for integration methods

**Indexes Created:** 40+ indexes for performance

**Triggers Created:** 5 auto-update triggers for `updated_at` columns

---

## 🐛 COMMON ISSUES & SOLUTIONS

### Issue: "relation already exists"
**Cause:** Migration already ran
**Solution:** This is OK, skip migration

### Issue: "could not create unique index"
**Cause:** Duplicate data exists
**Solution:** Investigate data, clean duplicates, re-run

### Issue: "permission denied"
**Cause:** User lacks permissions
**Solution:** Check psql user is `jneuser` with correct privileges

### Issue: Migration hangs
**Cause:** Table locks from active queries
**Solution:** Wait for queries to complete or restart backend temporarily

---

## 📞 SUPPORT

**If migration fails:**
1. **DON'T PANIC** - Rollback script is ready
2. **Check logs** - docker logs for errors
3. **Document error** - Copy full error message
4. **Rollback if needed** - Use rollback script
5. **Report issue** - Provide logs and error details

---

## ✅ SUCCESS CRITERIA

Migration is successful when:
- ✅ All 7 tables created
- ✅ All indexes created
- ✅ All triggers created
- ✅ suppliers table extended
- ✅ 2 pricing rules inserted
- ✅ API health check passes
- ✅ No errors in logs
- ✅ Frontend loads correctly

---

**Migration Prepared By:** Claude Code (AI Developer)
**Reviewed By:** Pending (Jörg)
**Deployed By:** TBD
**Deployment Date:** TBD
