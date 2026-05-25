-- ════════════════════════════════════════════════════════
-- NAGRIVA — Invoices Schema
-- Complete invoicing, billing, and revenue tracking system
-- ════════════════════════════════════════════════════════

-- ─── Invoices Table ───
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invoice_number TEXT UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
  tax DECIMAL(10,2) DEFAULT 0 CHECK (tax >= 0),
  total DECIMAL(10,2) NOT NULL CHECK (total >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled', 'refunded')),
  issued_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  paid_date DATE,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ───
CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_issued_date ON invoices(issued_date);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_metadata ON invoices USING GIN (metadata);

-- ─── Updated At Trigger ───
CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ─── Invoice Activity Logging ───
CREATE OR REPLACE FUNCTION log_invoice_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_action TEXT;
  v_description TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'invoice_created';
    v_description := 'Invoice #' || NEW.invoice_number || ' created — $' || NEW.total || ' (' || NEW.status || ')';
  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    v_action := 'invoice_' || NEW.status;
    v_description := 'Invoice #' || NEW.invoice_number || ' ' || NEW.status || ' (was ' || OLD.status || ')';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO activity_log (order_id, user_id, action, description)
  VALUES (NEW.order_id, NEW.client_id, v_action, v_description);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER log_invoice_activity_trigger
  AFTER INSERT OR UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION log_invoice_activity();

-- ─── RLS Policies ───
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Admins can read all invoices
CREATE POLICY "Admins can read all invoices"
  ON invoices FOR SELECT
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- Admins can insert invoices
CREATE POLICY "Admins can insert invoices"
  ON invoices FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- Admins can update invoices
CREATE POLICY "Admins can update invoices"
  ON invoices FOR UPDATE
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'))
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- Admins can delete invoices
CREATE POLICY "Admins can delete invoices"
  ON invoices FOR DELETE
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- Clients can read their own invoices
CREATE POLICY "Clients can read own invoices"
  ON invoices FOR SELECT
  USING (client_id = auth.uid());

-- ─── Invoice Number Generation ───
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  year TEXT := to_char(NOW(), 'YYYY');
  seq INT;
  num TEXT;
BEGIN
  SELECT COALESCE(MAX(SUBSTRING(invoice_number FROM '\d{4}$')::INT), 0) + 1
  INTO seq
  FROM invoices
  WHERE invoice_number LIKE 'INV-' || year || '-%';

  num := LPAD(seq::TEXT, 4, '0');
  RETURN 'INV-' || year || '-' || num;
END;
$$;

-- ─── Realtime Publication ───
ALTER PUBLICATION supabase_realtime ADD TABLE invoices;

-- ─── Invoice Summary Functions ───
CREATE OR REPLACE FUNCTION get_invoice_summary()
RETURNS TABLE (
  total_invoices BIGINT,
  paid_count BIGINT,
  pending_count BIGINT,
  overdue_count BIGINT,
  cancelled_count BIGINT,
  refunded_count BIGINT,
  total_amount DECIMAL,
  paid_amount DECIMAL,
  pending_amount DECIMAL,
  overdue_amount DECIMAL
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_invoices,
    COUNT(*) FILTER (WHERE status = 'paid')::BIGINT AS paid_count,
    COUNT(*) FILTER (WHERE status = 'pending')::BIGINT AS pending_count,
    COUNT(*) FILTER (WHERE status = 'overdue')::BIGINT AS overdue_count,
    COUNT(*) FILTER (WHERE status = 'cancelled')::BIGINT AS cancelled_count,
    COUNT(*) FILTER (WHERE status = 'refunded')::BIGINT AS refunded_count,
    COALESCE(SUM(total), 0) AS total_amount,
    COALESCE(SUM(total) FILTER (WHERE status = 'paid'), 0) AS paid_amount,
    COALESCE(SUM(total) FILTER (WHERE status = 'pending'), 0) AS pending_amount,
    COALESCE(SUM(total) FILTER (WHERE status = 'overdue'), 0) AS overdue_amount
  FROM invoices;
END;
$$;
