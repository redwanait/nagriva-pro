/* ═══════════════════════════════════════════════════════════════
   NAGRIVA — Notification System Fix Migration
   Run this ONCE in your Supabase SQL Editor after all other migrations.
   Fixes: RLS, type constraint, DB trigger handler gaps.
   ═══════════════════════════════════════════════════════════════ */

-- ── 0. ENSURE METADATA COLUMN EXISTS ON NOTIFICATIONS ──
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- ── 0a. ENSURE order_id COLUMN EXISTS ON activity_log ──
-- The original table was likely created without this column.
-- supabase-migration-activity-log-fix.sql was written for this but may not have been run.
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE CASCADE;
DROP INDEX IF EXISTS idx_activity_order_id;
CREATE INDEX IF NOT EXISTS idx_activity_order_id ON activity_log(order_id);

-- ── 1. FIX RLS: ADD ADMIN INSERT POLICY FOR ACTIVITY LOG ──
-- Previously only "Users can insert activity for own orders" existed,
-- which blocked admins from logging activity (and thus no DB-triggered
-- notifications were created for admin actions).
CREATE POLICY "Admins can insert activity for any order"
  ON activity_log FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Also add admin SELECT policy so admins can view all activity
DROP POLICY IF EXISTS "Admins can view all activity" ON activity_log;
CREATE POLICY "Admins can view all activity"
  ON activity_log FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── 2. FIX NOTIFICATION TYPE CONSTRAINT ──
-- supabase-migration-final.sql overwrote this with a restrictive list
-- that excluded new_order, order_updated, new_client, admin_action, etc.
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'project_update', 'message', 'payment', 'report', 'milestone', 'file', 'status',
    'new_order', 'order_updated', 'new_client', 'admin_action',
    'admin_support', 'system',
    'invoice_created', 'invoice_updated', 'invoice_paid', 'invoice_overdue', 'invoice_deleted'
  ));

-- ── 3. FIX DB TRIGGER: HANDLE order_updated ACTION ──
-- The activity-logs-triggers.js logs 'order_updated' for status changes,
-- but the DB trigger only handled 'status_changed'. Also added metadata
-- support and proper handling for admin message notifications.
CREATE OR REPLACE FUNCTION notify_on_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_title TEXT;
  v_message TEXT;
  v_type TEXT;
  v_link TEXT;
  v_metadata JSONB;
BEGIN
  CASE NEW.action
    WHEN 'order_created' THEN
      SELECT user_id INTO v_user_id FROM orders WHERE id = NEW.order_id;
      v_title := 'Order Submitted';
      v_message := NEW.description;
      v_type := 'new_order';
      v_link := '/pages/order-tracking.html?id=' || NEW.order_id;
      v_metadata := jsonb_build_object(
        'trigger', 'new_order',
        'order_id', NEW.order_id,
        'source', 'database_trigger'
      );
    WHEN 'status_changed' THEN
      SELECT user_id INTO v_user_id FROM orders WHERE id = NEW.order_id;
      v_title := 'Status Update';
      v_message := NEW.description;
      v_type := 'order_updated';
      v_link := '/pages/order-tracking.html?id=' || NEW.order_id;
      v_metadata := jsonb_build_object(
        'trigger', 'order_updated',
        'order_id', NEW.order_id,
        'source', 'database_trigger'
      );
    WHEN 'order_updated' THEN
      SELECT user_id INTO v_user_id FROM orders WHERE id = NEW.order_id;
      v_title := 'Order Updated';
      v_message := NEW.description;
      v_type := 'order_updated';
      v_link := '/pages/order-tracking.html?id=' || NEW.order_id;
      v_metadata := jsonb_build_object(
        'trigger', 'order_updated',
        'order_id', NEW.order_id,
        'source', 'database_trigger'
      );
    WHEN 'message_sent' THEN
      SELECT user_id INTO v_user_id FROM orders WHERE id = NEW.order_id;
      v_title := 'New Message';
      v_message := NEW.description;
      v_type := 'message';
      v_link := '/pages/order-tracking.html?id=' || NEW.order_id;
      v_metadata := jsonb_build_object(
        'trigger', 'message',
        'order_id', NEW.order_id,
        'source', 'database_trigger'
      );
    WHEN 'file_uploaded' THEN
      SELECT user_id INTO v_user_id FROM orders WHERE id = NEW.order_id;
      v_title := 'File Uploaded';
      v_message := NEW.description;
      v_type := 'file';
      v_link := '/pages/order-tracking.html?id=' || NEW.order_id;
      v_metadata := jsonb_build_object(
        'trigger', 'file',
        'order_id', NEW.order_id,
        'source', 'database_trigger'
      );
    WHEN 'project_completed' THEN
      SELECT user_id INTO v_user_id FROM orders WHERE id = NEW.order_id;
      v_title := 'Milestone Completed';
      v_message := NEW.description;
      v_type := 'milestone';
      v_link := '/pages/order-tracking.html?id=' || NEW.order_id;
      v_metadata := jsonb_build_object(
        'trigger', 'milestone',
        'order_id', NEW.order_id,
        'source', 'database_trigger'
      );
    WHEN 'invoice_created' THEN
      v_user_id := NEW.user_id;
      v_title := 'Invoice Created';
      v_message := NEW.description;
      v_type := 'invoice_created';
      v_link := '/pages/admin-dashboard.html';
      v_metadata := jsonb_build_object(
        'trigger', 'invoice_created',
        'order_id', NEW.order_id,
        'source', 'database_trigger'
      );
    WHEN 'invoice_paid' THEN
      v_user_id := NEW.user_id;
      v_title := 'Invoice Paid';
      v_message := NEW.description;
      v_type := 'invoice_paid';
      v_link := '/pages/admin-dashboard.html';
      v_metadata := jsonb_build_object(
        'trigger', 'invoice_paid',
        'order_id', NEW.order_id,
        'source', 'database_trigger'
      );
    WHEN 'invoice_updated' THEN
      v_user_id := NEW.user_id;
      v_title := 'Invoice Updated';
      v_message := NEW.description;
      v_type := 'invoice_updated';
      v_link := '/pages/admin-dashboard.html';
      v_metadata := jsonb_build_object(
        'trigger', 'invoice_updated',
        'order_id', NEW.order_id,
        'source', 'database_trigger'
      );
    WHEN 'invoice_deleted' THEN
      v_user_id := NEW.user_id;
      v_title := 'Invoice Deleted';
      v_message := NEW.description;
      v_type := 'invoice_deleted';
      v_link := '/pages/admin-dashboard.html';
      v_metadata := jsonb_build_object(
        'trigger', 'invoice_deleted',
        'order_id', NEW.order_id,
        'source', 'database_trigger'
      );
    ELSE
      RETURN NEW;
  END CASE;

  IF v_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, message, type, link, metadata)
    VALUES (v_user_id, v_title, v_message, v_type, v_link, v_metadata);
  END IF;

  RETURN NEW;
END;
$$;

-- ── 4. RECREATE TRIGGER (idempotent) ──
DROP TRIGGER IF EXISTS trg_notify_on_activity ON activity_log;
CREATE TRIGGER trg_notify_on_activity
  AFTER INSERT ON activity_log
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_activity();
