/* ════════════════════════════════════════════════════════
   NAGRIVA — Support Chat Migration
   Removes order requirement for support conversations
   Must be run AFTER supabase-schema.sql
   ════════════════════════════════════════════════════════ */

-- 1. Allow support messages without an order
ALTER TABLE messages ALTER COLUMN order_id DROP NOT NULL;

-- 2. Add conversation_id for grouping support messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS conversation_id UUID;

-- 3. Index for support conversation lookups
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);

-- 4. Helper: check if a user participated in a conversation (bypasses RLS recursion)
CREATE OR REPLACE FUNCTION is_conversation_participant(conv_id UUID, uid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM messages
    WHERE conversation_id = conv_id
      AND user_id = uid
    LIMIT 1
  );
END;
$$;

-- 5. RLS: Users can view support messages in their conversations
--    Shows own messages + admin replies in the same conversation
CREATE POLICY "Users can view support conversations"
  ON messages FOR SELECT
  USING (
    order_id IS NULL
    AND conversation_id IS NOT NULL
    AND (
      user_id = auth.uid()
      OR is_conversation_participant(conversation_id, auth.uid())
    )
  );

-- 6. RLS: Users can insert support messages (no order required)
CREATE POLICY "Users can insert support messages"
  ON messages FOR INSERT
  WITH CHECK (
    order_id IS NULL
    AND conversation_id IS NOT NULL
    AND auth.uid() = user_id
  );
