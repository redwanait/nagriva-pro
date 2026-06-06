/* ════════════════════════════════════════════════════════
   NAGRIVA — Checkout → Supabase → Dashboard System
   Adds missing columns for the complete order flow.
   ════════════════════════════════════════════════════════ */

-- Add columns for the checkout/dashboard system
ALTER TABLE orders ADD COLUMN IF NOT EXISTS service TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS package TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS amount DECIMAL(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_time TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS revisions TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS service_slug TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS package_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'MAD';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';

-- Update existing status check to include new statuses
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('Pending', 'Paid', 'In Progress', 'Review', 'Completed', 'Cancelled',
                    'pending', 'approved', 'in_progress', 'review', 'delivered', 'completed', 'cancelled'));

-- Ensure RLS is enabled
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies and recreate clean ones
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Users can insert own orders" ON orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
DROP POLICY IF EXISTS "Admins can update any order" ON orders;
DROP POLICY IF EXISTS "Admins can insert orders" ON orders;
DROP POLICY IF EXISTS "Admins can delete orders" ON orders;

-- User policies
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own orders"
  ON orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admin policies
CREATE POLICY "Admins can view all orders"
  ON orders FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update any order"
  ON orders FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can insert orders"
  ON orders FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete orders"
  ON orders FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Create index for faster order lookups
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- Ensure orders is in the realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE orders;
  END IF;
END $$;

-- Create projects table if it doesn't exist
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  progress INTEGER DEFAULT 0,
  current_stage TEXT DEFAULT 'discovery',
  stages JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view projects for own orders" ON projects;
DROP POLICY IF EXISTS "Users can insert projects for own orders" ON projects;
DROP POLICY IF EXISTS "Users can update projects for own orders" ON projects;
DROP POLICY IF EXISTS "Admins can manage all projects" ON projects;

CREATE POLICY "Users can view projects for own orders"
  ON projects FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = projects.order_id AND orders.user_id = auth.uid())
  );

CREATE POLICY "Users can insert projects for own orders"
  ON projects FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = projects.order_id AND orders.user_id = auth.uid())
  );

CREATE POLICY "Users can update projects for own orders"
  ON projects FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = projects.order_id AND orders.user_id = auth.uid())
  );

CREATE POLICY "Admins can manage all projects"
  ON projects FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Ensure projects is in realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'projects'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE projects;
  END IF;
END $$;
