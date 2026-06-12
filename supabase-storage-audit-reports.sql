/* ════════════════════════════════════════════════════════
   NAGRIVA — Audit Reports Storage Bucket
   Run this SQL in your Supabase SQL Editor
   ════════════════════════════════════════════════════════ */

-- ── 1. Create the audit-reports bucket (private) ──
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audit-reports',
  'audit-reports',
  false,
  52428800,
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- ── 2. Allow authenticated users to upload reports ──
CREATE POLICY "Authenticated users can upload audit reports"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'audit-reports'
  AND auth.role() = 'authenticated'
);

-- ── 3. Allow authenticated users to read reports (needed for signed URLs) ──
CREATE POLICY "Authenticated users can read audit reports"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'audit-reports'
  AND auth.role() = 'authenticated'
);

-- ── 4. Allow authenticated users to update their own uploads ──
CREATE POLICY "Authenticated users can update audit reports"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'audit-reports'
  AND auth.role() = 'authenticated'
)
WITH CHECK (
  bucket_id = 'audit-reports'
  AND auth.role() = 'authenticated'
);
