/* ════════════════════════════════════════════════════════
   NAGRIVA — Job Applications Schema & RLS
   Run this SQL in your Supabase SQL Editor
   ════════════════════════════════════════════════════════ */

-- ── 1. JOB APPLICATIONS TABLE ──
CREATE TABLE IF NOT EXISTS job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  country TEXT DEFAULT '',
  position TEXT NOT NULL,
  linkedin_url TEXT DEFAULT '',
  portfolio_url TEXT DEFAULT '',
  experience_level TEXT DEFAULT '',
  resume_url TEXT DEFAULT '',
  cover_letter TEXT DEFAULT '',
  additional_notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending'
);

ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

-- ── 2. RLS: Anyone (anonymous) can insert a job application ──
CREATE POLICY "Anyone can insert job applications"
  ON job_applications FOR INSERT
  WITH CHECK (true);

-- ── 3. RLS: Only authenticated admins can view job applications ──
CREATE POLICY "Admins can view job applications"
  ON job_applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ── 4. RLS: No public UPDATE or DELETE ──
CREATE POLICY "Admins can update job applications"
  ON job_applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete job applications"
  ON job_applications FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ── 5. RESUMES STORAGE BUCKET ──
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'resumes',
  'resumes',
  true,
  10485760,
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- ── 6. STORAGE RLS: Public can upload and read resumes ──
DROP POLICY IF EXISTS "Public can read resumes" ON storage.objects;
CREATE POLICY "Public can read resumes"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'resumes');

DROP POLICY IF EXISTS "Public can upload resumes" ON storage.objects;
CREATE POLICY "Public can upload resumes"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'resumes');

DROP POLICY IF EXISTS "Authenticated users can update own resumes" ON storage.objects;
CREATE POLICY "Authenticated users can update own resumes"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'resumes'
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Authenticated users can delete own resumes" ON storage.objects;
CREATE POLICY "Authenticated users can delete own resumes"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'resumes'
    AND auth.role() = 'authenticated'
  );

-- ── 7. Enable realtime ──
ALTER PUBLICATION supabase_realtime ADD TABLE job_applications;
