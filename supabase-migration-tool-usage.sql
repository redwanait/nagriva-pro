/* ════════════════════════════════════════════════════════
   NAGRIVA — Tool Usage Analytics
   Tracks every tool use per user for dashboard analytics.
   ════════════════════════════════════════════════════════ */

CREATE TABLE IF NOT EXISTS tool_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE tool_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tool usage"
  ON tool_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tool usage"
  ON tool_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all tool usage"
  ON tool_usage FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_tool_usage_user_id ON tool_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_tool_usage_created_at ON tool_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_tool_usage_user_tool ON tool_usage(user_id, tool_name);
CREATE INDEX IF NOT EXISTS idx_tool_usage_user_date ON tool_usage(user_id, created_at);
