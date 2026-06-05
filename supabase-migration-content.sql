/* ════════════════════════════════════════════════════════
   NAGRIVA — Content Settings Table Migration
   Run this SQL in your Supabase SQL Editor to set up
   the content_settings table for dynamic content management.
   ════════════════════════════════════════════════════════ */

-- ── 1. Create content_settings table ──
CREATE TABLE IF NOT EXISTS content_settings (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  content_key TEXT NOT NULL UNIQUE,
  content_value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. Enable row level security ──
ALTER TABLE content_settings ENABLE ROW LEVEL SECURITY;

-- ── 3. RLS policies (admins manage, anyone can read published content) ──
CREATE POLICY "Anyone can read content"
  ON content_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert content"
  ON content_settings FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update content"
  ON content_settings FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete content"
  ON content_settings FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- ── 4. Upsert function ──
CREATE OR REPLACE FUNCTION upsert_content(p_key TEXT, p_value TEXT)
RETURNS SETOF content_settings
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO content_settings (content_key, content_value, updated_at)
  VALUES (p_key, p_value, NOW())
  ON CONFLICT (content_key)
  DO UPDATE SET content_value = p_value, updated_at = NOW()
  RETURNING *;
END;
$$;

-- ── 5. Enable realtime ──
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS content_settings;

-- ── 6. Index for fast key lookups ──
CREATE INDEX IF NOT EXISTS idx_content_key ON content_settings(content_key);
