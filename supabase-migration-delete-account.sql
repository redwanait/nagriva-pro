/* ════════════════════════════════════════════════════════
   NAGRIVA — Delete Account Function
   SECURITY DEFINER function that lets authenticated users
   delete their own auth.users record (and cascades to
   profiles and child tables per existing FK rules).

   Run this SQL in your Supabase SQL Editor.
   ════════════════════════════════════════════════════════ */

-- ── 1. Create the delete_account() function ──
-- This runs with the privileges of the function creator (supabase_admin),
-- which has DELETE access on auth.users. The calling user is identified
-- via auth.uid().
CREATE OR REPLACE FUNCTION public.delete_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the caller is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete the calling user from auth.users.
  -- ON DELETE CASCADE on profiles.id will remove the profile row.
  -- Child tables handle deletion per their FK rules (SET NULL or CASCADE).
  DELETE FROM auth.users WHERE id = auth.uid();

  -- If no row was deleted, the user likely doesn't exist
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
END;
$$;

-- ── 2. Grant execute to authenticated users ──
GRANT EXECUTE ON FUNCTION public.delete_account() TO authenticated;

-- ── 3. Revoke execute from anon (unauthenticated) ──
REVOKE EXECUTE ON FUNCTION public.delete_account() FROM anon, public;
