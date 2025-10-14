-- Payment Dashboard and Analytics System Migration
-- Story 2.5: Payment Dashboard and Reporting

-- Create payment_statistics table for cached monthly calculations
CREATE TABLE IF NOT EXISTS payment_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tailor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    period VARCHAR(7) NOT NULL, -- YYYY-MM format
    total_earnings DECIMAL(10, 2) NOT NULL DEFAULT 0,
    gross_payments DECIMAL(10, 2) NOT NULL DEFAULT 0,
    platform_commission DECIMAL(10, 2) NOT NULL DEFAULT 0,
    net_earnings DECIMAL(10, 2) NOT NULL DEFAULT 0,
    pending_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    completed_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    disputed_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    refunded_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total_orders INTEGER NOT NULL DEFAULT 0,
    completed_orders INTEGER NOT NULL DEFAULT 0,
    average_order_value DECIMAL(10, 2) NOT NULL DEFAULT 0,
    commission_rate DECIMAL(5, 4) NOT NULL DEFAULT 0.2000, -- 20% as decimal
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tailor_id, period)
);

-- Create tailor_commission_records table for detailed commission tracking
CREATE TABLE IF NOT EXISTS tailor_commission_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tailor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    payment_transaction_id UUID REFERENCES payment_transactions(id) ON DELETE SET NULL,
    order_amount DECIMAL(10, 2) NOT NULL,
    commission_rate DECIMAL(5, 4) NOT NULL DEFAULT 0.2000, -- Rate at time of order
    commission_amount DECIMAL(10, 2) NOT NULL,
    net_payment DECIMAL(10, 2) NOT NULL,
    processed_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSED', 'DISPUTED')),
    invoice_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create tax_invoices table for Ghana tax compliance
CREATE TABLE IF NOT EXISTS tax_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    tailor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    commission_record_id UUID REFERENCES tailor_commission_records(id) ON DELETE CASCADE,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    gross_amount DECIMAL(10, 2) NOT NULL,
    commission_amount DECIMAL(10, 2) NOT NULL,
    net_amount DECIMAL(10, 2) NOT NULL,
    ghana_vat_number VARCHAR(50),
    pdf_url TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ISSUED', 'CANCELLED')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create tailor_payment_summary materialized view for aggregated payment data
CREATE MATERIALIZED VIEW IF NOT EXISTS tailor_payment_summary AS
SELECT 
    tp.user_id as tailor_id,
    TO_CHAR(DATE_TRUNC('month', pt.completed_at), 'YYYY-MM') as period,
    
    -- Earnings calculations
    SUM(CASE WHEN pt.status = 'SUCCESS' AND pt.completed_at IS NOT NULL 
        THEN COALESCE(pt.net_amount, pt.amount) ELSE 0 END) as total_earnings,
    
    SUM(CASE WHEN pt.status = 'SUCCESS' AND pt.completed_at IS NOT NULL 
        THEN pt.amount ELSE 0 END) as gross_payments,
        
    SUM(CASE WHEN pt.status = 'SUCCESS' AND pt.completed_at IS NOT NULL 
        THEN (pt.amount * 0.20) ELSE 0 END) as platform_commission,
        
    SUM(CASE WHEN pt.status = 'SUCCESS' AND pt.completed_at IS NOT NULL 
        THEN (pt.amount * 0.80) ELSE 0 END) as net_earnings,
    
    -- Status-based amounts
    SUM(CASE WHEN pt.status IN ('PENDING', 'PROCESSING') 
        THEN pt.amount ELSE 0 END) as pending_amount,
        
    SUM(CASE WHEN pt.status = 'SUCCESS' AND pt.completed_at IS NOT NULL 
        THEN pt.amount ELSE 0 END) as completed_amount,
        
    SUM(CASE WHEN o.status = 'DISPUTED' AND pt.status = 'SUCCESS' 
        THEN pt.amount ELSE 0 END) as disputed_amount,
        
    SUM(CASE WHEN pt.status = 'REFUNDED' 
        THEN COALESCE(pt.refund_amount, pt.amount) ELSE 0 END) as refunded_amount,
    
    -- Order statistics
    COUNT(DISTINCT o.id) as total_orders,
    COUNT(DISTINCT CASE WHEN o.status = 'COMPLETED' THEN o.id END) as completed_orders,
    
    -- Average order value
    CASE WHEN COUNT(DISTINCT o.id) > 0 
        THEN SUM(o.total_amount) / COUNT(DISTINCT o.id) 
        ELSE 0 END as average_order_value,
    
    0.2000 as commission_rate, -- Current 20% rate
    MAX(pt.updated_at) as last_updated
    
