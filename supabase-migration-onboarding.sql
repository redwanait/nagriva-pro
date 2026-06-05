/* ════════════════════════════════════════════════════════
   NAGRIVA — Onboarding System Migration
   Adds onboarding fields to the profiles table
   ════════════════════════════════════════════════════════ */

-- Add onboarding columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_step INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS user_goal TEXT,
  ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT '{}';

-- Create onboarding_analytics table for tracking
CREATE TABLE IF NOT EXISTS onboarding_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  step INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE onboarding_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analytics"
  ON onboarding_analytics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analytics"
  ON onboarding_analytics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all onboarding analytics"
  ON onboarding_analytics FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding
  ON profiles(id)
  WHERE onboarding_completed = false;

CREATE INDEX IF NOT EXISTS idx_onboarding_analytics_user
  ON onboarding_analytics(user_id, created_at DESC);
