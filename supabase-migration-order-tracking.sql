/* ════════════════════════════════════════════════════════
   NAGRIVA — Order Tracking System Migration
   SAFE · Idempotent · Preserves existing data
   ════════════════════════════════════════════════════════ */

-- ── 1. Add new columns (IF NOT EXISTS is safe) ──
ALTER TABLE orders ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS current_stage TEXT DEFAULT 'order_received';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_delivery TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- ── 2. Update existing 'delivered' orders to 'completed' ──
UPDATE orders SET status = 'completed' WHERE status = 'delivered';

-- ── 3. Safely update status constraint ──
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'orders_status_check'
      AND conrelid = 'orders'::regclass
  ) THEN
    ALTER TABLE orders DROP CONSTRAINT orders_status_check;
  END IF;
END $$;

ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'approved', 'in_progress', 'review', 'completed', 'cancelled'));

-- ── 4. Set current_stage defaults for existing orders ──
UPDATE orders SET current_stage = 'order_received'
  WHERE (current_stage IS NULL OR current_stage = '') AND status = 'pending';

UPDATE orders SET current_stage = 'project_approved'
  WHERE (current_stage IS NULL OR current_stage = '') AND status = 'approved';

UPDATE orders SET current_stage = 'work_started'
  WHERE (current_stage IS NULL OR current_stage = '') AND status = 'in_progress';

UPDATE orders SET current_stage = 'first_draft'
  WHERE (current_stage IS NULL OR current_stage = '') AND status = 'review';

UPDATE orders SET current_stage = 'final_delivery'
  WHERE (current_stage IS NULL OR current_stage = '') AND status = 'completed';

UPDATE orders SET current_stage = 'order_received'
  WHERE (current_stage IS NULL OR current_stage = '') AND status = 'cancelled';

-- ── 5. Set progress defaults for existing orders ──
UPDATE orders SET progress = 10  WHERE status = 'pending'      AND (progress IS NULL OR progress = 0);
UPDATE orders SET progress = 25  WHERE status = 'approved'     AND (progress IS NULL OR progress = 0);
UPDATE orders SET progress = 45  WHERE status = 'in_progress'  AND (progress IS NULL OR progress = 0);
UPDATE orders SET progress = 70  WHERE status = 'review'       AND (progress IS NULL OR progress = 0);
UPDATE orders SET progress = 100 WHERE status = 'completed'    AND (progress IS NULL OR progress = 0);

-- ── 6. Enable realtime for orders table (safe DO block) ──
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

-- ── 7. Indexes for new columns ──
CREATE INDEX IF NOT EXISTS idx_orders_progress            ON orders(progress);
CREATE INDEX IF NOT EXISTS idx_orders_current_stage       ON orders(current_stage);
CREATE INDEX IF NOT EXISTS idx_orders_estimated_delivery  ON orders(estimated_delivery);
