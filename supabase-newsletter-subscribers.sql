/* ════════════════════════════════════════════════════════
   NAGRIVA — Newsletter Subscribers Table & RLS (v2)
   Added: source column, analytics tracking
   ════════════════════════════════════════════════════════ */

-- ── Drop existing table and recreate with full schema ──
DROP TABLE IF EXISTS newsletter_subscribers CASCADE;

CREATE TABLE newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed', 'bounced')),
  source TEXT NOT NULL DEFAULT 'homepage' CHECK (source IN ('homepage', 'newsletter-page', 'footer')),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_newsletter_subscribers_email ON newsletter_subscribers (email);
CREATE INDEX idx_newsletter_subscribers_status ON newsletter_subscribers (status);
CREATE INDEX idx_newsletter_subscribers_source ON newsletter_subscribers (source);
CREATE INDEX idx_newsletter_subscribers_subscribed_at ON newsletter_subscribers (subscribed_at DESC);

-- ── Enable RLS ──
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- ── Public can subscribe (INSERT) ──
CREATE POLICY "Public can subscribe"
  ON newsletter_subscribers FOR INSERT
  WITH CHECK (true);

-- ── Only admins can read / update / delete ──
CREATE POLICY "Admins can read subscribers"
  ON newsletter_subscribers FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update subscribers"
  ON newsletter_subscribers FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete subscribers"
  ON newsletter_subscribers FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── Enable realtime ──
ALTER PUBLICATION supabase_realtime ADD TABLE newsletter_subscribers;

/* ════════════════════════════════════════════════════════
   NEWSLETTER ANALYTICS TABLE
   ════════════════════════════════════════════════════════ */

CREATE TABLE IF NOT EXISTS newsletter_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'signup', 'unsubscribe', 'email_sent', 'email_opened',
    'email_clicked', 'email_bounced', 'welcome_sent'
  )),
  subscriber_id UUID REFERENCES newsletter_subscribers(id) ON DELETE SET NULL,
  email TEXT,
  source TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_newsletter_analytics_event ON newsletter_analytics (event_type);
CREATE INDEX idx_newsletter_analytics_created ON newsletter_analytics (created_at DESC);
CREATE INDEX idx_newsletter_analytics_source ON newsletter_analytics (source);

ALTER TABLE newsletter_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read analytics"
  ON newsletter_analytics FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Insert analytics from trigger"
  ON newsletter_analytics FOR INSERT
  WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE newsletter_analytics;

/* ════════════════════════════════════════════════════════
   EMAIL CAMPAIGNS TABLE (future use)
   ════════════════════════════════════════════════════════ */

CREATE TABLE IF NOT EXISTS newsletter_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  preview_text TEXT,
  body_html TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  recipient_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  bounced_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE newsletter_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage campaigns"
  ON newsletter_campaigns FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

ALTER PUBLICATION supabase_realtime ADD TABLE newsletter_campaigns;

/* ════════════════════════════════════════════════════════
   SUBSCRIBER INSERT TRIGGER — auto-create analytics event
   ════════════════════════════════════════════════════════ */

CREATE OR REPLACE FUNCTION log_newsletter_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO newsletter_analytics (event_type, subscriber_id, email, source, metadata)
  VALUES ('signup', NEW.id, NEW.email, NEW.source,
    jsonb_build_object('signup_source', NEW.source, 'status', NEW.status));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_newsletter_subscribe ON newsletter_subscribers;
CREATE TRIGGER on_newsletter_subscribe
  AFTER INSERT ON newsletter_subscribers
  FOR EACH ROW
  EXECUTE FUNCTION log_newsletter_signup();

/* ════════════════════════════════════════════════════════
   SUBSCRIBER UPDATE TRIGGER — auto-create unsubscribe event
   ════════════════════════════════════════════════════════ */

CREATE OR REPLACE FUNCTION log_newsletter_unsubscribe()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'active' AND NEW.status = 'unsubscribed' THEN
    INSERT INTO newsletter_analytics (event_type, subscriber_id, email, source, metadata)
    VALUES ('unsubscribe', NEW.id, NEW.email, OLD.source,
      jsonb_build_object('previous_status', OLD.status, 'new_status', NEW.status));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_newsletter_unsubscribe ON newsletter_subscribers;
CREATE TRIGGER on_newsletter_unsubscribe
  AFTER UPDATE ON newsletter_subscribers
  FOR EACH ROW
  EXECUTE FUNCTION log_newsletter_unsubscribe();
