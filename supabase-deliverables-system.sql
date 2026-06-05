-- ════════════════════════════════════════════════════════
-- NAGRIVA — Deliverables System
-- Table, Storage Bucket, RLS Policies
-- ════════════════════════════════════════════════════════

-- ── 1. DELIVERABLES TABLE ──
CREATE TABLE IF NOT EXISTS deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  file_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deliverables_order_id ON deliverables(order_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_created_at ON deliverables(created_at DESC);

-- ── 2. ROW LEVEL SECURITY ──
ALTER TABLE deliverables ENABLE ROW LEVEL SECURITY;

-- Clients can view deliverables for their own orders
CREATE POLICY "Clients can view deliverables for own orders"
  ON deliverables FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = deliverables.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- Admins can view all deliverables
CREATE POLICY "Admins can view all deliverables"
  ON deliverables FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can insert deliverables
CREATE POLICY "Admins can insert deliverables"
  ON deliverables FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can delete deliverables
CREATE POLICY "Admins can delete deliverables"
  ON deliverables FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ── 3. STORAGE BUCKET ──
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('deliverables', 'deliverables', true, 52428800, NULL)
ON CONFLICT (id) DO NOTHING;

-- ── 4. STORAGE RLS POLICIES ──
DROP POLICY IF EXISTS "Deliverables are publicly readable" ON storage.objects;
CREATE POLICY "Deliverables are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'deliverables');

DROP POLICY IF EXISTS "Authenticated admins can upload deliverables" ON storage.objects;
CREATE POLICY "Authenticated admins can upload deliverables"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'deliverables'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete deliverables from storage" ON storage.objects;
CREATE POLICY "Admins can delete deliverables from storage"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'deliverables'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ── 5. NOTIFICATIONS TABLE ENSURE EXISTS ──
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT DEFAULT '',
  link TEXT DEFAULT '',
  is_read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ── 6. ACTIVITY LOG TABLE ENSURE EXISTS ──
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_order_id ON activity_log(order_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);
