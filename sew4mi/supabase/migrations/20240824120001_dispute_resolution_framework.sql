-- Dispute Resolution Framework Migration
-- Story 2.4: Comprehensive dispute system with evidence, messaging, and resolution tracking

-- First, extend the existing disputes table with new fields
ALTER TABLE disputes 
ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN ('QUALITY_ISSUE', 'DELIVERY_DELAY', 'PAYMENT_PROBLEM', 'COMMUNICATION_ISSUE', 'OTHER')) DEFAULT 'OTHER',
ADD COLUMN IF NOT EXISTS priority TEXT CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')) DEFAULT 'MEDIUM',
ADD COLUMN IF NOT EXISTS assigned_admin UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS resolution_type TEXT CHECK (resolution_type IN ('FULL_REFUND', 'PARTIAL_REFUND', 'ORDER_COMPLETION', 'NO_ACTION')),
ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

-- Status enum is already defined in initial schema with values:
-- 'OPEN', 'UNDER_REVIEW', 'RESOLVED', 'ESCALATED', 'CLOSED'
-- No need to alter the constraint as it's managed by the enum type

-- Create dispute_evidence table for file uploads
CREATE TABLE IF NOT EXISTS dispute_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES auth.users(id),
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    description TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create dispute_messages table for three-way communication
CREATE TABLE IF NOT EXISTS dispute_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id),
    sender_role TEXT NOT NULL CHECK (sender_role IN ('CUSTOMER', 'TAILOR', 'ADMIN')),
    message TEXT NOT NULL,
    attachments TEXT[], -- Array of file URLs
    is_internal_note BOOLEAN DEFAULT FALSE, -- Admin-only internal notes
    read_by UUID[] DEFAULT '{}', -- Array of user IDs who have read the message
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create dispute_resolutions table for resolution tracking
CREATE TABLE IF NOT EXISTS dispute_resolutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
    resolution_type TEXT NOT NULL CHECK (resolution_type IN ('FULL_REFUND', 'PARTIAL_REFUND', 'ORDER_COMPLETION', 'NO_ACTION')),
    outcome TEXT NOT NULL,
    refund_amount DECIMAL(10,2),
    reason_code TEXT NOT NULL,
    admin_notes TEXT NOT NULL,
    customer_notified BOOLEAN DEFAULT FALSE,
    tailor_notified BOOLEAN DEFAULT FALSE,
    resolved_by UUID NOT NULL REFERENCES auth.users(id),
    resolved_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_priority ON disputes(priority);
CREATE INDEX IF NOT EXISTS idx_disputes_sla_deadline ON disputes(sla_deadline);
CREATE INDEX IF NOT EXISTS idx_disputes_assigned_admin ON disputes(assigned_admin);
CREATE INDEX IF NOT EXISTS idx_disputes_category ON disputes(category);
CREATE INDEX IF NOT EXISTS idx_disputes_order_id ON disputes(order_id);

CREATE INDEX IF NOT EXISTS idx_dispute_evidence_dispute_id ON dispute_evidence(dispute_id);
CREATE INDEX IF NOT EXISTS idx_dispute_evidence_uploaded_by ON dispute_evidence(uploaded_by);

CREATE INDEX IF NOT EXISTS idx_dispute_messages_dispute_id ON dispute_messages(dispute_id);
CREATE INDEX IF NOT EXISTS idx_dispute_messages_sender_id ON dispute_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_dispute_messages_created_at ON dispute_messages(created_at);

CREATE INDEX IF NOT EXISTS idx_dispute_resolutions_dispute_id ON dispute_resolutions(dispute_id);
CREATE INDEX IF NOT EXISTS idx_dispute_resolutions_resolved_by ON dispute_resolutions(resolved_by);

-- Enable Row Level Security
ALTER TABLE dispute_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_resolutions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dispute_evidence
CREATE POLICY "Users can view evidence for their disputes" ON dispute_evidence
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM disputes d
            JOIN orders o ON d.order_id = o.id
            JOIN tailor_profiles tp ON o.tailor_id = tp.id
            WHERE d.id = dispute_id
            AND (d.raised_by = auth.uid() OR o.customer_id = auth.uid() OR tp.user_id = auth.uid())
        )
        OR uploaded_by = auth.uid()
    );

CREATE POLICY "Admins can view all dispute evidence" ON dispute_evidence
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() AND u.role = 'ADMIN'
        )
    );

CREATE POLICY "Users can upload evidence to their disputes" ON dispute_evidence
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM disputes d
            JOIN orders o ON d.order_id = o.id
            JOIN tailor_profiles tp ON o.tailor_id = tp.id
            WHERE d.id = dispute_id
            AND (d.raised_by = auth.uid() OR o.customer_id = auth.uid() OR tp.user_id = auth.uid())
        )
        AND uploaded_by = auth.uid()
    );

