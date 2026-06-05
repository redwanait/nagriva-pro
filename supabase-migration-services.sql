/* ════════════════════════════════════════════════════════
   Nagriva — Services Database Schema & Seed Data
   Run this in your Supabase SQL Editor
   ════════════════════════════════════════════════════════ */

-- ── 1. CREATE SERVICES TABLE ──

CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  short_description TEXT DEFAULT '',
  full_description TEXT DEFAULT '',
  image TEXT DEFAULT '',
  meta_title TEXT DEFAULT '',
  meta_description TEXT DEFAULT '',
  seller_name TEXT DEFAULT 'Nagriva Agency',
  seller_label TEXT DEFAULT 'Premium Digital Agency \u2022 Top 1% of Designers',
  rating NUMERIC(3,1) DEFAULT 4.9,
  review_count INTEGER DEFAULT 128,
  satisfaction INTEGER DEFAULT 98,
  highlights JSONB DEFAULT '[]',
  gallery JSONB DEFAULT '[]',
  description TEXT DEFAULT '',
  benefits JSONB DEFAULT '[]',
  process JSONB DEFAULT '[]',
  faq JSONB DEFAULT '[]',
  results JSONB DEFAULT '[]',
  packages JSONB DEFAULT '[]',
  trust_items JSONB DEFAULT '[]',
  featured BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. ROW LEVEL SECURITY ──

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Public can read published services
CREATE POLICY "Anyone can view published services"
  ON services FOR SELECT
  USING (status = 'published');

-- Admins can manage all services
CREATE POLICY "Admins can insert services"
  ON services FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update any service"
  ON services FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete services"
  ON services FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── 3. INDEXES ──

CREATE INDEX IF NOT EXISTS idx_services_slug ON services(slug);
CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_services_featured ON services(featured) WHERE featured = true;

-- ── 4. UPDATED_AT TRIGGER ──

CREATE OR REPLACE FUNCTION update_services_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_services_updated_at ON services;
CREATE TRIGGER trigger_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW
  EXECUTE FUNCTION update_services_updated_at();

-- ════════════════════════════════════════════════════════
--  5. SEED DATA
-- ════════════════════════════════════════════════════════

INSERT INTO services (title, slug, category, short_description, full_description, meta_title, meta_description, seller_name, seller_label, rating, review_count, satisfaction, highlights, gallery, description, benefits, process, faq, results, packages, trust_items, image, featured, status) VALUES

