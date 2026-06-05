/* ════════════════════════════════════════════════════════
   NAGRIVA — Activity Log Schema Fix
   SAFE · Idempotent
   ════════════════════════════════════════════════════════ */

-- Add order_id column if missing (the column exists in schema but
-- may not have been applied to existing tables)
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE CASCADE;

-- Rebuild index in case it was created referencing a non-existent column
DROP INDEX IF EXISTS idx_activity_order_id;
CREATE INDEX IF NOT EXISTS idx_activity_order_id ON activity_log(order_id);

-- Backfill order_id from related tables where possible (no-op if already populated)
-- This is informational; actual backfill requires business logic per deployment
