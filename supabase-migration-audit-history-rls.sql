/* ════════════════════════════════════════════════════════
   NAGRIVA — Audit History Dashboard RLS Policies
   Run this SQL in your Supabase SQL Editor
   ════════════════════════════════════════════════════════ */

-- ── 1. Allow authenticated users to view their own reports ──
-- Matches via audit_leads.email against the user's JWT email claim
CREATE POLICY "Users can view own audit reports"
  ON audit_reports FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND (
      EXISTS (
        SELECT 1 FROM audit_leads
        WHERE audit_leads.id = audit_reports.lead_id
        AND audit_leads.email = auth.jwt() ->> 'email'
      )
    )
  );

-- ── 2. Allow users to delete their own reports ──
CREATE POLICY "Users can delete own audit reports"
  ON audit_reports FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND (
      EXISTS (
        SELECT 1 FROM audit_leads
        WHERE audit_leads.id = audit_reports.lead_id
        AND audit_leads.email = auth.jwt() ->> 'email'
      )
    )
  );

-- ── 3. Allow admins to delete any report ──
CREATE POLICY "Admins can delete audit reports"
  ON audit_reports FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ── 4. Allow authenticated users to view their own leads ──
-- Required for the audit_reports RLS subquery to function correctly
CREATE POLICY "Users can view own audit leads"
  ON audit_leads FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND email = auth.jwt() ->> 'email'
  );

-- ── 5. Allow admins to update audit reports ──
CREATE POLICY "Admins can update audit reports"
  ON audit_reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
