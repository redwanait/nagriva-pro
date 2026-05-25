/* ════════════════════════════════════════════════════════
   NAGRIVA — Services Schema v2
   Adds hero_title, breadcrumb_label columns + fixes unicode
   Run this in your Supabase SQL Editor after v1
   ════════════════════════════════════════════════════════ */

-- ── 1. ADD NEW COLUMNS ──

ALTER TABLE services ADD COLUMN IF NOT EXISTS hero_title TEXT DEFAULT '';
ALTER TABLE services ADD COLUMN IF NOT EXISTS breadcrumb_label TEXT DEFAULT '';

-- ── 2. UPDATE EXISTING DATA ──

UPDATE services SET
  seller_label = 'Premium Digital Agency • Top 1% of Designers'
WHERE seller_label LIKE '%\\u2022%';

UPDATE services SET
  hero_title = 'Premium Web Design That <span class="sp-text-glow">Converts</span>',
  breadcrumb_label = 'Web Design'
WHERE slug = 'web-design';

UPDATE services SET
  hero_title = 'SEO Optimization That <span class="sp-text-glow">Dominates</span> Search',
  breadcrumb_label = 'SEO'
WHERE slug = 'seo';

UPDATE services SET
  hero_title = 'Brand Identity That <span class="sp-text-glow">Stands Out</span>',
  breadcrumb_label = 'Brand Identity'
WHERE slug = 'branding';

UPDATE services SET
  hero_title = 'AI Automation That <span class="sp-text-glow">Transforms</span> Workflows',
  breadcrumb_label = 'AI Automation'
WHERE slug = 'ai-automation';

UPDATE services SET
  hero_title = 'Social Media Growth That <span class="sp-text-glow">Amplifies</span> Your Brand',
  breadcrumb_label = 'Social Media'
WHERE slug = 'social-media';

UPDATE services SET
  hero_title = 'Performance Marketing That <span class="sp-text-glow">Delivers</span> ROI',
  breadcrumb_label = 'Performance Marketing'
WHERE slug = 'strategy';
