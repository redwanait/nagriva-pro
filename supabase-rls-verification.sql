/* ════════════════════════════════════════════════════════
   NAGRIVA — RLS Security Verification SQL
   Run AFTER supabase-rls-complete.sql in Supabase SQL Editor
   ════════════════════════════════════════════════════════ */

-- ── 1. VERIFY RLS IS ENABLED ON ALL USER-OWNED TABLES ──
SELECT
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'orders', 'projects', 'messages', 'files', 'activity_log', 'notifications')
ORDER BY tablename;

-- Expect: all 7 tables show rls_enabled = true

-- ── 2. VERIFY NO PUBLIC POLICIES EXIST ──
SELECT
  schemaname,
  tablename,
  policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND (policyname ILIKE '%public%' OR policyname ILIKE '%allow all%')
ORDER BY tablename, policyname;

-- Expect: zero rows

-- ── 3. VERIFY EXPECTED POLICIES EXIST ON EACH TABLE ──

-- profiles (4 policies expected)
SELECT 'profiles' AS table_name, count(*) AS policy_count
FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles';
-- Expected: 4 (view own, update own, admin view all, admin update)

-- orders (6 policies expected)
SELECT 'orders' AS table_name, count(*) AS policy_count
FROM pg_policies WHERE schemaname = 'public' AND tablename = 'orders';
-- Expected: 6 (user view, user insert, admin view, admin update, admin insert, admin delete)

-- projects (4 policies expected)
SELECT 'projects' AS table_name, count(*) AS policy_count
FROM pg_policies WHERE schemaname = 'public' AND tablename = 'projects';
-- Expected: 4 (user view, user insert, user update, admin all)

-- messages (3 policies expected)
SELECT 'messages' AS table_name, count(*) AS policy_count
FROM pg_policies WHERE schemaname = 'public' AND tablename = 'messages';
-- Expected: 3 (user view, user insert, admin all)

-- files (4 policies expected)
SELECT 'files' AS table_name, count(*) AS policy_count
FROM pg_policies WHERE schemaname = 'public' AND tablename = 'files';
-- Expected: 4 (user view, user upload, user delete, admin all)

-- activity_log (3 policies expected)
SELECT 'activity_log' AS table_name, count(*) AS policy_count
FROM pg_policies WHERE schemaname = 'public' AND tablename = 'activity_log';
-- Expected: 3 (user view, user insert, admin all)

-- notifications (5 policies expected)
SELECT 'notifications' AS table_name, count(*) AS policy_count
FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications';
-- Expected: 5 (user view, user update, user insert, user delete, admin all)

-- ── 4. VERIFY STORAGE POLICIES ──
SELECT
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'storage'
ORDER BY tablename, policyname;
-- Expected: 
--   objects: avatars (4 policies)
--   objects: order-files (6 policies: public read, auth upload, user update, user delete, admin all)

-- ── 5. VERIFY REALTIME PUBLICATION ──
SELECT
  schemaname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND schemaname = 'public'
ORDER BY tablename;
-- Expected: notifications, messages, files, activity_log, orders

-- ── 6. VERIFY SECURITY DEFINER FUNCTIONS ──
SELECT
  proname AS function_name,
  prosecdef AS security_definer
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN ('handle_new_user', 'set_order_number', 'update_updated_at', 'update_updated_at_column')
ORDER BY proname;
-- Expected: handle_new_user should be security_definer = true

-- ── 7. COMPREHENSIVE POLICY LIST ──
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  pg_catalog.pg_get_expr(qual, 0) AS using_expression,
  pg_catalog.pg_get_expr(with_check, 0) AS check_expression
FROM pg_policies
WHERE schemaname IN ('public', 'storage')
ORDER BY schemaname, tablename, policyname;

-- ═══════════════════════════════════════════════════════════
-- If all checks pass, RLS is correctly configured.
-- ═══════════════════════════════════════════════════════════
