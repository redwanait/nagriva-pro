/* ════════════════════════════════════════════════════════
   NAGRIVA — Subscription System Migration
   Creates subscriptions table, adds Stripe fields to profiles,
   sets up RLS, and creates sync function.
   Run this ONCE in your Supabase SQL Editor.
   ════════════════════════════════════════════════════════ */

-- ── 1. ADD STRIPE CUSTOMER ID TO PROFILES ──
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON profiles(stripe_customer_id);

-- ── 2. CREATE SUBSCRIPTIONS TABLE ──
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  stripe_price_id TEXT,
  status TEXT NOT NULL DEFAULT 'incomplete'
    CHECK (status IN ('active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'trialing', 'unpaid', 'paused')),
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- ── 3. ENABLE RLS ON SUBSCRIPTIONS ──
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- ── 4. RLS POLICIES FOR SUBSCRIPTIONS ──
CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscription"
  ON subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription"
  ON subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all subscriptions"
  ON subscriptions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── 5. CREATE OR REPLACE SYNCHRONIZATION FUNCTION ──
CREATE OR REPLACE FUNCTION sync_subscription_plan()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a subscription becomes active/trialing, set plan to pro
  IF NEW.status IN ('active', 'trialing') AND (OLD IS NULL OR OLD.status NOT IN ('active', 'trialing')) THEN
    UPDATE profiles SET plan = 'pro', updated_at = NOW() WHERE id = NEW.user_id;
  -- When a subscription becomes inactive/canceled/expired, set plan to free
  ELSIF NEW.status IN ('canceled', 'incomplete_expired', 'unpaid', 'paused') AND (OLD IS NULL OR OLD.status IN ('active', 'trialing')) THEN
    UPDATE profiles SET plan = 'free', updated_at = NOW() WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_subscription_plan ON subscriptions;
CREATE TRIGGER trg_sync_subscription_plan
  AFTER INSERT OR UPDATE OF status ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION sync_subscription_plan();

-- ── 6. UPDATED_AT TRIGGER FOR SUBSCRIPTIONS ──
DROP TRIGGER IF EXISTS subscriptions_updated_at ON subscriptions;
CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 7. ADD REALTIME FOR SUBSCRIPTIONS ──
ALTER PUBLICATION supabase_realtime ADD TABLE subscriptions;
