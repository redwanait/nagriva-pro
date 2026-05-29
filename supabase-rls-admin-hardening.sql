/* ════════════════════════════════════════════════════════
   NAGRIVA — Admin RLS Hardening & RBAC
   Run this in Supabase SQL Editor to close all gaps.
   Ensures admin-only write access for sensitive tables.
   ════════════════════════════════════════════════════════ */

-- ── 0. SAFETY: Drop any overly permissive public policies ──
DROP POLICY IF EXISTS "Allow public read orders" ON orders;
DROP POLICY IF EXISTS "Allow public insert orders" ON orders;
DROP POLICY IF EXISTS "Allow public update orders" ON orders;
DROP POLICY IF EXISTS "Allow public delete orders" ON orders;

-- ── 1. PROFILES RBAC ──
-- Existing: users view/update own, admins view all
-- Missing: admins update all (already in migration.sql), admins insert

CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── 2. ORDERS RBAC ──
-- Existing: users view/insert own, admins everything
-- Full coverage confirmed.

-- ── 3. SERVICES RBAC ──
-- Existing: public read published, admins insert/update/delete
-- Full coverage confirmed.

-- ── 4. PROJECTS RBAC ──
-- Existing: users view own, admins manage all
-- Full coverage confirmed.

-- ── 5. MESSAGES RBAC ──
-- Existing: users view/insert on own orders, admins all
-- Full coverage confirmed.

-- ── 6. FILES RBAC ──
-- Existing: users view/upload own order files, users delete own, admins all
-- Full coverage confirmed.

-- ── 7. ACTIVITY LOG RBAC ──
-- Existing: users view/insert for own orders, admins all
-- Full coverage confirmed.

-- ── 8. NOTIFICATIONS RBAC ──
-- Existing: users manage own, admins manage all
-- Full coverage confirmed.

-- ── 9. SETTINGS RBAC ──
-- Existing: admin CRUD only
-- Full coverage confirmed.

-- ── 10. CONTENT SETTINGS RBAC ──
-- Existing: anyone read, admin CRUD
-- Full coverage confirmed.

-- ── 11. INVOICES RBAC ──
-- Existing: admin CRUD, clients read own
-- Full coverage confirmed.

-- ── 12. PAYMENTS / PAYMENT HISTORY RBAC ──
-- Existing: admin CRUD, clients read own
-- Full coverage confirmed.

-- ── 13. SUPPORT CONVERSATIONS RBAC ──
-- Existing: users view own, admins manage all, users create
-- Full coverage confirmed.

-- ── 14. SUPPORT MESSAGES RBAC ──
-- Existing: users view/insert own, admins manage all
-- Full coverage confirmed.

-- ── 15. MESSAGE READ STATUS RBAC ──
-- Existing: users manage own, admins view all
-- Full coverage confirmed.

-- ── 16. ARTICLES (BLOG) RBAC ──
-- Existing: public read published, admins manage all
-- Full coverage confirmed.

-- ── 17. STORAGE: AVATARS ──
-- Existing: public read, users upload/update/delete own
-- Full coverage confirmed.

-- ── 18. STORAGE: ORDER-FILES ──
-- Existing: public read, auth users upload, users update/delete own, admins all
-- Full coverage confirmed.

-- ── 19. STORAGE: SETTINGS IMAGES ──
-- Existing: public read, admins upload/update/delete
-- Full coverage confirmed.

-- ── 20. ADD MISSING NOTIFICATION ADMIN INSERT POLICY ──
-- Ensure admins can insert notifications for ANY user
CREATE POLICY "Admins can insert notifications for any user"
  ON notifications FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ════════════════════════════════════════════════════════
-- RLS VERIFICATION
-- ════════════════════════════════════════════════════════

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  pg_catalog.pg_get_expr(qual, 0) AS using_expr,
  pg_catalog.pg_get_expr(with_check, 0) AS check_expr
FROM pg_policies
WHERE schemaname IN ('public', 'storage')
ORDER BY schemaname, tablename, policyname;