-- RLS Policies for dispute_messages
CREATE POLICY "Users can view messages in their disputes" ON dispute_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM disputes d
            JOIN orders o ON d.order_id = o.id
            JOIN tailor_profiles tp ON o.tailor_id = tp.id
            WHERE d.id = dispute_id
            AND (d.raised_by = auth.uid() OR o.customer_id = auth.uid() OR tp.user_id = auth.uid())
        )
        OR sender_id = auth.uid()
        OR (
            NOT is_internal_note
            AND EXISTS (
                SELECT 1 FROM users u
                WHERE u.id = auth.uid() AND u.role = 'ADMIN'
            )
        )
    );

CREATE POLICY "Admins can view all messages including internal notes" ON dispute_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() AND u.role = 'ADMIN'
        )
    );

CREATE POLICY "Users can send messages in their disputes" ON dispute_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM disputes d
            JOIN orders o ON d.order_id = o.id
            JOIN tailor_profiles tp ON o.tailor_id = tp.id
            WHERE d.id = dispute_id
            AND (d.raised_by = auth.uid() OR o.customer_id = auth.uid() OR tp.user_id = auth.uid())
        )
        AND sender_id = auth.uid()
        AND NOT is_internal_note
    );

CREATE POLICY "Admins can send any messages" ON dispute_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() AND u.role = 'ADMIN'
        )
        AND sender_id = auth.uid()
    );

-- RLS Policies for dispute_resolutions
CREATE POLICY "Users can view resolutions for their disputes" ON dispute_resolutions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM disputes d
            JOIN orders o ON d.order_id = o.id
            JOIN tailor_profiles tp ON o.tailor_id = tp.id
            WHERE d.id = dispute_id
            AND (d.raised_by = auth.uid() OR o.customer_id = auth.uid() OR tp.user_id = auth.uid())
        )
    );

CREATE POLICY "Admins can view all resolutions" ON dispute_resolutions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() AND u.role = 'ADMIN'
        )
    );

CREATE POLICY "Only admins can create resolutions" ON dispute_resolutions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() AND u.role = 'ADMIN'
        )
        AND resolved_by = auth.uid()
    );

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_dispute_evidence_updated_at BEFORE UPDATE ON dispute_evidence
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dispute_messages_updated_at BEFORE UPDATE ON dispute_messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dispute_resolutions_updated_at BEFORE UPDATE ON dispute_resolutions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically set SLA deadline (48 hours from creation)
CREATE OR REPLACE FUNCTION set_dispute_sla_deadline()
RETURNS TRIGGER AS $$
BEGIN
    -- Set 48-hour SLA for initial response
    -- Adjust based on priority: Critical (4h), High (24h), Medium/Low (48h)
    CASE NEW.priority
        WHEN 'CRITICAL' THEN
            NEW.sla_deadline = NEW.created_at + INTERVAL '4 hours';
        WHEN 'HIGH' THEN
            NEW.sla_deadline = NEW.created_at + INTERVAL '24 hours';
        ELSE
            NEW.sla_deadline = NEW.created_at + INTERVAL '48 hours';
    END CASE;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_dispute_sla_deadline_trigger
    BEFORE INSERT ON disputes
    FOR EACH ROW EXECUTE FUNCTION set_dispute_sla_deadline();

-- Function to calculate dispute priority based on order value and urgency
CREATE OR REPLACE FUNCTION calculate_dispute_priority(
    order_value DECIMAL,
    category TEXT,
    customer_tier TEXT DEFAULT 'STANDARD'
)
RETURNS TEXT AS $$
BEGIN
    -- Priority calculation logic
    IF order_value > 1000 OR customer_tier = 'PREMIUM' THEN
        RETURN 'HIGH';
    ELSIF order_value > 500 OR category IN ('PAYMENT_PROBLEM', 'DELIVERY_DELAY') THEN
        RETURN 'MEDIUM';
    ELSE
        RETURN 'LOW';
    END IF;
END;
$$ language 'plpgsql';

-- Create a view for admin dashboard metrics
CREATE OR REPLACE VIEW admin_dispute_metrics AS
SELECT 
    COUNT(*) as total_disputes,
    COUNT(*) FILTER (WHERE status = 'OPEN') as open_disputes,
    COUNT(*) FILTER (WHERE status = 'UNDER_REVIEW') as in_progress_disputes,
    COUNT(*) FILTER (WHERE status = 'RESOLVED') as resolved_disputes,
    COUNT(*) FILTER (WHERE sla_deadline < NOW() AND status IN ('OPEN', 'UNDER_REVIEW')) as overdue_disputes,
    COUNT(*) FILTER (WHERE priority = 'CRITICAL') as critical_disputes,
    COUNT(*) FILTER (WHERE priority = 'HIGH') as high_priority_disputes,
    AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) as avg_resolution_hours
FROM disputes
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';

-- Grant necessary permissions
GRANT SELECT ON admin_dispute_metrics TO authenticated;