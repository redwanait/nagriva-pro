/* ════════════════════════════════════════════════════════
   NAGRIVA — Settings Table Migration
   Run this SQL in your Supabase SQL Editor to set up
   the settings table with proper security policies.
   ════════════════════════════════════════════════════════ */

-- ── 1. Create settings table ──
CREATE TABLE IF NOT EXISTS settings (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. Enable row level security ──
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- ── 3. RLS policies (only admins can manage settings) ──
CREATE POLICY "Admins can read settings"
  ON settings FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert settings"
  ON settings FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update settings"
  ON settings FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete settings"
  ON settings FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- ── 4. Upsert function ──
CREATE OR REPLACE FUNCTION upsert_setting(p_key TEXT, p_value JSONB)
RETURNS SETOF settings
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO settings (setting_key, setting_value, updated_at)
  VALUES (p_key, p_value, NOW())
  ON CONFLICT (setting_key)
  DO UPDATE SET setting_value = p_value, updated_at = NOW()
  RETURNING *;
END;
$$;

-- ── 5. Enable realtime ──
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS settings;

-- ── 6. Index for fast key lookups ──
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(setting_key);

-- ── 7. Create settings storage bucket for uploads ──
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'settings',
  'settings',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/x-icon']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- ── 8. Storage policies for settings bucket ──
CREATE POLICY "Settings images are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'settings');

CREATE POLICY "Admins can upload settings images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'settings'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can update settings images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'settings'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can delete settings images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'settings'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);
