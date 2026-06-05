/* ════════════════════════════════════════════════════════
   NAGRIVA — Final Consolidated Migration
   Run this ONCE in your Supabase SQL Editor.
   ════════════════════════════════════════════════════════ */

-- ── 1. ENSURE ALL COLUMNS EXIST ON ORDERS ──
ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS service TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS project_title TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS additional_notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Migrate data from old columns to new columns
UPDATE orders SET service = COALESCE(service_type, '') WHERE service IS NULL;
UPDATE orders SET project_title = COALESCE(project_name, '') WHERE project_title IS NULL;
UPDATE orders SET client_name = COALESCE(client_name, project_name, '') WHERE client_name IS NULL;

-- ── 2. UPDATE STATUS CONSTRAINT ──
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'in_progress', 'revision', 'completed'));

-- Migrate existing statuses
UPDATE orders SET status = 'completed' WHERE status IN ('delivered', 'cancelled');
UPDATE orders SET status = 'revision' WHERE status = 'review';

-- ── 3. ADD ORDERS TABLE EXTRA COLUMNS ──
ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_email TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_phone TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- ── 4. COMPOSITE INDEXES FOR PERFORMANCE ──
CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_client_name ON orders(client_name);
CREATE INDEX IF NOT EXISTS idx_orders_service ON orders(service);
CREATE INDEX IF NOT EXISTS idx_orders_project_title ON orders(project_title);
CREATE INDEX IF NOT EXISTS idx_orders_user_id_status ON orders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_client_id_status ON orders(client_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at_date ON orders(created_at::date);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_role ON messages(sender_role);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_action ON activity_log(action);
CREATE INDEX IF NOT EXISTS idx_activity_created_at ON activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- ── 5. ENSURE ALL TABLES IN REALTIME PUBLICATION ──
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY['notifications', 'messages', 'files', 'activity_log', 'orders', 'profiles'];
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', tbl);
    END IF;
  END LOOP;
END $$;

-- ── 6. ADD NOTIFICATIONS TRIGGER FOR AUTO-CREATE ──
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
BEGIN
  -- Determine notification based on action
  CASE NEW.action
    WHEN 'order_created' THEN
      SELECT user_id INTO v_user_id FROM orders WHERE id = NEW.order_id;
      v_title := 'Order Submitted';
      v_message := NEW.description;
      v_type := 'project_update';
      v_link := '/pages/order-tracking.html?id=' || NEW.order_id;
    WHEN 'status_changed' THEN
      SELECT user_id INTO v_user_id FROM orders WHERE id = NEW.order_id;
      v_title := 'Status Update';
      v_message := NEW.description;
      v_type := 'project_update';
      v_link := '/pages/order-tracking.html?id=' || NEW.order_id;
    WHEN 'message_sent' THEN
      SELECT user_id INTO v_user_id FROM orders WHERE id = NEW.order_id;
      v_title := 'New Message';
      v_message := NEW.description;
      v_type := 'message';
      v_link := '/pages/order-tracking.html?id=' || NEW.order_id;
    WHEN 'file_uploaded' THEN
      SELECT user_id INTO v_user_id FROM orders WHERE id = NEW.order_id;
      v_title := 'File Uploaded';
      v_message := NEW.description;
      v_type := 'project_update';
      v_link := '/pages/order-tracking.html?id=' || NEW.order_id;
    WHEN 'project_completed' THEN
      SELECT user_id INTO v_user_id FROM orders WHERE id = NEW.order_id;
      v_title := 'Milestone Completed';
      v_message := NEW.description;
      v_type := 'milestone';
      v_link := '/pages/order-tracking.html?id=' || NEW.order_id;
    ELSE
      RETURN NEW;
  END CASE;

  IF v_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (v_user_id, v_title, v_message, v_type, v_link);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_activity ON activity_log;
CREATE TRIGGER trg_notify_on_activity
  AFTER INSERT ON activity_log
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_activity();

-- ── 7. UPDATE NOTIFICATIONS TYPE CHECK ──
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('project_update', 'message', 'payment', 'report', 'milestone', 'file', 'status'));

-- ── 8. PROFILES: ADD PHONE AND COMPANY ──
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_active TIMESTAMPTZ;

-- ── 9. ADD ACTIVITY LOG FOR PROFILE UPDATES ──
CREATE OR REPLACE FUNCTION log_profile_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF OLD.full_name IS DISTINCT FROM NEW.full_name OR OLD.phone IS DISTINCT FROM NEW.phone OR OLD.company IS DISTINCT FROM NEW.company THEN
    INSERT INTO activity_log (order_id, user_id, action, description)
    VALUES ('00000000-0000-0000-0000-000000000000', NEW.id, 'profile_updated', 'Profile updated: ' || COALESCE(NEW.full_name, 'Unknown'));
  END IF;
  RETURN NEW;
END;
$$;

-- ── 10. STORAGE BUCKETS ──
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('order-files', 'order-files', true, 52428800, NULL)
ON CONFLICT (id) DO NOTHING;

-- ── 11. DROP ANY REMAINING PUBLIC POLICIES ──
DROP POLICY IF EXISTS "Allow public read orders" ON orders;
DROP POLICY IF EXISTS "Allow public insert orders" ON orders;
DROP POLICY IF EXISTS "Allow public update orders" ON orders;
DROP POLICY IF EXISTS "Allow public delete orders" ON orders;

-- ── 12. STORAGE RLS POLICIES ──
DROP POLICY IF EXISTS "Order files are publicly readable" ON storage.objects;
CREATE POLICY "Order files are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'order-files');

DROP POLICY IF EXISTS "Authenticated users can upload order files" ON storage.objects;
CREATE POLICY "Authenticated users can upload order files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'order-files' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can manage all order files" ON storage.objects;
CREATE POLICY "Admins can manage all order files"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'order-files'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