(
  'Web Design',
  'web-design',
  'Design & Development',
  'Premium web design that converts visitors into customers. Modern, fast, and conversion-optimized websites.',
  'We build premium, conversion-optimized websites that look stunning and drive measurable growth for your business. Every pixel serves a purpose, every interaction is intentional, and every page is built to convert. From sleek landing pages to complex web applications, our designs are crafted to elevate your brand, engage your audience, and deliver results — fast.',
  'Web Design — Nagriva',
  'Premium web design that converts visitors into customers. Modern, fast, and conversion-optimized websites.',
  'Nagriva Agency',
  'Premium Digital Agency \u2022 Top 1% of Designers',
  4.9, 128, 98,
  '["Conversion-Optimized", "Lightning Fast", "Mobile-First", "SEO-Ready"]',
  '["../assets/images/services/web-design-1.jpg", "../assets/images/services/web-design-2.jpg", "../assets/images/services/web-design-3.jpg"]',
  '<p>We build premium, conversion-optimized websites that look stunning and drive measurable growth for your business. Every pixel serves a purpose, every interaction is intentional, and every page is built to convert.</p><p>From sleek landing pages to complex web applications, our designs are crafted to elevate your brand, engage your audience, and deliver results \u2014 fast.</p>',
  '[{"icon": "layers", "title": "Conversion Focused", "text": "Data-backed design decisions that turn visitors into customers."}, {"icon": "file", "title": "Blazing Fast", "text": "Optimized code, lazy loading, and modern performance practices."}, {"icon": "image", "title": "Premium Aesthetic", "text": "Modern, luxurious design that positions your brand at the top."}, {"icon": "users", "title": "SEO Optimized", "text": "Built with search engines in mind from day one."}]',
  '[{"num": "01", "title": "Discovery & Strategy", "text": "We dive deep into your brand, audience, and goals to craft a strategy that drives results."}, {"num": "02", "title": "Design & Prototype", "text": "High-fidelity designs with interactive prototypes that bring your vision to life."}, {"num": "03", "title": "Development & Testing", "text": "Clean, performant code with rigorous testing across devices and browsers."}, {"num": "04", "title": "Launch & Optimize", "text": "Seamless deployment with ongoing optimization and performance monitoring."}]',
  '[{"question": "How long does a typical web design project take?", "answer": "Timelines vary based on scope. A standard 5-page website takes 3-4 weeks, while more complex projects can take 6-8 weeks. We''ll provide a clear timeline during our discovery call."}, {"question": "What is included in the price?", "answer": "Each package includes custom design, development, content population, basic SEO setup, and 2 rounds of revisions. Higher-tier packages include additional pages, CMS integration, and dedicated support."}, {"question": "Do you offer ongoing maintenance?", "answer": "Yes, we offer monthly maintenance packages to keep your website secure, updated, and performing at its best. Contact us for custom maintenance plans."}, {"question": "Will my website be mobile-friendly?", "answer": "Absolutely. Every website we build is fully responsive and optimized for all devices \u2014 from mobile phones to large desktop screens. We test thoroughly across 20+ device configurations."}]',
  '[{"num": "50+", "label": "Webships Delivered"}, {"num": "4.2x", "label": "Avg. Conversion Lift"}, {"num": "98%", "label": "Client Satisfaction"}, {"num": "2.8x", "label": "Faster Load Times"}]',
  '[{"name": "Starter Package", "shortName": "Starter", "price": "3,499", "delivery": "4-Week Delivery", "revisions": "2 Revisions", "features": ["5-Page Custom Website", "2 Rounds of Revisions", "Basic SEO Setup", "Mobile Responsive", "Contact Form Integration"], "popular": false}, {"name": "Growth Package", "shortName": "Growth", "price": "6,499", "delivery": "6-Week Delivery", "revisions": "Unlimited Revisions", "features": ["10-Page Custom Website", "Unlimited Revisions", "CMS Integration", "Full SEO Optimization", "Analytics Dashboard", "30-Day Support"], "popular": true, "featured": true}, {"name": "Scale Package", "shortName": "Scale", "price": "12K", "delivery": "8-Week Delivery", "revisions": "Unlimited Revisions", "features": ["Custom Pages & Features", "Complete Design System", "Advanced Animations", "Dedicated Project Manager", "Priority Support", "90-Day Maintenance"], "popular": false}]',
  '[{"icon": "lock", "text": "Secure Payment"}, {"icon": "star", "text": "98% Satisfaction"}, {"icon": "clockMeta", "text": "On-Time Delivery"}, {"icon": "users", "text": "Dedicated Support"}, {"icon": "shield", "text": "Money-Back Guarantee"}]',
  '/assets/images/services/web-design-1.jpg',
  true, 'published'
),

