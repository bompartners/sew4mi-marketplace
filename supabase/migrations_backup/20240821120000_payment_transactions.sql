-- Create payment_transactions table for Hubtel payment integration
CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('DEPOSIT', 'FITTING_PAYMENT', 'FINAL_PAYMENT', 'REFUND')),
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    provider TEXT NOT NULL CHECK (provider IN ('HUBTEL_MTN', 'HUBTEL_VODAFONE', 'HUBTEL_AIRTELTIGO', 'HUBTEL_CARD')),
    provider_transaction_id TEXT NOT NULL,
    hubtel_transaction_id TEXT,
    payment_method TEXT NOT NULL,
    customer_phone_number TEXT,
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED')) DEFAULT 'PENDING',
    webhook_received BOOLEAN NOT NULL DEFAULT FALSE,
    retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0 AND retry_count <= 10),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_provider_transaction_id UNIQUE (provider_transaction_id),
    CONSTRAINT unique_hubtel_transaction_id UNIQUE (hubtel_transaction_id)
);

-- Create indexes for better performance
CREATE INDEX idx_payment_transactions_order_id ON payment_transactions(order_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX idx_payment_transactions_provider ON payment_transactions(provider);
CREATE INDEX idx_payment_transactions_created_at ON payment_transactions(created_at);
CREATE INDEX idx_payment_transactions_hubtel_id ON payment_transactions(hubtel_transaction_id) WHERE hubtel_transaction_id IS NOT NULL;
CREATE INDEX idx_payment_transactions_pending_retry ON payment_transactions(status, retry_count) WHERE status = 'PENDING';

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_payment_transactions_updated_at 
    BEFORE UPDATE ON payment_transactions 
    FOR EACH ROW 
    EXECUTE PROCEDURE update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment_transactions
-- Users can only access their own payment transactions through orders they own
CREATE POLICY "Users can view their own payment transactions" ON payment_transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = payment_transactions.order_id 
            AND (orders.customer_id = auth.uid() OR orders.tailor_id = auth.uid())
        )
    );

-- Only authenticated users can create payment transactions for their orders
CREATE POLICY "Users can create payment transactions for their orders" ON payment_transactions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = payment_transactions.order_id 
            AND orders.customer_id = auth.uid()
        )
    );

-- Only system/webhook can update payment status (no user updates allowed for security)
CREATE POLICY "System can update payment transactions" ON payment_transactions
    FOR UPDATE USING (
        -- Only allow updates from service role or specific application role
        auth.role() = 'service_role' OR 
        (auth.jwt() ->> 'role')::text = 'payment_service'
    );

-- Admins can view all payment transactions for audit purposes
CREATE POLICY "Admins can view all payment transactions" ON payment_transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'ADMIN'
        )
    );

-- Add comment for documentation
COMMENT ON TABLE payment_transactions IS 'Stores payment transaction data for Hubtel payment gateway integration';
COMMENT ON COLUMN payment_transactions.provider_transaction_id IS 'Unique transaction ID from our system';
COMMENT ON COLUMN payment_transactions.hubtel_transaction_id IS 'Transaction ID from Hubtel payment gateway';
COMMENT ON COLUMN payment_transactions.webhook_received IS 'Indicates if webhook notification was received for this transaction';
COMMENT ON COLUMN payment_transactions.retry_count IS 'Number of times payment verification was retried';

-- Grant necessary permissions
GRANT SELECT, INSERT ON payment_transactions TO authenticated;
GRANT SELECT ON payment_transactions TO anon;