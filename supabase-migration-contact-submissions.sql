/* ════════════════════════════════════════════════════════
   NAGRIVA — Contact Submissions Schema
   Run this SQL in your Supabase SQL Editor
   ════════════════════════════════════════════════════════ */

-- ── 1. CONTACT SUBMISSIONS TABLE ──
CREATE TABLE IF NOT EXISTS contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  company_name TEXT DEFAULT '',
  service_needed TEXT NOT NULL,
  budget_range TEXT DEFAULT '',
  project_details TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- ── 2. RLS: Anyone (anonymous) can insert a contact submission ──
CREATE POLICY "Anyone can insert contact submissions"
  ON contact_submissions FOR INSERT
  WITH CHECK (true);

-- ── 3. RLS: Only authenticated admins can view submissions ──
CREATE POLICY "Admins can view contact submissions"
  ON contact_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ── 4. Enable realtime for live updates ──
ALTER PUBLICATION supabase_realtime ADD TABLE contact_submissions;