(
  'SEO Optimization',
  'seo',
  'Marketing & Growth',
  'Data-driven SEO that drives organic growth. Rank higher, get more traffic, and convert better.',
  'We deliver data-driven SEO strategies that propel your website to the top of search results. Our white-hat approach combines technical expertise, content excellence, and proven link-building tactics to drive sustainable organic growth. From comprehensive site audits to ongoing performance monitoring, every tactic is meticulously executed to maximize your ROI and establish your brand as an authority in your industry.',
  'SEO Optimization — Nagriva',
  'Data-driven SEO that drives organic growth. Rank higher, get more traffic, and convert better.',
  'Nagriva Agency',
  'Premium Digital Agency \u2022 Top 1% of Designers',
  4.9, 128, 98,
  '["Data-Driven", "White Hat", "Industry Leading", "ROI Focused"]',
  '["../assets/images/services/seo-1.jpg", "../assets/images/services/seo-2.jpg", "../assets/images/services/seo-3.jpg"]',
  '<p>We deliver data-driven SEO strategies that propel your website to the top of search results. Our white-hat approach combines technical expertise, content excellence, and proven link-building tactics to drive sustainable organic growth.</p><p>From comprehensive site audits to ongoing performance monitoring, every tactic is meticulously executed to maximize your ROI and establish your brand as an authority in your industry.</p>',
  '[{"icon": "layers", "title": "Data-Driven Strategy", "text": "Comprehensive keyword research and competitive analysis backed by real search data."}, {"icon": "file", "title": "Technical SEO", "text": "Site structure optimization, speed enhancements, schema markup, and mobile-first indexing."}, {"icon": "image", "title": "Content Optimization", "text": "Authority-building content crafted to rank, engage, and convert your target audience."}, {"icon": "clock", "title": "Performance Tracking", "text": "Transparent monthly reports with actionable insights and real-time ranking dashboards."}]',
  '[{"num": "01", "title": "Audit & Research", "text": "In-depth site analysis, competitor benchmarking, and high-value keyword discovery to build your roadmap."}, {"num": "02", "title": "Strategy & Planning", "text": "Custom SEO roadmap with prioritized actions, content calendar, and technical optimization plan."}, {"num": "03", "title": "Implementation", "text": "On-page optimization, technical fixes, content creation, and quality link building executed with precision."}, {"num": "04", "title": "Monitoring & Optimization", "text": "Continuous tracking, A/B testing, and iterative improvements to maximize your rankings and ROI."}]',
  '[{"question": "How long does a typical SEO engagement take?", "answer": "SEO engagements typically run 3-6 months for meaningful results. We recommend a minimum of 6 months to build sustainable organic growth."}, {"question": "What deliverables can I expect?", "answer": "You''ll receive a detailed SEO audit, keyword research report, on-page optimizations, content production, monthly performance reports, and a live ranking dashboard."}, {"question": "How long until I see results?", "answer": "Initial improvements can be seen within 4-6 weeks, with significant ranking gains in 3-6 months. SEO compounds over time."}, {"question": "Do you provide regular reporting?", "answer": "Yes, you''ll get monthly performance reports covering rankings, organic traffic, conversions, and key KPIs. Higher tiers include bi-weekly check-ins."}]',
  '[{"num": "150+", "label": "Clients Served"}, {"num": "4.8x", "label": "Avg. Traffic Growth"}, {"num": "96%", "label": "Client Retention"}, {"num": "3.2x", "label": "Avg. ROI"}]',
  '[{"name": "Starter Package", "shortName": "Starter", "price": "1,999", "delivery": "2-Week Delivery", "revisions": "2 Revisions", "features": ["Keyword Research", "On-Page SEO", "10 Keywords", "Monthly Report", "2 Revisions"], "popular": false}, {"name": "Growth Package", "shortName": "Growth", "price": "3,999", "delivery": "4-Week Delivery", "revisions": "Unlimited Revisions", "features": ["Full SEO Audit", "On-Page + Off-Page SEO", "25 Keywords", "Content Strategy", "4 Reports", "Unlimited Revisions"], "popular": true, "featured": true}, {"name": "Scale Package", "shortName": "Scale", "price": "7,999", "delivery": "8-Week Delivery", "revisions": "Unlimited Revisions", "features": ["Enterprise SEO Strategy", "Technical + Local SEO", "50+ Keywords", "Content Production", "Dedicated Manager", "Priority Support"], "popular": false}]',
  '[{"icon": "lock", "text": "Secure Payment"}, {"icon": "star", "text": "96% Retention"}, {"icon": "clockMeta", "text": "On-Time Delivery"}, {"icon": "users", "text": "Dedicated Support"}, {"icon": "shield", "text": "Money-Back Guarantee"}]',
  '/assets/images/services/seo-1.jpg',
  false, 'published'
),

