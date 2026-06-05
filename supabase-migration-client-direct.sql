/* ════════════════════════════════════════════════════════
   NAGRIVA — Direct Client Insert Migration
   Required after switching admin client creation from
   auth.signUp() to direct profiles INSERT.
   Run this ONCE in your Supabase SQL Editor.
   ════════════════════════════════════════════════════════ */

-- 1. Drop FK constraint so we can insert clients without auth.users entries
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 2. Add email column for direct client storage
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 3. Add INSERT policy so admins can create client profiles directly
CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
