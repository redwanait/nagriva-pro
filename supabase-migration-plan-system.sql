/* ════════════════════════════════════════════════════════
   NAGRIVA — Plan System Migration
   Adds plan column to profiles table.
   Run this ONCE in your Supabase SQL Editor.
   ════════════════════════════════════════════════════════ */

-- ── 1. ADD PLAN COLUMN TO PROFILES ──
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro'));

-- ── 2. INDEX FOR PLAN LOOKUPS ──
CREATE INDEX IF NOT EXISTS idx_profiles_plan ON profiles(plan);

-- ── 3. ALLOW USERS TO READ THEIR OWN PLAN ──
-- (existing RLS policy already allows users to SELECT own profile)

-- ── 4. ALLOW USERS TO UPDATE THEIR OWN PLAN ──
-- (existing RLS policy already allows users to UPDATE own profile)
-- Admins can also update via existing admin policy