(
  'Brand Identity',
  'branding',
  'Design & Development',
  'Strategic brand identity design that makes you memorable, credible, and impossible to ignore.',
  'We craft strategic brand identities that make you unforgettable. From logos and color palettes to complete visual systems and brand guidelines \u2014 every element is designed to communicate your unique value, connect with your audience, and set you apart from the competition. Whether you''re launching a new brand or evolving an existing one, our comprehensive approach ensures consistency, credibility, and impact across every touchpoint.',
  'Brand Identity — Nagriva',
  'Strategic brand identity design that makes you memorable, credible, and impossible to ignore.',
  'Nagriva Agency',
  'Premium Digital Agency \u2022 Top 1% of Designers',
  4.9, 128, 98,
  '["Strategic", "Memorable", "Premium", "Consistent"]',
  '["../assets/images/services/branding-1.jpg", "../assets/images/services/branding-2.jpg", "../assets/images/services/branding-3.jpg"]',
  '<p>We craft strategic brand identities that make you unforgettable. From logos and color palettes to complete visual systems and brand guidelines \u2014 every element is designed to communicate your unique value, connect with your audience, and set you apart from the competition.</p><p>Whether you''re launching a new brand or evolving an existing one, our comprehensive approach ensures consistency, credibility, and impact across every touchpoint.</p>',
  '[{"icon": "clockAlt", "title": "Strategic Positioning", "text": "We define your brand''s unique market position to differentiate and dominate."}, {"icon": "layers", "title": "Visual Identity System", "text": "Cohesive logos, colors, typography, and imagery that tell your story."}, {"icon": "fileText", "title": "Brand Guidelines", "text": "Comprehensive rules to ensure consistency across every touchpoint."}, {"icon": "usersPlus", "title": "Market Differentiation", "text": "Stand out with a distinct brand personality that customers remember and trust."}]',
  '[{"num": "01", "title": "Discovery & Research", "text": "We dive into your industry, competitors, audience, and vision to uncover your brand''s core identity."}, {"num": "02", "title": "Brand Strategy", "text": "Define positioning, messaging, personality, and visual direction that aligns with your goals."}, {"num": "03", "title": "Visual Identity", "text": "Craft logo, color palette, typography, and visual system with precision and purpose."}, {"num": "04", "title": "Brand Guidelines", "text": "Deliver a comprehensive guide for consistent brand recognition across all channels."}]',
  '[{"question": "How long does a branding project take?", "answer": "Starter packages take approximately 2 weeks, Growth packages 4 weeks, and Scale packages 6 weeks. We provide a detailed timeline during your discovery call."}, {"question": "What''s included in the branding packages?", "answer": "Every package includes logo design, color palette, typography, and brand board. Higher tiers add guidelines, stationery, iconography, brand strategy, and dedicated management."}, {"question": "What''s the difference between a logo and a full brand identity?", "answer": "A logo is one element of your brand. Full brand identity includes logos, color systems, typography, imagery style, brand voice, guidelines, and applications."}, {"question": "How many revisions can I request?", "answer": "Starter packages include 2 rounds of revisions. Growth and Scale packages include unlimited revisions until you''re satisfied."}]',
  '[{"num": "80+", "label": "Brands Built"}, {"num": "3.5x", "label": "Brand Recognition"}, {"num": "94%", "label": "Client Retention"}, {"num": "4.9", "label": "Star Avg. Rating"}]',
  '[{"name": "Starter Package", "shortName": "Starter", "price": "2,499", "delivery": "2-Week Delivery", "revisions": "2 Revisions", "features": ["Logo Design", "Color Palette", "Typography", "Brand Board", "2 Concepts"], "popular": false}, {"name": "Growth Package", "shortName": "Growth", "price": "4,999", "delivery": "4-Week Delivery", "revisions": "Unlimited Revisions", "features": ["Full Identity Package", "Logo + Variations", "Brand Guidelines", "Stationery", "4 Concepts", "Unlimited Revisions"], "popular": true, "featured": true}, {"name": "Scale Package", "shortName": "Scale", "price": "8,999", "delivery": "6-Week Delivery", "revisions": "Unlimited Revisions", "features": ["Complete Brand System", "Guidelines Book", "Brand Strategy", "Iconography", "Web Assets", "Dedicated Manager + Priority Support"], "popular": false}]',
  '[{"icon": "lock", "text": "Secure Payment"}, {"icon": "star", "text": "94% Retention"}, {"icon": "clockMeta", "text": "On-Time Delivery"}, {"icon": "users", "text": "Dedicated Support"}, {"icon": "shield", "text": "Money-Back Guarantee"}]',
  '/assets/images/services/branding-1.jpg',
  false, 'published'
),