FROM tailor_profiles tp
JOIN orders o ON o.tailor_id = tp.user_id
JOIN payment_transactions pt ON pt.order_id = o.id
WHERE pt.completed_at IS NOT NULL 
  AND DATE_TRUNC('month', pt.completed_at) >= DATE_TRUNC('month', NOW() - INTERVAL '24 months')
GROUP BY tp.user_id, TO_CHAR(DATE_TRUNC('month', pt.completed_at), 'YYYY-MM');

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_payment_statistics_tailor_period ON payment_statistics(tailor_id, period);
CREATE INDEX IF NOT EXISTS idx_commission_records_tailor_status ON tailor_commission_records(tailor_id, status);
CREATE INDEX IF NOT EXISTS idx_commission_records_order ON tailor_commission_records(order_id);
CREATE INDEX IF NOT EXISTS idx_tax_invoices_tailor ON tax_invoices(tailor_id, status);
CREATE INDEX IF NOT EXISTS idx_tax_invoices_order ON tax_invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_completed ON payment_transactions(completed_at) WHERE completed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_transactions_tailor_date ON payment_transactions(order_id) INCLUDE (completed_at, status, amount);

-- Create unique index on tailor_payment_summary for refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_tailor_payment_summary_unique ON tailor_payment_summary(tailor_id, period);

-- Function to refresh payment summary materialized view
CREATE OR REPLACE FUNCTION refresh_tailor_payment_summary()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY tailor_payment_summary;
END;
$$;

-- Function to generate commission records on payment completion
CREATE OR REPLACE FUNCTION create_commission_record()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    tailor_user_id UUID;
    commission_amt DECIMAL(10, 2);
    net_amt DECIMAL(10, 2);
BEGIN
    -- Only process successful payments that just completed
    IF NEW.status = 'SUCCESS' AND OLD.status != 'SUCCESS' AND NEW.completed_at IS NOT NULL THEN
        -- Get tailor ID from order
        SELECT o.tailor_id INTO tailor_user_id
        FROM orders o 
        WHERE o.id = NEW.order_id;
        
        IF tailor_user_id IS NOT NULL THEN
            -- Calculate commission (20% platform fee)
            commission_amt := NEW.amount * 0.20;
            net_amt := NEW.amount - commission_amt;
            
            -- Insert commission record
            INSERT INTO tailor_commission_records (
                tailor_id,
                order_id,
                payment_transaction_id,
                order_amount,
                commission_rate,
                commission_amount,
                net_payment,
                processed_at,
                status
            ) VALUES (
                tailor_user_id,
                NEW.order_id,
                NEW.id,
                NEW.amount,
                0.2000, -- 20%
                commission_amt,
                net_amt,
                NEW.completed_at,
                'PROCESSED'
            )
            ON CONFLICT (tailor_id, order_id, payment_transaction_id) 
            DO UPDATE SET
                commission_amount = EXCLUDED.commission_amount,
                net_payment = EXCLUDED.net_payment,
                processed_at = EXCLUDED.processed_at,
                status = 'PROCESSED',
                updated_at = NOW();
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create unique constraint to prevent duplicate commission records
ALTER TABLE tailor_commission_records 
ADD CONSTRAINT IF NOT EXISTS unique_commission_per_payment 
UNIQUE (tailor_id, order_id, payment_transaction_id);

-- Create trigger for automatic commission record creation
DROP TRIGGER IF EXISTS trg_create_commission_record ON payment_transactions;
CREATE TRIGGER trg_create_commission_record
    AFTER UPDATE ON payment_transactions
    FOR EACH ROW
    EXECUTE FUNCTION create_commission_record();

