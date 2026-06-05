/* ════════════════════════════════════════════════════════
   NAGRIVA — Admin Support Chat + is_read Migration
   Safely adds columns, avoids duplicates, keeps data intact
   ════════════════════════════════════════════════════════ */

-- 1. Add is_read column for unread tracking
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

-- 2. Index for unread queries
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);

-- 3. Index for support conversation queries
CREATE INDEX IF NOT EXISTS idx_messages_support_conv ON messages(conversation_id, created_at);

-- 4. Ensure messages table is in realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;
END
$$;

-- 5. RLS: Admins can view support conversations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'messages'
    AND policyname = 'Admins can view support conversations'
  ) THEN
    CREATE POLICY "Admins can view support conversations"
      ON messages FOR SELECT
      USING (
        order_id IS NULL
        AND conversation_id IS NOT NULL
        AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END
$$;

-- 6. RLS: Admins can update support messages (for marking is_read)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'messages'
    AND policyname = 'Admins can update support messages'
  ) THEN
    CREATE POLICY "Admins can update support messages"
      ON messages FOR UPDATE
      USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END
$$;