(
  'AI Automation',
  'ai-automation',
  'Technology & Innovation',
  'AI-powered automation that streamlines your business. Save time, reduce costs, and scale faster.',
  'We build intelligent AI automation systems that eliminate repetitive tasks, streamline complex workflows, and unlock new levels of efficiency for your business. From custom AI agents to enterprise-grade pipelines, every solution is designed to scale with you. Whether you need to automate data processing, integrate smart chatbots, or build a fully autonomous operational layer \u2014 our AI engineers deliver future-ready systems that drive real results.',
  'AI Automation — Nagriva',
  'AI-powered automation that streamlines your business. Save time, reduce costs, and scale faster with intelligent workflows.',
  'Nagriva Agency',
  'Premium Digital Agency \u2022 Top 1% of Designers',
  4.9, 128, 98,
  '["Smart Automation", "Custom AI", "Scalable", "Future-Ready"]',
  '["../assets/images/services/ai-automation-1.jpg", "../assets/images/services/ai-automation-2.jpg", "../assets/images/services/ai-automation-3.jpg"]',
  '<p>We build intelligent AI automation systems that eliminate repetitive tasks, streamline complex workflows, and unlock new levels of efficiency for your business. From custom AI agents to enterprise-grade pipelines, every solution is designed to scale with you.</p><p>Whether you need to automate data processing, integrate smart chatbots, or build a fully autonomous operational layer \u2014 our AI engineers deliver future-ready systems that drive real results.</p>',
  '[{"icon": "clockAlt", "title": "Workflow Automation", "text": "End-to-end automation that connects your tools and eliminates manual busywork."}, {"icon": "layers", "title": "Intelligent Processing", "text": "AI-powered data extraction, classification, and decision-making at scale."}, {"icon": "search", "title": "Custom Integrations", "text": "Seamless API connections to your existing stack \u2014 CRM, ERP, email, and more."}, {"icon": "users", "title": "24/7 Operation", "text": "Your automation runs around the clock \u2014 no breaks, no downtime, no limits."}]',
  '[{"num": "01", "title": "Process Analysis", "text": "Map current operations, identify bottlenecks, and pinpoint high-impact automation opportunities."}, {"num": "02", "title": "Solution Design", "text": "Architecture blueprints, workflow diagrams, and AI model selection tailored to your needs."}, {"num": "03", "title": "Implementation", "text": "Rapid build and integration with rigorous testing at every stage of development."}, {"num": "04", "title": "Training & Scale", "text": "Team onboarding, performance monitoring, and iterative optimization for maximum impact."}]',
  '[{"question": "How do you integrate AI into existing workflows?", "answer": "We conduct a deep audit of your current processes, then design custom AI pipelines that connect seamlessly via APIs to your existing tools."}, {"question": "Is my data secure with your AI systems?", "answer": "Enterprise-grade encryption, role-based access control, and GDPR/SOC 2 compliance. Your data never leaves your infrastructure unless configured."}, {"question": "Do you build custom AI or use templates?", "answer": "Every solution is custom-built for your specific use case, tailored to your unique business requirements and challenges."}, {"question": "What kind of support do you provide after launch?", "answer": "Comprehensive training, documentation, and a dedicated support channel. Higher tiers include ongoing monitoring and 24/7 priority support."}]',
  '[{"num": "60+", "label": "Automations Delivered"}, {"num": "12x", "label": "Efficiency Boost"}, {"num": "99.9%", "label": "Uptime Guarantee"}, {"num": "$2M+", "label": "Client Savings"}]',
  '[{"name": "Starter Package", "shortName": "Starter", "price": "3,999", "delivery": "3-Week Delivery", "revisions": "2 Revisions", "features": ["Process Analysis", "Basic Automation", "1 Integration", "Workflow Design", "2 Revisions"], "popular": false}, {"name": "Growth Package", "shortName": "Growth", "price": "7,999", "delivery": "6-Week Delivery", "revisions": "Unlimited Revisions", "features": ["Multi-Process Automation", "3 Integrations", "Custom AI Agent", "Dashboard", "Training", "Unlimited Revisions"], "popular": true, "featured": true}, {"name": "Scale Package", "shortName": "Scale", "price": "15K", "delivery": "10-Week Delivery", "revisions": "Unlimited Revisions", "features": ["Enterprise Automation", "Unlimited Integrations", "Full AI System", "Dedicated Infrastructure", "24/7 Support", "Priority Delivery"], "popular": false}]',
  '[{"icon": "lock", "text": "Secure Payment"}, {"icon": "star", "text": "99.9% Uptime"}, {"icon": "clockMeta", "text": "On-Time Delivery"}, {"icon": "users", "text": "Dedicated Support"}, {"icon": "shield", "text": "Money-Back Guarantee"}]',
  '/assets/images/services/ai-automation-1.jpg',
  false, 'published'
),

