/* ════════════════════════════════════════════════════════
   NAGRIVA — Navbar Backend System Migration
   Complete realtime navbar backend for admin dashboard:
     • user_profiles table (email column)
     • notifications table (extended types)
     • messages (is_read support)
     • realtime publications
     • profile sync functions
   ════════════════════════════════════════════════════════ */

-- ── 1. ADD EMAIL COLUMN TO PROFILES ──
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- ── 2. UPDATE AUTO-PROFILE CREATION ON SIGNUP ──
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, full_name, avatar_url, email, role)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'role',
      CASE WHEN NEW.email = 'admin@nagriva.com' THEN 'admin' ELSE 'client' END
    )
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── 3. SYNC EMAIL FROM AUTH TO PROFILES ON UPDATE ──
CREATE OR REPLACE FUNCTION sync_auth_email_to_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET email = NEW.email
  WHERE id = NEW.id
    AND (email IS DISTINCT FROM NEW.email);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_sync ON auth.users;
CREATE TRIGGER on_auth_user_email_sync
  AFTER INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_auth_email_to_profile();

-- ── 4. SYNC EXISTING EMAILS ──
UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
  AND (p.email IS NULL OR p.email != u.email);

-- ── 5. ENABLE REALTIME FOR PROFILES ──
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- ── 6. ADD is_read TO MESSAGES ──
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT false;

-- ── 7. EXTEND NOTIFICATION TYPES ──
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'project_update', 'message', 'payment', 'report', 'milestone',
    'file', 'status', 'new_order', 'order_updated', 'new_client',
    'admin_action', 'admin_support', 'system'
  ));

-- ── 8. INDEXES FOR NAVBAR QUERIES ──
CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON notifications(user_id, is_read)
  WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_messages_unread_admin
  ON messages(order_id, sender_role, is_read)
  WHERE sender_role = 'client' AND is_read = false;

CREATE INDEX IF NOT EXISTS idx_messages_sender_role
  ON messages(order_id, sender_role, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- ── 9. ENSURE REALTIME PUBLICATIONS ──
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS messages;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS profiles;

-- ── 10. UPDATE PROFILES RLS: allow admin to insert profiles ──
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Service role can manage profiles" ON profiles;
CREATE POLICY "Service role can manage profiles"
  ON profiles FOR ALL
  USING (auth.role() = 'service_role');

-- ── 11. CREATE SUPPORT CONVERSATIONS TABLE ──
CREATE TABLE IF NOT EXISTS support_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'pending')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE support_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own support conversations"
  ON support_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all support conversations"
  ON support_conversations FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can create support conversations"
  ON support_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE support_conversations;

-- ── 12. CREATE SUPPORT MESSAGES TABLE ──
CREATE TABLE IF NOT EXISTS support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES support_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  sender_role TEXT NOT NULL CHECK (sender_role IN ('admin', 'user')),
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in own conversations"
  ON support_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM support_conversations
      WHERE support_conversations.id = support_messages.conversation_id
        AND support_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages in own conversations"
  ON support_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM support_conversations
      WHERE support_conversations.id = support_messages.conversation_id
        AND support_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all support messages"
  ON support_messages FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

ALTER PUBLICATION supabase_realtime ADD TABLE support_messages;

-- ── 13. INDEXES FOR SUPPORT ──
CREATE INDEX IF NOT EXISTS idx_support_messages_unread_admin
  ON support_messages(conversation_id, sender_role, is_read)
  WHERE sender_role = 'user' AND is_read = false;

CREATE INDEX IF NOT EXISTS idx_support_conversations_user
  ON support_conversations(user_id, updated_at DESC);
