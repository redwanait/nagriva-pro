-- ════════════════════════════════════════════════════════
-- NAGRIVA — Payments Schema
-- Complete payment tracking, history, and revenue system
-- ════════════════════════════════════════════════════════

-- ─── Payments Table ───
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  client_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'refunded', 'failed')),
  payment_method TEXT,
  payment_intent TEXT,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Payment History Table ───
CREATE TABLE IF NOT EXISTS payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  client_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'refunded', 'failed')),
  changed_from TEXT CHECK (changed_from IN ('pending', 'paid', 'refunded', 'failed')),
  changed_to TEXT CHECK (changed_to IN ('pending', 'paid', 'refunded', 'failed')),
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Indexes ───
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_client_id ON payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON payments(paid_at);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);
CREATE INDEX IF NOT EXISTS idx_payment_history_payment_id ON payment_history(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_order_id ON payment_history(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_status ON payment_history(status);
CREATE INDEX IF NOT EXISTS idx_payment_history_created_at ON payment_history(created_at);

-- ─── Updated At Trigger ───
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ─── Payment History Auto-Logging ───
CREATE OR REPLACE FUNCTION log_payment_history()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO payment_history (payment_id, order_id, client_id, amount, status, changed_from, changed_to, payment_method, notes)
  VALUES (
    NEW.id,
    NEW.order_id,
    NEW.client_id,
    NEW.amount,
    NEW.status,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
    NEW.status,
    NEW.payment_method,
    CASE
      WHEN TG_OP = 'INSERT' THEN 'Payment created: $' || NEW.amount || ' (' || NEW.status || ')'
      ELSE 'Payment status changed: ' || COALESCE(OLD.status, 'none') || ' → ' || NEW.status
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER log_payment_history_trigger
  AFTER INSERT OR UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION log_payment_history();

-- ─── Payment Activity Logging ───
CREATE OR REPLACE FUNCTION log_payment_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_action TEXT;
  v_description TEXT;
  v_order_id UUID;
  v_user_id UUID;
BEGIN
  v_order_id := NEW.order_id;
  v_user_id := NEW.client_id;

  IF TG_OP = 'INSERT' THEN
    v_action := 'payment_created';
    v_description := 'Payment of $' || NEW.amount || ' created — ' || NEW.status;
  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    v_action := 'payment_' || NEW.status;
    v_description := 'Payment $' || NEW.amount || ' ' || NEW.status || ' (was ' || OLD.status || ')';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO activity_log (order_id, user_id, action, description)
  VALUES (v_order_id, v_user_id, v_action, v_description);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER log_payment_activity_trigger
  AFTER INSERT OR UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION log_payment_activity();

-- ─── RLS Policies ───
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- Admins can see all payments
CREATE POLICY "Admins can read all payments"
  ON payments FOR SELECT
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- Admins can insert payments
CREATE POLICY "Admins can insert payments"
  ON payments FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- Admins can update payments
CREATE POLICY "Admins can update payments"
  ON payments FOR UPDATE
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'))
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- Admins can delete payments
CREATE POLICY "Admins can delete payments"
  ON payments FOR DELETE
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- Clients can see their own payments
CREATE POLICY "Clients can read own payments"
  ON payments FOR SELECT
  USING (client_id = auth.uid());

-- Payment history: admins see all
CREATE POLICY "Admins can read all payment history"
  ON payment_history FOR SELECT
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- Payment history: clients see own
CREATE POLICY "Clients can read own payment history"
  ON payment_history FOR SELECT
  USING (client_id = auth.uid());

-- Payment history: admins can insert
CREATE POLICY "Admins can insert payment history"
  ON payment_history FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- ─── Realtime Publication ───
ALTER PUBLICATION supabase_realtime ADD TABLE payments;
ALTER PUBLICATION supabase_realtime ADD TABLE payment_history;

-- ─── Revenue Calculation Function ───
CREATE OR REPLACE FUNCTION get_revenue_summary()
RETURNS TABLE (
  total_revenue DECIMAL,
  pending_amount DECIMAL,
  paid_amount DECIMAL,
  refunded_amount DECIMAL,
  failed_amount DECIMAL,
  payment_count BIGINT,
  paid_count BIGINT,
  pending_count BIGINT,
  refunded_count BIGINT,
  failed_count BIGINT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) AS total_revenue,
    COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) AS pending_amount,
    COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) AS paid_amount,
    COALESCE(SUM(CASE WHEN status = 'refunded' THEN amount ELSE 0 END), 0) AS refunded_amount,
    COALESCE(SUM(CASE WHEN status = 'failed' THEN amount ELSE 0 END), 0) AS failed_amount,
    COUNT(*)::BIGINT AS payment_count,
    COUNT(*) FILTER (WHERE status = 'paid')::BIGINT AS paid_count,
    COUNT(*) FILTER (WHERE status = 'pending')::BIGINT AS pending_count,
    COUNT(*) FILTER (WHERE status = 'refunded')::BIGINT AS refunded_count,
    COUNT(*) FILTER (WHERE status = 'failed')::BIGINT AS failed_count
  FROM payments;
END;
$$;

-- ─── Monthly Revenue Function ───
CREATE OR REPLACE FUNCTION get_monthly_revenue(months_back INT DEFAULT 6)
RETURNS TABLE (
  month TEXT,
  year INT,
  month_num INT,
  revenue DECIMAL,
  count BIGINT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    TO_CHAR(paid_at, 'Mon') AS month,
    EXTRACT(YEAR FROM paid_at)::INT AS year,
    EXTRACT(MONTH FROM paid_at)::INT AS month_num,
    COALESCE(SUM(amount), 0) AS revenue,
    COUNT(*)::BIGINT AS count
  FROM payments
  WHERE status = 'paid'
    AND paid_at >= DATE_TRUNC('month', NOW()) - (months_back || ' months')::INTERVAL
  GROUP BY year, month_num, TO_CHAR(paid_at, 'Mon')
  ORDER BY year, month_num;
END;
$$;