(
  'Social Media Growth',
  'social-media',
  'Marketing & Growth',
  'Social media growth that amplifies your brand. Organic and paid strategies to build community and drive engagement.',
  'We build social media growth systems that amplify your brand''s voice and drive measurable engagement. From organic content strategies to paid ad campaigns, every move is data-informed and results-driven. Whether you''re launching a new presence or scaling an existing community, our strategies are designed to grow your following, boost engagement, and deliver a real return on your social investment.',
  'Social Media Growth — Nagriva',
  'Social media growth that amplifies your brand. Organic and paid strategies to build community, drive engagement, and scale followers.',
  'Nagriva Agency',
  'Premium Digital Agency \u2022 Top 1% of Designers',
  4.9, 128, 98,
  '["Organic Growth", "Paid Strategy", "Content Led", "Engagement Driven"]',
  '["../assets/images/services/social-media-1.jpg", "../assets/images/services/social-media-2.jpg", "../assets/images/services/social-media-3.jpg"]',
  '<p>We build social media growth systems that amplify your brand''s voice and drive measurable engagement. From organic content strategies to paid ad campaigns, every move is data-informed and results-driven.</p><p>Whether you''re launching a new presence or scaling an existing community, our strategies are designed to grow your following, boost engagement, and deliver a real return on your social investment.</p>',
  '[{"icon": "edit", "title": "Content Strategy", "text": "Data-backed content calendars and creative direction tailored to your brand voice."}, {"icon": "users", "title": "Community Management", "text": "Active engagement with your audience to build loyalty and drive conversations."}, {"icon": "image", "title": "Paid Advertising", "text": "Targeted ad campaigns optimized for reach, engagement, and conversions."}, {"icon": "file", "title": "Analytics & Reporting", "text": "Transparent monthly reports with insights and recommendations for continuous growth."}]',
  '[{"num": "01", "title": "Audit & Strategy", "text": "Analyze current presence, audience, and competitors to build a custom growth roadmap."}, {"num": "02", "title": "Content Creation", "text": "High-quality visuals, copy, and media designed to stop the scroll and spark engagement."}, {"num": "03", "title": "Community Engagement", "text": "Daily monitoring, replies, and proactive interaction to build a loyal following."}, {"num": "04", "title": "Optimize & Scale", "text": "Data-driven optimization and scaling of what works to maximize reach and results."}]',
  '[{"question": "Which social media platforms do you manage?", "answer": "We manage all major platforms including Instagram, TikTok, LinkedIn, Twitter/X, Facebook, and YouTube, tailored to your brand."}, {"question": "Do you create the content or do I provide it?", "answer": "We handle full content creation including graphics, copywriting, video editing, and motion design. We can also work with your existing assets."}, {"question": "How long before I see results?", "answer": "Measurable engagement growth within 4-6 weeks. Significant follower and conversion growth in 2-3 months."}, {"question": "Do you provide detailed reports?", "answer": "Yes, every package includes a monthly performance report with key metrics, growth trends, content analysis, and recommendations."}]',
  '[{"num": "200+", "label": "Campaigns Run"}, {"num": "5.6x", "label": "Engagement Rate"}, {"num": "150K+", "label": "Followers Grown"}, {"num": "4.2x", "label": "Avg. ROAS"}]',
  '[{"name": "Starter Package", "shortName": "Starter", "price": "1,499", "delivery": "2-Week Delivery", "revisions": "2 Revisions", "features": ["Content Calendar", "8 Posts/Month", "Hashtag Strategy", "Monthly Report", "2 Revisions"], "popular": false}, {"name": "Growth Package", "shortName": "Growth", "price": "3,499", "delivery": "4-Week Delivery", "revisions": "Unlimited Revisions", "features": ["Full Management", "16 Posts/Month", "Stories + Reels", "Community Engagement", "Paid Ads Setup", "Unlimited Revisions"], "popular": true, "featured": true}, {"name": "Scale Package", "shortName": "Scale", "price": "6,999", "delivery": "6-Week Delivery", "revisions": "Unlimited Revisions", "features": ["Complete Growth System", "30+ Posts/Month", "Full Ad Management", "Influencer Strategy", "Dedicated Manager", "Priority Support"], "popular": false}]',
  '[{"icon": "lock", "text": "Secure Payment"}, {"icon": "star", "text": "5.6x Engagement"}, {"icon": "clockMeta", "text": "On-Time Delivery"}, {"icon": "users", "text": "Dedicated Support"}, {"icon": "shield", "text": "Money-Back Guarantee"}]',
  '/assets/images/services/social-media-1.jpg',
  false, 'published'
),

