/* ════════════════════════════════════════════════════════
   NAGRIVA — Payment Status Migration
   Add payment_status column and update order status
   constraint for the real payment system.
   ════════════════════════════════════════════════════════ */

-- Add payment_status column
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';

-- Add payment_method column (if not exists)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- Add package_name column (if not exists)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS package_name TEXT;

-- Add package_index column (if not exists)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS package_index INTEGER;

-- Add service_slug column (if not exists)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS service_slug TEXT;

-- Add currency column (if not exists)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'MAD';

-- Update status constraint to support all statuses
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'in_progress', 'revision', 'completed', 'cancelled'));

-- Enable realtime for orders table
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS orders;

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_method ON orders(payment_method);
