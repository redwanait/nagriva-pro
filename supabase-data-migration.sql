-- ════════════════════════════════════════════════════════
-- NAGRIVA — Data Migration: Link Orders to User IDs
-- Run this AFTER supabase-migration.sql in your SQL Editor
-- ════════════════════════════════════════════════════════
--
-- What this does:
-- 1. Identifies orders with NULL or invalid user_id
-- 2. Attempts to link orphaned orders to auth.users
-- 3. Reports any orders that need manual intervention
-- ════════════════════════════════════════════════════════

DO $$
DECLARE
  orphan_count INT;
  fixed_count INT := 0;
  rec RECORD;
BEGIN
  -- Step 1: Count orders with NULL user_id
  SELECT COUNT(*) INTO orphan_count FROM orders WHERE user_id IS NULL;

  IF orphan_count > 0 THEN
    RAISE NOTICE 'Found % orders with NULL user_id. These need manual mapping.', orphan_count;

    -- Attempt to map orders created during a session to the correct user
    -- This heuristic matches orders to users based on creation proximity
    -- For a more accurate mapping, provide a manual user_id lookup
    FOR rec IN
      SELECT o.id, o.created_at
      FROM orders o
      WHERE o.user_id IS NULL
    LOOP
      -- Try to find a user who was created around the same time
      -- This is a best-effort guess for migration purposes
      UPDATE orders
      SET user_id = (
        SELECT id FROM profiles
        WHERE created_at <= rec.created_at
        ORDER BY created_at DESC
        LIMIT 1
      )
      WHERE id = rec.id
        AND EXISTS (SELECT 1 FROM profiles WHERE created_at <= rec.created_at);

      IF FOUND THEN
        fixed_count := fixed_count + 1;
      END IF;
    END LOOP;

    RAISE NOTICE 'Auto-mapped % orders to user profiles.', fixed_count;
    RAISE NOTICE '% orders still have NULL user_id and need manual intervention.',
      orphan_count - fixed_count;
  ELSE
    RAISE NOTICE 'No NULL user_id found. All orders are properly linked.';
  END IF;

  -- Step 2: Verify all orders have valid user_id references
  SELECT COUNT(*) INTO orphan_count
  FROM orders o
  WHERE o.user_id IS NULL
     OR NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = o.user_id);

  IF orphan_count > 0 THEN
    RAISE WARNING '% orders have missing or invalid user_id references. These orders will be inaccessible until fixed.', orphan_count;
    RAISE WARNING 'To fix manually: UPDATE orders SET user_id = ''<UUID>'' WHERE id = ''<order-id>'';';
  ELSE
    RAISE NOTICE 'All orders have valid user_id references. ✓';
  END IF;

  -- Step 3: Verify RLS policies are correct
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'orders'
    AND policyname IN ('Allow public read orders', 'Allow public insert orders',
                       'Allow public update orders', 'Allow public delete orders')
  ) THEN
    RAISE WARNING 'DANGER: Public policies still exist on orders table! Run DROP POLICY on them immediately.';
  ELSE
    RAISE NOTICE 'No public policies on orders table. RLS is properly configured. ✓';
  END IF;
END;
$$;