(
  'Performance Marketing',
  'strategy',
  'Marketing & Growth',
  'Data-driven performance marketing that delivers measurable ROI. Full-funnel campaigns across all channels.',
  'We build data-driven performance marketing campaigns that deliver measurable ROI across every channel. From paid media strategy to conversion optimization, every dollar is tracked, optimized, and scaled for maximum impact. Our full-funnel approach ensures your brand reaches the right audience at every stage \u2014 from awareness to conversion \u2014 with real-time analytics driving every decision.',
  'Performance Marketing — Nagriva',
  'Data-driven performance marketing that delivers measurable ROI. Full-funnel campaigns across all channels, optimized for conversions.',
  'Nagriva Agency',
  'Premium Digital Agency \u2022 Top 1% of Designers',
  4.9, 128, 98,
  '["Data-Driven", "Full Funnel", "Multi-Channel", "ROI Guaranteed"]',
  '["../assets/images/services/performance-marketing-1.jpg", "../assets/images/services/performance-marketing-2.jpg", "../assets/images/services/performance-marketing-3.jpg"]',
  '<p>We build data-driven performance marketing campaigns that deliver measurable ROI across every channel. From paid media strategy to conversion optimization, every dollar is tracked, optimized, and scaled for maximum impact.</p><p>Our full-funnel approach ensures your brand reaches the right audience at every stage \u2014 from awareness to conversion \u2014 with real-time analytics driving every decision.</p>',
  '[{"icon": "layers", "title": "Paid Media Strategy", "text": "Strategic ad placements across Google, Meta, LinkedIn, and more for maximum ROI."}, {"icon": "file", "title": "Conversion Optimization", "text": "Landing pages, funnels, and creative refined through continuous A/B testing."}, {"icon": "image", "title": "Multi-Channel Campaigns", "text": "Integrated campaigns across search, social, display, and programmatic channels."}, {"icon": "users", "title": "Real-Time Analytics", "text": "Live dashboards with actionable insights and transparent performance reporting."}]',
  '[{"num": "01", "title": "Market Research", "text": "In-depth audience analysis, competitor benchmarking, and channel selection for maximum impact."}, {"num": "02", "title": "Campaign Strategy", "text": "Data-backed architecture with tailored messaging, budget allocation, and creative direction."}, {"num": "03", "title": "Execution & Testing", "text": "Rigorous A/B testing across audiences, creatives, and placements to find winning combinations."}, {"num": "04", "title": "Scale & Optimize", "text": "Continuous optimization and budget scaling based on real-time performance and ROAS targets."}]',
  '[{"question": "Which advertising channels do you work with?", "answer": "Google Ads, Meta (Facebook/Instagram), LinkedIn, TikTok, Pinterest, and programmatic networks."}, {"question": "What is the minimum ad budget required?", "answer": "A minimum monthly ad spend of $2,000 is recommended. Packages start at $2,499 for management fees; ad spend is billed separately."}, {"question": "How do you track and attribute conversions?", "answer": "We use multi-touch attribution models with Google Tag Manager, server-side tracking, and CRM integration."}, {"question": "What does your reporting cadence look like?", "answer": "Weekly performance snapshots and comprehensive monthly reports. Enterprise clients get real-time dashboard access and weekly strategy calls."}]',
  '[{"num": "300+", "label": "Campaigns Managed"}, {"num": "6.2x", "label": "Avg. ROAS"}, {"num": "95%", "label": "Client Retention"}, {"num": "$10M+", "label": "Ad Spend Managed"}]',
  '[{"name": "Starter Package", "shortName": "Starter", "price": "2,499", "delivery": "2-Week Delivery", "revisions": "2 Revisions", "features": ["Channel Strategy", "Ad Creative", "1 Platform", "Basic Tracking", "Monthly Report", "2 Revisions"], "popular": false}, {"name": "Growth Package", "shortName": "Growth", "price": "4,999", "delivery": "4-Week Delivery", "revisions": "Unlimited Revisions", "features": ["Full Funnel Strategy", "3 Platforms", "Audience Research", "A/B Testing", "Analytics Dashboard", "Unlimited Revisions"], "popular": true, "featured": true}, {"name": "Scale Package", "shortName": "Scale", "price": "9,999", "delivery": "6-Week Delivery", "revisions": "Unlimited Revisions", "features": ["Enterprise Growth", "All Platforms", "Custom Attribution", "Dedicated Team", "24/7 Optimization", "Priority Support"], "popular": false}]',
  '[{"icon": "lock", "text": "Secure Payment"}, {"icon": "star", "text": "6.2x Avg. ROAS"}, {"icon": "clockMeta", "text": "On-Time Delivery"}, {"icon": "users", "text": "Dedicated Support"}, {"icon": "shield", "text": "Money-Back Guarantee"}]',
  '/assets/images/services/performance-marketing-1.jpg',
  false, 'published'
);

-- ── 6. ADD IMAGE COLUMN (for existing tables) ──

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'services' AND column_name = 'image'
  ) THEN
    ALTER TABLE services ADD COLUMN image TEXT DEFAULT '';
  END IF;
END $$;
