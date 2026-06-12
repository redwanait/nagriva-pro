/* ════════════════════════════════════════════════════════
   NAGRIVA — Audit Reports Schema
   Run this SQL in your Supabase SQL Editor
   ════════════════════════════════════════════════════════ */

-- ── 1. AUDIT REPORTS TABLE ──
CREATE TABLE IF NOT EXISTS audit_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES audit_leads(id) ON DELETE CASCADE,
  website TEXT NOT NULL,
  report_url TEXT NOT NULL,
  audit_score INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE audit_reports ENABLE ROW LEVEL SECURITY;

-- ── 2. RLS: Anyone can insert a report (lead submission flow) ──
CREATE POLICY "Anyone can insert audit reports"
  ON audit_reports FOR INSERT
  WITH CHECK (true);

-- ── 3. RLS: Only authenticated admins can view reports ──
CREATE POLICY "Admins can view audit reports"
  ON audit_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ── 4. Indexes ──
CREATE INDEX IF NOT EXISTS idx_audit_reports_lead_id ON audit_reports(lead_id);
CREATE INDEX IF NOT EXISTS idx_audit_reports_created_at ON audit_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_reports_website ON audit_reports(website);
