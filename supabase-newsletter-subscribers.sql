/* ════════════════════════════════════════════════════════
   NAGRIVA — Newsletter Subscribers Table & RLS
   ════════════════════════════════════════════════════════ */

-- ── Create table ──
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed', 'bounced'))
);

-- ── Enable RLS ──
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- ── Public can subscribe (INSERT) ──
CREATE POLICY "Public can subscribe"
  ON newsletter_subscribers FOR INSERT
  WITH CHECK (true);

-- ── Only admins can read / update / delete ──
CREATE POLICY "Admins can read subscribers"
  ON newsletter_subscribers FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update subscribers"
  ON newsletter_subscribers FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete subscribers"
  ON newsletter_subscribers FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── Enable realtime ──
ALTER PUBLICATION supabase_realtime ADD TABLE newsletter_subscribers;
