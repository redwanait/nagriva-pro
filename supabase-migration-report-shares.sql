/* ════════════════════════════════════════════════════════
   NAGRIVA — Report Shares Schema + RPC
   Share links, analytics, public viewer support
   Run this SQL in your Supabase SQL Editor
   ════════════════════════════════════════════════════════ */

-- ── 1. REPORT SHARES TABLE ──
CREATE TABLE IF NOT EXISTS report_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES audit_reports(id) ON DELETE CASCADE,
  share_code TEXT UNIQUE NOT NULL,
  is_public BOOLEAN DEFAULT false,
  views INTEGER DEFAULT 0,
  downloads INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_shares_code ON report_shares(share_code);
CREATE INDEX IF NOT EXISTS idx_report_shares_report_id ON report_shares(report_id);

ALTER TABLE report_shares ENABLE ROW LEVEL SECURITY;

-- ── 2. RLS: Anyone can read share records (for public viewer) ──
CREATE POLICY "Anyone can view report shares"
  ON report_shares FOR SELECT
  USING (true);

-- ── 3. RLS: Authenticated users can insert share records ──
CREATE POLICY "Authenticated users can create shares"
  ON report_shares FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ── 4. RLS: Authenticated users can update their own shares ──
CREATE POLICY "Users can update own shares"
  ON report_shares FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM audit_reports ar
      JOIN audit_leads al ON al.id = ar.lead_id
      WHERE ar.id = report_shares.report_id
      AND al.email = auth.jwt() ->> 'email'
    )
  );

-- ── 5. RPC: Get shared report data (SECURITY DEFINER) ──
-- Allows the public viewer to fetch report data without exposing the table
CREATE OR REPLACE FUNCTION get_shared_report(p_share_code TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report_data JSON;
BEGIN
  SELECT json_build_object(
    'id', r.id,
    'lead_id', r.lead_id,
    'website', r.website,
    'audit_score', r.audit_score,
    'report_url', r.report_url,
    'created_at', r.created_at,
    'share_code', s.share_code,
    'views', s.views,
    'downloads', s.downloads,
    'shares', s.shares,
    'is_public', s.is_public
  ) INTO v_report_data
  FROM audit_reports r
  JOIN report_shares s ON s.report_id = r.id
  WHERE s.share_code = p_share_code;

  IF v_report_data IS NULL THEN
    RETURN json_build_object('error', 'Report not found');
  END IF;

  -- Increment view count
  UPDATE report_shares
  SET views = views + 1, updated_at = NOW()
  WHERE share_code = p_share_code;

  RETURN v_report_data;
END;
$$;

-- ── 6. RPC: Increment download count ──
CREATE OR REPLACE FUNCTION increment_report_downloads(p_report_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE report_shares
  SET downloads = downloads + 1, updated_at = NOW()
  WHERE report_id = p_report_id;
END;
$$;

-- ── 7. RPC: Increment share count ──
CREATE OR REPLACE FUNCTION increment_report_shares(p_report_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE report_shares
  SET shares = shares + 1, updated_at = NOW()
  WHERE report_id = p_report_id;
END;
$$;

-- ── 8. Grant execute permissions for public (anon) access ──
-- Required for public report viewer to fetch report data without authentication
GRANT USAGE ON SCHEMA public TO anon;
GRANT EXECUTE ON FUNCTION get_shared_report TO anon;
GRANT EXECUTE ON FUNCTION increment_report_downloads TO anon;
GRANT EXECUTE ON FUNCTION increment_report_shares TO anon;

-- ── 9. Add share_id to audit_reports for quick reference (optional) ──
ALTER TABLE audit_reports ADD COLUMN IF NOT EXISTS share_id UUID REFERENCES report_shares(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_audit_reports_share_id ON audit_reports(share_id);
