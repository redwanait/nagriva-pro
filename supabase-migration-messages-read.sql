/* ════════════════════════════════════════════════════════
   NAGRIVA — Message Read Status Table
   Tracks per-user read status per order conversation
   ════════════════════════════════════════════════════════ */

CREATE TABLE IF NOT EXISTS message_read_status (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, order_id)
);

ALTER TABLE message_read_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own read status"
  ON message_read_status FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all read status"
  ON message_read_status FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_message_read_status_user ON message_read_status(user_id);
CREATE INDEX IF NOT EXISTS idx_message_read_status_order ON message_read_status(order_id);

/* ─── Enable Realtime for messages table if not already ─── */
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
