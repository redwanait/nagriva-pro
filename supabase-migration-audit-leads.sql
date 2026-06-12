/* ════════════════════════════════════════════════════════
   NAGRIVA — Audit Leads Schema
   Run this SQL in your Supabase SQL Editor
   ════════════════════════════════════════════════════════ */

-- ── 1. AUDIT LEADS TABLE ──
CREATE TABLE IF NOT EXISTS audit_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT DEFAULT '',
  website TEXT NOT NULL,
  audit_score INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE audit_leads ENABLE ROW LEVEL SECURITY;

-- ── 2. RLS: Anyone (anonymous) can insert a lead ──
CREATE POLICY "Anyone can insert audit leads"
  ON audit_leads FOR INSERT
  WITH CHECK (true);

-- ── 3. RLS: Only authenticated admins can view leads ──
CREATE POLICY "Admins can view audit leads"
  ON audit_leads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ── 4. Enable realtime for live dashboard updates ──
ALTER PUBLICATION supabase_realtime ADD TABLE audit_leads;

-- ── 5. Index for faster queries ──
CREATE INDEX IF NOT EXISTS idx_audit_leads_email ON audit_leads(email);
CREATE INDEX IF NOT EXISTS idx_audit_leads_created_at ON audit_leads(created_at DESC);
