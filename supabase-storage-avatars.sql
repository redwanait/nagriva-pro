/* ════════════════════════════════════════════════════════
   NAGRIVA — Avatar Storage Bucket & Policies
   Run this SQL in your Supabase SQL Editor to set up
   the avatars bucket with proper security policies.
   The app will create the bucket automatically if
   missing; this SQL ensures the correct policies exist.
   ════════════════════════════════════════════════════════ */

-- ── 1. Create the avatars bucket (if not already created by the app) ──
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,  -- 2MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- ── 2. Allow public read access to avatars (needed for public URLs) ──
CREATE POLICY "Avatar images are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- ── 3. Allow authenticated users to upload their own avatar ──
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ── 4. Allow users to update their own avatar ──
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ── 5. Allow users to delete their own avatar ──
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
