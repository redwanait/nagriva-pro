/* ════════════════════════════════════════════════════════
   NAGRIVA — Invoice Notifications & Activity Integration
   Adds invoice notification types and DB-level triggers
   Run: https://supabase.com/dashboard/project/YOUR_REF/sql/new
   ════════════════════════════════════════════════════════ */

-- ── 1. EXTEND NOTIFICATION TYPES WITH INVOICE TYPES ──
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'project_update', 'message', 'payment', 'report', 'milestone', 'file', 'status',
    'new_order', 'order_updated', 'new_client', 'admin_action',
    'invoice_created', 'invoice_updated', 'invoice_paid', 'invoice_overdue', 'invoice_deleted'
  ));

-- ── 2. UPDATE NOTIFY ON ACTIVITY TO HANDLE INVOICE ACTIONS ──
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

-- ── 3. ENSURE TRIGGER IS ACTIVE ──
DROP TRIGGER IF EXISTS trg_notify_on_activity ON activity_log;
CREATE TRIGGER trg_notify_on_activity
  AFTER INSERT ON activity_log
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_activity();

-- ── 4. ADD DELETE TRIGGER FOR INVOICE ACTIVITY LOGS ──
CREATE OR REPLACE FUNCTION log_invoice_delete_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO activity_log (order_id, user_id, action, description)
  VALUES (
    OLD.order_id,
    OLD.client_id,
    'invoice_deleted',
    'Invoice #' || OLD.invoice_number || ' deleted — $' || OLD.total
  );
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_invoice_delete_activity ON invoices;
CREATE TRIGGER trg_invoice_delete_activity
  BEFORE DELETE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION log_invoice_delete_activity();

-- ── 5. UPDATE INVOICE ACTIVITY LOG FUNCTION TO HANDLE INVOICE_OVERDUE ──
CREATE OR REPLACE FUNCTION log_invoice_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_action TEXT;
  v_description TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'invoice_created';
    v_description := 'Invoice #' || NEW.invoice_number || ' created — $' || NEW.total || ' (' || NEW.status || ')';
  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    v_action := 'invoice_' || NEW.status;
    v_description := 'Invoice #' || NEW.invoice_number || ' ' || NEW.status || ' (was ' || OLD.status || ')';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO activity_log (order_id, user_id, action, description)
  VALUES (NEW.order_id, NEW.client_id, v_action, v_description);

  RETURN NEW;
END;
$$;
