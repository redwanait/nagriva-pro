/* ════════════════════════════════════════════════════════
   NAGRIVA — Orders Table Migration
   Run this SQL in your Supabase SQL Editor to update
   the orders table schema for the admin order management.
   ════════════════════════════════════════════════════════ */

-- Add client_name column
ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_name TEXT;

-- Add service column (new name for service_type)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS service TEXT;

-- Add project_title column (new name for project_name)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS project_title TEXT;

-- Migrate data from old columns to new columns
UPDATE orders SET service = COALESCE(service_type, '') WHERE service IS NULL;
UPDATE orders SET project_title = COALESCE(project_name, '') WHERE project_title IS NULL;
UPDATE orders SET client_name = COALESCE(project_name, '') WHERE client_name IS NULL;

-- Add additional_notes column if not exists
ALTER TABLE orders ADD COLUMN IF NOT EXISTS additional_notes TEXT;

-- Update status constraint to support new statuses
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'in_progress', 'revision', 'completed'));

-- Migrate existing statuses
UPDATE orders SET status = 'in_progress' WHERE status = 'in_progress';
UPDATE orders SET status = 'completed' WHERE status IN ('delivered', 'cancelled');
UPDATE orders SET status = 'revision' WHERE status = 'review';
UPDATE orders SET status = 'pending' WHERE status = 'pending';

-- Enable realtime for orders table
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS orders;

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_orders_client_name ON orders(client_name);
CREATE INDEX IF NOT EXISTS idx_orders_service ON orders(service);
CREATE INDEX IF NOT EXISTS idx_orders_project_title ON orders(project_title);