-- Function to update payment statistics cache
CREATE OR REPLACE FUNCTION update_payment_statistics_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Refresh materialized view first
    PERFORM refresh_tailor_payment_summary();
    
    -- Update payment_statistics table with latest data
    INSERT INTO payment_statistics (
        tailor_id, period, total_earnings, gross_payments, platform_commission,
        net_earnings, pending_amount, completed_amount, disputed_amount, 
        refunded_amount, total_orders, completed_orders, average_order_value,
        commission_rate, updated_at
    )
    SELECT 
        tailor_id, period, total_earnings, gross_payments, platform_commission,
        net_earnings, pending_amount, completed_amount, disputed_amount,
        refunded_amount, total_orders, completed_orders, average_order_value,
        commission_rate, NOW()
    FROM tailor_payment_summary
    ON CONFLICT (tailor_id, period) 
    DO UPDATE SET
        total_earnings = EXCLUDED.total_earnings,
        gross_payments = EXCLUDED.gross_payments,
        platform_commission = EXCLUDED.platform_commission,
        net_earnings = EXCLUDED.net_earnings,
        pending_amount = EXCLUDED.pending_amount,
        completed_amount = EXCLUDED.completed_amount,
        disputed_amount = EXCLUDED.disputed_amount,
        refunded_amount = EXCLUDED.refunded_amount,
        total_orders = EXCLUDED.total_orders,
        completed_orders = EXCLUDED.completed_orders,
        average_order_value = EXCLUDED.average_order_value,
        commission_rate = EXCLUDED.commission_rate,
        updated_at = NOW();
END;
$$;

-- Create trigger to update statistics when payments change
CREATE OR REPLACE FUNCTION trigger_payment_stats_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update statistics cache asynchronously
    PERFORM update_payment_statistics_cache();
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger on payment_transactions for stats updates
DROP TRIGGER IF EXISTS trg_update_payment_stats ON payment_transactions;
CREATE TRIGGER trg_update_payment_stats
    AFTER INSERT OR UPDATE OR DELETE ON payment_transactions
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_payment_stats_update();

-- Function to generate unique invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    invoice_num TEXT;
    counter INTEGER;
BEGIN
    -- Generate invoice number: INV-YYYY-MM-NNNNN
    SELECT COUNT(*) + 1 INTO counter
    FROM tax_invoices 
    WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW());
    
    invoice_num := 'INV-' || TO_CHAR(NOW(), 'YYYY-MM') || '-' || LPAD(counter::TEXT, 5, '0');
    
    RETURN invoice_num;
END;
$$;

-- Enable Row Level Security (RLS) on new tables
ALTER TABLE payment_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE tailor_commission_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_invoices ENABLE ROW LEVEL SECURITY;

-- RLS policies for payment_statistics (tailors can only see their own data)
CREATE POLICY "payment_statistics_tailor_select" ON payment_statistics
    FOR SELECT USING (
        tailor_id = auth.uid() OR 
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
    );

-- RLS policies for tailor_commission_records  
CREATE POLICY "commission_records_tailor_select" ON tailor_commission_records
    FOR SELECT USING (
        tailor_id = auth.uid() OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
    );

-- RLS policies for tax_invoices
CREATE POLICY "tax_invoices_tailor_select" ON tax_invoices
    FOR SELECT USING (
        tailor_id = auth.uid() OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
    );

CREATE POLICY "tax_invoices_tailor_insert" ON tax_invoices
    FOR INSERT WITH CHECK (tailor_id = auth.uid());

CREATE POLICY "tax_invoices_tailor_update" ON tax_invoices
    FOR UPDATE USING (tailor_id = auth.uid()) WITH CHECK (tailor_id = auth.uid());

-- Grant necessary permissions
GRANT SELECT ON tailor_payment_summary TO authenticated;
GRANT SELECT, INSERT, UPDATE ON payment_statistics TO authenticated;
GRANT SELECT, INSERT, UPDATE ON tailor_commission_records TO authenticated;
GRANT SELECT, INSERT, UPDATE ON tax_invoices TO authenticated;

-- Initial data population - run statistics update
SELECT update_payment_statistics_cache();

COMMENT ON TABLE payment_statistics IS 'Cached monthly payment statistics for fast dashboard queries';
COMMENT ON TABLE tailor_commission_records IS 'Detailed commission tracking for each order payment with audit trail';
COMMENT ON TABLE tax_invoices IS 'Ghana tax-compliant invoice records for completed orders';
COMMENT ON MATERIALIZED VIEW tailor_payment_summary IS 'Aggregated payment data by tailor and month for dashboard display';