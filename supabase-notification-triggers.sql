/* ════════════════════════════════════════════════════════
   NAGRIVA — Notification Triggers Migration
   Adds new notification types and metadata support
════════════════════════════════════════════════════════ */

-- ── 1. EXTEND NOTIFICATION TYPES ──
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'project_update', 'message', 'payment', 'report', 'milestone', 'file', 'status',
    'new_order', 'order_updated', 'new_client', 'admin_action'
  ));

-- ── 2. ADD METADATA COLUMN ──
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- ── 3. INDEX FOR METADATA LOOKUPS ──
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_metadata ON notifications USING gin(metadata);

-- ── 4. UPDATE NOTIFICATION TRIGGER FUNCTION TO HANDLE NEW TYPES ──
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

-- ── 5. DROP AND RE-CREATE TRIGGER (idempotent) ──
DROP TRIGGER IF EXISTS trg_notify_on_activity ON activity_log;
CREATE TRIGGER trg_notify_on_activity
  AFTER INSERT ON activity_log
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_activity();
