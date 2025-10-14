-- Migration: Add escrow system support to orders table
-- Story 2.2: Progressive Escrow System

-- Add escrow stage enum type if it doesn't exist
DO $$ BEGIN
    CREATE TYPE escrow_stage AS ENUM ('DEPOSIT', 'FITTING', 'FINAL', 'RELEASED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add escrow-related columns to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS escrow_stage escrow_stage DEFAULT 'DEPOSIT',
ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS fitting_amount DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS final_amount DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS escrow_balance DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS deposit_paid_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS fitting_paid_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS final_paid_at TIMESTAMP WITH TIME ZONE;

-- Update existing order status enum to include escrow-related statuses
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'PENDING_DEPOSIT';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'DEPOSIT_PAID';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'READY_FOR_FITTING';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'FITTING_APPROVED';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'COMPLETING';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'READY_FOR_DELIVERY';

-- Create indexes for efficient escrow queries
CREATE INDEX IF NOT EXISTS idx_orders_escrow_stage ON orders(escrow_stage);
CREATE INDEX IF NOT EXISTS idx_orders_escrow_balance ON orders(escrow_balance) WHERE escrow_balance > 0;
CREATE INDEX IF NOT EXISTS idx_orders_status_escrow ON orders(status, escrow_stage);

-- Create escrow transaction audit table
CREATE TABLE IF NOT EXISTS escrow_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('DEPOSIT', 'FITTING_PAYMENT', 'FINAL_PAYMENT', 'REFUND')),
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    from_stage escrow_stage,
    to_stage escrow_stage NOT NULL,
    payment_transaction_id UUID REFERENCES payment_transactions(id),
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for escrow transactions
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_order_id ON escrow_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_type ON escrow_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_stage ON escrow_transactions(to_stage);
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_created_at ON escrow_transactions(created_at);

-- Create function to calculate escrow breakdown
CREATE OR REPLACE FUNCTION calculate_escrow_breakdown(total_amount DECIMAL)
RETURNS TABLE(
    deposit_amount DECIMAL,
    fitting_amount DECIMAL,
    final_amount DECIMAL
) AS $$
BEGIN
    -- 25% deposit, 50% fitting, 25% final
    RETURN QUERY SELECT
        ROUND(total_amount * 0.25, 2) as deposit_amount,
        ROUND(total_amount * 0.50, 2) as fitting_amount,
        ROUND(total_amount * 0.25, 2) as final_amount;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to update escrow amounts when order total changes
CREATE OR REPLACE FUNCTION update_order_escrow_amounts()
RETURNS TRIGGER AS $$
DECLARE
    breakdown RECORD;
BEGIN
    -- Only update if total_amount changed and escrow amounts aren't manually set
    IF NEW.total_amount != OLD.total_amount THEN
        -- Calculate new escrow breakdown
        SELECT * INTO breakdown FROM calculate_escrow_breakdown(NEW.total_amount);
        
        -- Update escrow amounts if they haven't been paid yet
        IF NEW.escrow_stage = 'DEPOSIT' THEN
            NEW.deposit_amount = breakdown.deposit_amount;
            NEW.fitting_amount = breakdown.fitting_amount;
            NEW.final_amount = breakdown.final_amount;
            NEW.escrow_balance = NEW.total_amount;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update escrow amounts
DROP TRIGGER IF EXISTS trigger_update_escrow_amounts ON orders;
CREATE TRIGGER trigger_update_escrow_amounts
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_order_escrow_amounts();

-- Create function to validate escrow balance consistency
CREATE OR REPLACE FUNCTION validate_escrow_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure escrow balance is consistent with paid amounts
    IF NEW.escrow_stage = 'DEPOSIT' THEN
        NEW.escrow_balance = NEW.total_amount;
    ELSIF NEW.escrow_stage = 'FITTING' THEN
        NEW.escrow_balance = NEW.fitting_amount + NEW.final_amount;
    ELSIF NEW.escrow_stage = 'FINAL' THEN
        NEW.escrow_balance = NEW.final_amount;
    ELSIF NEW.escrow_stage = 'RELEASED' THEN
        NEW.escrow_balance = 0.00;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to maintain escrow balance consistency
DROP TRIGGER IF EXISTS trigger_validate_escrow_balance ON orders;
CREATE TRIGGER trigger_validate_escrow_balance
    BEFORE INSERT OR UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION validate_escrow_balance();

-- Add RLS policies for escrow transactions (following existing orders security model)
ALTER TABLE escrow_transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view escrow transactions for their own orders
CREATE POLICY "Users can view their order escrow transactions"
    ON escrow_transactions FOR SELECT
    USING (
        order_id IN (
            SELECT id FROM orders 
            WHERE customer_id = auth.uid() OR tailor_id = auth.uid()
        )
    );

-- Policy: Only admins and order participants can create escrow transactions
CREATE POLICY "Authorized users can create escrow transactions"
    ON escrow_transactions FOR INSERT
    WITH CHECK (
        order_id IN (
            SELECT id FROM orders 
            WHERE customer_id = auth.uid() OR tailor_id = auth.uid()
        )
        OR auth.uid() IN (
            SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Add helpful comments
COMMENT ON COLUMN orders.escrow_stage IS 'Current stage of escrow payment process';
COMMENT ON COLUMN orders.deposit_amount IS 'Amount for deposit milestone (25% of total)';
COMMENT ON COLUMN orders.fitting_amount IS 'Amount for fitting milestone (50% of total)';
COMMENT ON COLUMN orders.final_amount IS 'Amount for final milestone (25% of total)';
COMMENT ON COLUMN orders.escrow_balance IS 'Amount remaining in escrow (unreleased funds)';

COMMENT ON TABLE escrow_transactions IS 'Audit trail for all escrow-related transactions and stage transitions';
COMMENT ON COLUMN escrow_transactions.transaction_type IS 'Type of escrow transaction: DEPOSIT, FITTING_PAYMENT, FINAL_PAYMENT, or REFUND';
COMMENT ON COLUMN escrow_transactions.from_stage IS 'Previous escrow stage (null for initial deposit)';
COMMENT ON COLUMN escrow_transactions.to_stage IS 'New escrow stage after transaction';

-- Create view for escrow summary reporting
CREATE OR REPLACE VIEW escrow_summary AS
SELECT 
    o.id as order_id,
    o.status as order_status,
    o.escrow_stage,
    o.total_amount,
    o.deposit_amount,
    o.fitting_amount, 
    o.final_amount,
    o.escrow_balance,
    o.deposit_paid_at,
    o.fitting_paid_at,
    o.final_paid_at,
    o.created_at as order_created_at,
    o.updated_at as order_updated_at,
    c.email as customer_email,
    t.email as tailor_email
FROM orders o
LEFT JOIN auth.users c ON o.customer_id = c.id
LEFT JOIN auth.users t ON o.tailor_id = t.id
WHERE o.total_amount > 0;

-- Grant appropriate permissions
GRANT SELECT ON escrow_summary TO authenticated;
GRANT SELECT, INSERT, UPDATE ON escrow_transactions TO authenticated;