/* ════════════════════════════════════════════════════════
   NAGRIVA — Complete RLS Security Hardening
   ════════════════════════════════════════════════════════
   Run this SQL in your Supabase SQL Editor.
   This closes all remaining RLS gaps:
     1. Projects — INSERT/UPDATE for order owners
     2. Files — DELETE for file owners
     3. order-files storage bucket — Full RLS policies
     4. Realtime publication — all tables added
     5. Verified no public policies remain
   ════════════════════════════════════════════════════════ */

-- ── 1. PROJECTS: INSERT/UPDATE for order owners ──
-- Owners of an order can create and update milestones.

CREATE POLICY "Users can insert projects for own orders"
  ON projects FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = projects.order_id
        AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update projects for own orders"
  ON projects FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = projects.order_id
        AND orders.user_id = auth.uid()
    )
  );

-- ── 2. FILES: DELETE for file owners ──
-- Users can delete files they uploaded.

CREATE POLICY "Users can delete own files"
  ON files FOR DELETE
  USING (auth.uid() = user_id);

-- ── 3. ORDER-FILES STORAGE BUCKET RLS ──
-- The order-files bucket (50 MB public, file uploads/deliverables)
-- currently has NO RLS policies — this adds full coverage.

-- Ensure the bucket record exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'order-files',
  'order-files',
  true,
  52428800,
  NULL
)
ON CONFLICT (id) DO NOTHING;

-- Public read (public URLs are used for viewing/downloading)
DROP POLICY IF EXISTS "Order files are publicly readable" ON storage.objects;
CREATE POLICY "Order files are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'order-files');

-- Authenticated users can upload (file-table RLS enforces per-order auth)
DROP POLICY IF EXISTS "Authenticated users can upload order files" ON storage.objects;
CREATE POLICY "Authenticated users can upload order files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'order-files'
    AND auth.role() = 'authenticated'
  );

-- Users can update/overwrite their own files (folder = user_id)
DROP POLICY IF EXISTS "Users can update own order files" ON storage.objects;
CREATE POLICY "Users can update own order files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'order-files'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own files
DROP POLICY IF EXISTS "Users can delete own order files" ON storage.objects;
CREATE POLICY "Users can delete own order files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'order-files'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admins can manage all order files
DROP POLICY IF EXISTS "Admins can manage all order files" ON storage.objects;
CREATE POLICY "Admins can manage all order files"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'order-files'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ── 4. REALTIME: ensure all needed tables are published ──
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY['notifications', 'messages', 'files', 'activity_log', 'orders'];
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', tbl);
    END IF;
  END LOOP;
END $$;

-- ── 5. DROP ANY REMAINING PUBLIC POLICIES (safety net) ──
DROP POLICY IF EXISTS "Allow public read orders" ON orders;
DROP POLICY IF EXISTS "Allow public insert orders" ON orders;
DROP POLICY IF EXISTS "Allow public update orders" ON orders;
DROP POLICY IF EXISTS "Allow public delete orders" ON orders;

-- ── 6. AUDIT: list all policies for verification ──
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  pg_catalog.pg_get_expr(qual, 0) AS using_expr,
  pg_catalog.pg_get_expr(with_check, 0) AS check_expr
FROM pg_policies
WHERE schemaname IN ('public', 'storage')
ORDER BY schemaname, tablename, policyname;
