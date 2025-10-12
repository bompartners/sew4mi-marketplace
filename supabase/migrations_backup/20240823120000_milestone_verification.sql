-- Migration: Add milestone verification system
-- Story 2.3: Milestone Verification System
-- Date: 2024-08-23

-- Create milestone stage enum type
DO $$ BEGIN
    CREATE TYPE milestone_stage AS ENUM (
        'FABRIC_SELECTED',
        'CUTTING_STARTED', 
        'INITIAL_ASSEMBLY',
        'FITTING_READY',
        'ADJUSTMENTS_COMPLETE',
        'FINAL_PRESSING',
        'READY_FOR_DELIVERY'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create milestone approval status enum type
DO $$ BEGIN
    CREATE TYPE milestone_approval_status AS ENUM (
        'PENDING',
        'APPROVED', 
        'REJECTED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create milestone approval action enum type
DO $$ BEGIN
    CREATE TYPE milestone_approval_action AS ENUM (
        'APPROVED',
        'REJECTED',
        'AUTO_APPROVED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create order_milestones table for tracking milestone progress
CREATE TABLE IF NOT EXISTS order_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    milestone milestone_stage NOT NULL,
    photo_url TEXT NOT NULL,
    notes TEXT DEFAULT '',
    verified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    verified_by UUID NOT NULL REFERENCES auth.users(id),
    
    -- New approval fields for Story 2.3
    approval_status milestone_approval_status NOT NULL DEFAULT 'PENDING',
    customer_reviewed_at TIMESTAMP WITH TIME ZONE,
    auto_approval_deadline TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '48 hours'),
    rejection_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT unique_order_milestone UNIQUE (order_id, milestone),
    CONSTRAINT valid_photo_url CHECK (photo_url ~ '^https?://'),
    CONSTRAINT notes_length CHECK (char_length(notes) <= 1000),
    CONSTRAINT rejection_reason_length CHECK (char_length(rejection_reason) <= 500),
    CONSTRAINT approval_deadline_valid CHECK (auto_approval_deadline > verified_at)
);

-- Create milestone_approvals audit table for tracking approval decisions
CREATE TABLE IF NOT EXISTS milestone_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    milestone_id UUID NOT NULL REFERENCES order_milestones(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES auth.users(id),
    action milestone_approval_action NOT NULL,
    comment TEXT,
    reviewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT comment_length CHECK (char_length(comment) <= 500),
    CONSTRAINT rejection_requires_comment CHECK (
        action != 'REJECTED' OR (comment IS NOT NULL AND char_length(trim(comment)) > 0)
    )
);

-- Create indexes for efficient milestone queries
CREATE INDEX IF NOT EXISTS idx_order_milestones_order_id ON order_milestones(order_id);
CREATE INDEX IF NOT EXISTS idx_order_milestones_milestone ON order_milestones(milestone);
CREATE INDEX IF NOT EXISTS idx_order_milestones_approval_status ON order_milestones(approval_status);
CREATE INDEX IF NOT EXISTS idx_order_milestones_auto_approval ON order_milestones(auto_approval_deadline) 
    WHERE approval_status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_order_milestones_verified_by ON order_milestones(verified_by);
CREATE INDEX IF NOT EXISTS idx_order_milestones_created_at ON order_milestones(created_at);

-- Create indexes for milestone approvals
CREATE INDEX IF NOT EXISTS idx_milestone_approvals_milestone_id ON milestone_approvals(milestone_id);
CREATE INDEX IF NOT EXISTS idx_milestone_approvals_order_id ON milestone_approvals(order_id);
CREATE INDEX IF NOT EXISTS idx_milestone_approvals_customer_id ON milestone_approvals(customer_id);
CREATE INDEX IF NOT EXISTS idx_milestone_approvals_action ON milestone_approvals(action);
CREATE INDEX IF NOT EXISTS idx_milestone_approvals_reviewed_at ON milestone_approvals(reviewed_at);

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_milestone_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS trigger_update_milestone_updated_at ON order_milestones;
CREATE TRIGGER trigger_update_milestone_updated_at
    BEFORE UPDATE ON order_milestones
    FOR EACH ROW
    EXECUTE FUNCTION update_milestone_updated_at();

-- Create function to handle milestone approval
CREATE OR REPLACE FUNCTION approve_milestone(
    p_milestone_id UUID,
    p_customer_id UUID,
    p_action milestone_approval_action,
    p_comment TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_order_id UUID;
    v_current_status milestone_approval_status;
BEGIN
    -- Get milestone details and verify customer ownership
    SELECT om.order_id, om.approval_status 
    INTO v_order_id, v_current_status
    FROM order_milestones om
    JOIN orders o ON o.id = om.order_id
    WHERE om.id = p_milestone_id AND o.customer_id = p_customer_id;
    
    -- Check if milestone exists and customer owns the order
    IF v_order_id IS NULL THEN
        RAISE EXCEPTION 'Milestone not found or access denied';
    END IF;
    
    -- Check if milestone is still pending
    IF v_current_status != 'PENDING' THEN
        RAISE EXCEPTION 'Milestone has already been reviewed';
    END IF;
    
    -- Update milestone status
    UPDATE order_milestones 
    SET 
        approval_status = CASE 
            WHEN p_action = 'APPROVED' THEN 'APPROVED'::milestone_approval_status
            WHEN p_action = 'REJECTED' THEN 'REJECTED'::milestone_approval_status
            WHEN p_action = 'AUTO_APPROVED' THEN 'APPROVED'::milestone_approval_status
        END,
        customer_reviewed_at = now(),
        rejection_reason = CASE WHEN p_action = 'REJECTED' THEN p_comment ELSE NULL END
    WHERE id = p_milestone_id;
    
    -- Record approval decision in audit table
    INSERT INTO milestone_approvals (
        milestone_id, order_id, customer_id, action, comment
    ) VALUES (
        p_milestone_id, v_order_id, p_customer_id, p_action, p_comment
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to process auto-approvals for milestones past deadline
CREATE OR REPLACE FUNCTION process_auto_approvals()
RETURNS TABLE(
    processed_count INTEGER,
    auto_approved_count INTEGER,
    milestone_ids UUID[]
) AS $$
DECLARE
    v_processed_count INTEGER := 0;
    v_auto_approved_count INTEGER := 0;
    v_milestone_ids UUID[] := '{}';
    milestone_record RECORD;
BEGIN
    -- Process all pending milestones past their auto-approval deadline
    FOR milestone_record IN
        SELECT om.id, o.customer_id, o.id as order_id
        FROM order_milestones om
        JOIN orders o ON o.id = om.order_id
        WHERE om.approval_status = 'PENDING'
        AND om.auto_approval_deadline <= now()
        ORDER BY om.auto_approval_deadline ASC
    LOOP
        v_processed_count := v_processed_count + 1;
        
        BEGIN
            -- Auto-approve the milestone
            PERFORM approve_milestone(
                milestone_record.id,
                milestone_record.customer_id,
                'AUTO_APPROVED'::milestone_approval_action,
                'Automatically approved after 48-hour deadline'
            );
            
            v_auto_approved_count := v_auto_approved_count + 1;
            v_milestone_ids := array_append(v_milestone_ids, milestone_record.id);
            
        EXCEPTION WHEN OTHERS THEN
            -- Log error but continue processing other milestones
            RAISE WARNING 'Failed to auto-approve milestone %: %', milestone_record.id, SQLERRM;
        END;
    END LOOP;
    
    RETURN QUERY SELECT v_processed_count, v_auto_approved_count, v_milestone_ids;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable Row Level Security (RLS)
ALTER TABLE order_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestone_approvals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for order_milestones

-- Users can view milestones for orders they're involved in
CREATE POLICY "Users can view milestones for their orders"
    ON order_milestones FOR SELECT
    USING (
        order_id IN (
            SELECT id FROM orders 
            WHERE customer_id = auth.uid() OR tailor_id = auth.uid()
        )
    );

-- Only tailors can create milestones for their orders
CREATE POLICY "Tailors can create milestones for their orders"
    ON order_milestones FOR INSERT
    WITH CHECK (
        order_id IN (
            SELECT id FROM orders 
            WHERE tailor_id = auth.uid()
        )
        AND verified_by = auth.uid()
    );

-- Only tailors can update their own milestones (for corrections before approval)
CREATE POLICY "Tailors can update their pending milestones"
    ON order_milestones FOR UPDATE
    USING (
        verified_by = auth.uid()
        AND approval_status = 'PENDING'
        AND order_id IN (
            SELECT id FROM orders 
            WHERE tailor_id = auth.uid()
        )
    )
    WITH CHECK (
        verified_by = auth.uid()
        AND approval_status = 'PENDING'
    );

-- Admins can view all milestones
CREATE POLICY "Admins can view all milestones"
    ON order_milestones FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- RLS Policies for milestone_approvals

-- Users can view approval history for their orders
CREATE POLICY "Users can view approval history for their orders"
    ON milestone_approvals FOR SELECT
    USING (
        order_id IN (
            SELECT id FROM orders 
            WHERE customer_id = auth.uid() OR tailor_id = auth.uid()
        )
    );

-- Only customers can create approvals for their orders
CREATE POLICY "Customers can approve milestones for their orders"
    ON milestone_approvals FOR INSERT
    WITH CHECK (
        order_id IN (
            SELECT id FROM orders 
            WHERE customer_id = auth.uid()
        )
        AND customer_id = auth.uid()
    );

-- Admins can view all approval history
CREATE POLICY "Admins can view all milestone approvals"
    ON milestone_approvals FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Create view for milestone progress tracking
CREATE OR REPLACE VIEW milestone_progress AS
SELECT 
    o.id as order_id,
    o.status as order_status,
    o.customer_id,
    o.tailor_id,
    om.id as milestone_id,
    om.milestone,
    om.photo_url,
    om.notes,
    om.verified_at,
    om.approval_status,
    om.customer_reviewed_at,
    om.auto_approval_deadline,
    om.rejection_reason,
    u_tailor.email as tailor_email,
    u_customer.email as customer_email,
    -- Calculate if milestone is overdue for approval
    CASE 
        WHEN om.approval_status = 'PENDING' AND om.auto_approval_deadline < now() 
        THEN TRUE 
        ELSE FALSE 
    END as is_overdue,
    -- Calculate hours remaining for approval
    CASE 
        WHEN om.approval_status = 'PENDING' 
        THEN EXTRACT(EPOCH FROM (om.auto_approval_deadline - now())) / 3600 
        ELSE NULL 
    END as hours_remaining
FROM orders o
LEFT JOIN order_milestones om ON o.id = om.order_id
LEFT JOIN auth.users u_tailor ON o.tailor_id = u_tailor.id
LEFT JOIN auth.users u_customer ON o.customer_id = u_customer.id
WHERE om.id IS NOT NULL
ORDER BY o.id, om.verified_at;

-- Create view for milestone analytics
CREATE OR REPLACE VIEW milestone_analytics AS
SELECT 
    o.tailor_id,
    COUNT(*) as total_milestones,
    COUNT(*) FILTER (WHERE om.approval_status = 'APPROVED') as approved_count,
    COUNT(*) FILTER (WHERE om.approval_status = 'REJECTED') as rejected_count,
    COUNT(*) FILTER (WHERE om.approval_status = 'PENDING') as pending_count,
    ROUND(
        COUNT(*) FILTER (WHERE om.approval_status = 'APPROVED')::DECIMAL / 
        NULLIF(COUNT(*) FILTER (WHERE om.approval_status != 'PENDING'), 0) * 100, 
        2
    ) as approval_rate,
    ROUND(
        COUNT(*) FILTER (WHERE ma.action = 'AUTO_APPROVED')::DECIMAL / 
        NULLIF(COUNT(*) FILTER (WHERE om.approval_status = 'APPROVED'), 0) * 100, 
        2
    ) as auto_approval_rate,
    AVG(
        CASE 
            WHEN om.customer_reviewed_at IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (om.customer_reviewed_at - om.verified_at)) / 3600 
            ELSE NULL 
        END
    ) as avg_review_time_hours
FROM orders o
JOIN order_milestones om ON o.id = om.order_id
LEFT JOIN milestone_approvals ma ON om.id = ma.milestone_id
WHERE om.approval_status != 'PENDING' OR om.auto_approval_deadline < now()
GROUP BY o.tailor_id
HAVING COUNT(*) >= 5;  -- Only show stats for tailors with 5+ milestones

-- Grant appropriate permissions
GRANT SELECT ON milestone_progress TO authenticated;
GRANT SELECT ON milestone_analytics TO authenticated;
GRANT SELECT, INSERT, UPDATE ON order_milestones TO authenticated;
GRANT SELECT, INSERT ON milestone_approvals TO authenticated;

-- Add helpful comments
COMMENT ON TABLE order_milestones IS 'Tracks milestone progress with photo verification and customer approval';
COMMENT ON COLUMN order_milestones.milestone IS 'Stage of garment creation process';
COMMENT ON COLUMN order_milestones.photo_url IS 'URL to verification photo uploaded by tailor';
COMMENT ON COLUMN order_milestones.approval_status IS 'Customer approval status: PENDING, APPROVED, or REJECTED';
COMMENT ON COLUMN order_milestones.auto_approval_deadline IS 'Deadline for automatic approval if customer does not respond';
COMMENT ON COLUMN order_milestones.rejection_reason IS 'Reason provided by customer for milestone rejection';

COMMENT ON TABLE milestone_approvals IS 'Audit trail for all milestone approval/rejection decisions';
COMMENT ON COLUMN milestone_approvals.action IS 'Action taken: APPROVED, REJECTED, or AUTO_APPROVED';
COMMENT ON COLUMN milestone_approvals.comment IS 'Optional comment provided with approval decision';

COMMENT ON VIEW milestone_progress IS 'Comprehensive view of milestone progress for orders with approval status and timing';
COMMENT ON VIEW milestone_analytics IS 'Analytics view for tailor milestone approval rates and performance metrics';

COMMENT ON FUNCTION approve_milestone IS 'Securely handles milestone approval/rejection with audit trail';
COMMENT ON FUNCTION process_auto_approvals IS 'Processes auto-approvals for milestones past their deadline (for cron job)';

-- Create dispute status enum type
DO $$ BEGIN
    CREATE TYPE dispute_status AS ENUM (
        'OPEN',
        'IN_PROGRESS',
        'RESOLVED',
        'CLOSED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create dispute priority enum type
DO $$ BEGIN
    CREATE TYPE dispute_priority AS ENUM (
        'LOW',
        'MEDIUM',
        'HIGH',
        'URGENT'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create milestone_disputes table for tracking milestone disputes
CREATE TABLE IF NOT EXISTS milestone_disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    milestone_id UUID NOT NULL REFERENCES order_milestones(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    reason TEXT NOT NULL,
    evidence TEXT,
    evidence_urls TEXT[],
    status dispute_status NOT NULL DEFAULT 'OPEN',
    priority dispute_priority NOT NULL DEFAULT 'MEDIUM',
    assigned_to UUID REFERENCES auth.users(id),
    resolution TEXT,
    resolved_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT reason_length CHECK (char_length(reason) >= 10 AND char_length(reason) <= 1000),
    CONSTRAINT evidence_length CHECK (char_length(evidence) <= 2000),
    CONSTRAINT resolution_length CHECK (char_length(resolution) <= 1000),
    CONSTRAINT evidence_urls_limit CHECK (array_length(evidence_urls, 1) <= 5)
);

-- Create dispute_activities table for tracking dispute actions
CREATE TABLE IF NOT EXISTS dispute_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id UUID NOT NULL REFERENCES milestone_disputes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    action TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT action_length CHECK (char_length(action) <= 50),
    CONSTRAINT description_length CHECK (char_length(description) <= 500)
);

-- Create notifications table if it doesn't exist (referenced in dispute API)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT type_length CHECK (char_length(type) <= 50),
    CONSTRAINT title_length CHECK (char_length(title) <= 200),
    CONSTRAINT message_length CHECK (char_length(message) <= 1000)
);

-- Create indexes for dispute tables
CREATE INDEX IF NOT EXISTS idx_milestone_disputes_milestone_id ON milestone_disputes(milestone_id);
CREATE INDEX IF NOT EXISTS idx_milestone_disputes_order_id ON milestone_disputes(order_id);
CREATE INDEX IF NOT EXISTS idx_milestone_disputes_status ON milestone_disputes(status);
CREATE INDEX IF NOT EXISTS idx_milestone_disputes_priority ON milestone_disputes(priority);
CREATE INDEX IF NOT EXISTS idx_milestone_disputes_created_by ON milestone_disputes(created_by);
CREATE INDEX IF NOT EXISTS idx_milestone_disputes_assigned_to ON milestone_disputes(assigned_to);
CREATE INDEX IF NOT EXISTS idx_milestone_disputes_created_at ON milestone_disputes(created_at);

CREATE INDEX IF NOT EXISTS idx_dispute_activities_dispute_id ON dispute_activities(dispute_id);
CREATE INDEX IF NOT EXISTS idx_dispute_activities_user_id ON dispute_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_dispute_activities_created_at ON dispute_activities(created_at);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Create trigger for auto-updating dispute updated_at
CREATE OR REPLACE FUNCTION update_dispute_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_dispute_updated_at ON milestone_disputes;
CREATE TRIGGER trigger_update_dispute_updated_at
    BEFORE UPDATE ON milestone_disputes
    FOR EACH ROW
    EXECUTE FUNCTION update_dispute_updated_at();

-- Enable Row Level Security for dispute tables
ALTER TABLE milestone_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for milestone_disputes

-- Users can view disputes for orders they're involved in
CREATE POLICY "Users can view disputes for their orders"
    ON milestone_disputes FOR SELECT
    USING (
        order_id IN (
            SELECT id FROM orders 
            WHERE customer_id = auth.uid() OR tailor_id = auth.uid()
        )
    );

-- Users can create disputes for orders they're involved in
CREATE POLICY "Users can create disputes for their orders"
    ON milestone_disputes FOR INSERT
    WITH CHECK (
        order_id IN (
            SELECT id FROM orders 
            WHERE customer_id = auth.uid() OR tailor_id = auth.uid()
        )
        AND created_by = auth.uid()
    );

-- Admins can view and manage all disputes
CREATE POLICY "Admins can manage all disputes"
    ON milestone_disputes FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- RLS Policies for dispute_activities

-- Users can view activities for disputes they're involved in
CREATE POLICY "Users can view activities for their disputes"
    ON dispute_activities FOR SELECT
    USING (
        dispute_id IN (
            SELECT id FROM milestone_disputes
            WHERE order_id IN (
                SELECT id FROM orders 
                WHERE customer_id = auth.uid() OR tailor_id = auth.uid()
            )
        )
    );

-- Users can create activities for disputes they're involved in
CREATE POLICY "Users can create activities for their disputes"
    ON dispute_activities FOR INSERT
    WITH CHECK (
        dispute_id IN (
            SELECT id FROM milestone_disputes
            WHERE order_id IN (
                SELECT id FROM orders 
                WHERE customer_id = auth.uid() OR tailor_id = auth.uid()
            )
        )
        AND user_id = auth.uid()
    );

-- Admins can view and manage all dispute activities
CREATE POLICY "Admins can manage all dispute activities"
    ON dispute_activities FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- RLS Policies for notifications

-- Users can only view their own notifications
CREATE POLICY "Users can view their own notifications"
    ON notifications FOR SELECT
    USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
    ON notifications FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- System can create notifications for users
CREATE POLICY "System can create notifications"
    ON notifications FOR INSERT
    WITH CHECK (true);  -- This will be restricted by application logic

-- Grant appropriate permissions for new tables
GRANT SELECT, INSERT, UPDATE ON milestone_disputes TO authenticated;
GRANT SELECT, INSERT ON dispute_activities TO authenticated;
GRANT SELECT, UPDATE ON notifications TO authenticated;

-- Add helpful comments for new tables
COMMENT ON TABLE milestone_disputes IS 'Tracks disputes created for rejected milestones';
COMMENT ON COLUMN milestone_disputes.reason IS 'Customer explanation for disputing the milestone';
COMMENT ON COLUMN milestone_disputes.evidence IS 'Additional evidence or context provided by customer';
COMMENT ON COLUMN milestone_disputes.evidence_urls IS 'URLs to supporting photos or documents';
COMMENT ON COLUMN milestone_disputes.status IS 'Current status of the dispute resolution process';
COMMENT ON COLUMN milestone_disputes.priority IS 'Priority level for admin attention';

COMMENT ON TABLE dispute_activities IS 'Audit trail for all actions taken on disputes';
COMMENT ON COLUMN dispute_activities.action IS 'Type of action taken (CREATED, COMMENTED, ASSIGNED, etc.)';
COMMENT ON COLUMN dispute_activities.description IS 'Human-readable description of the action';

COMMENT ON TABLE notifications IS 'User notifications for milestone and dispute events';

-- Create milestone_notifications table for tracking reminder notifications
CREATE TABLE IF NOT EXISTS milestone_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    milestone_id UUID NOT NULL REFERENCES order_milestones(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL CHECK (notification_type IN ('first_reminder', 'final_reminder')),
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Prevent duplicate notifications
    UNIQUE(milestone_id, notification_type)
);

-- Create index for milestone notifications
CREATE INDEX IF NOT EXISTS idx_milestone_notifications_milestone_id ON milestone_notifications(milestone_id);
CREATE INDEX IF NOT EXISTS idx_milestone_notifications_type ON milestone_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_milestone_notifications_sent_at ON milestone_notifications(sent_at);

-- Create escrow_transactions table for payment tracking
CREATE TABLE IF NOT EXISTS escrow_transactions (
    id TEXT PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    milestone_id UUID REFERENCES order_milestones(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES auth.users(id),
    tailor_id UUID NOT NULL REFERENCES auth.users(id),
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('MILESTONE_RELEASE', 'ESCROW_HOLD', 'REFUND')),
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED')),
    payment_method TEXT NOT NULL,
    description TEXT,
    metadata JSONB,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for escrow transactions
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_order_id ON escrow_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_milestone_id ON escrow_transactions(milestone_id);
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_customer_id ON escrow_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_tailor_id ON escrow_transactions(tailor_id);
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_status ON escrow_transactions(status);
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_created_at ON escrow_transactions(created_at);

-- Create trigger for auto-updating escrow transaction updated_at
CREATE OR REPLACE FUNCTION update_escrow_transaction_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_escrow_transaction_updated_at ON escrow_transactions;
CREATE TRIGGER trigger_update_escrow_transaction_updated_at
    BEFORE UPDATE ON escrow_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_escrow_transaction_updated_at();

-- Enable Row Level Security for new tables
ALTER TABLE milestone_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrow_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for milestone_notifications

-- Users can view notification tracking for their orders
CREATE POLICY "Users can view notification tracking for their orders"
    ON milestone_notifications FOR SELECT
    USING (
        milestone_id IN (
            SELECT om.id FROM order_milestones om
            JOIN orders o ON o.id = om.order_id
            WHERE o.customer_id = auth.uid() OR o.tailor_id = auth.uid()
        )
    );

-- System can create notification tracking records
CREATE POLICY "System can create notification tracking"
    ON milestone_notifications FOR INSERT
    WITH CHECK (true);

-- RLS Policies for escrow_transactions

-- Users can view transactions for their orders
CREATE POLICY "Users can view their escrow transactions"
    ON escrow_transactions FOR SELECT
    USING (customer_id = auth.uid() OR tailor_id = auth.uid());

-- System can create escrow transactions
CREATE POLICY "System can create escrow transactions"
    ON escrow_transactions FOR INSERT
    WITH CHECK (true);

-- System can update escrow transactions
CREATE POLICY "System can update escrow transactions"
    ON escrow_transactions FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Admins can view all escrow transactions
CREATE POLICY "Admins can view all escrow transactions"
    ON escrow_transactions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Grant appropriate permissions for new tables
GRANT SELECT ON milestone_notifications TO authenticated;
GRANT SELECT, INSERT ON milestone_notifications TO service_role;
GRANT SELECT, INSERT, UPDATE ON escrow_transactions TO authenticated;
GRANT ALL ON escrow_transactions TO service_role;

-- Add helpful comments for new tables
COMMENT ON TABLE milestone_notifications IS 'Tracks reminder notifications sent to prevent duplicates';
COMMENT ON COLUMN milestone_notifications.notification_type IS 'Type of reminder: first_reminder (24h) or final_reminder (6h)';

COMMENT ON TABLE escrow_transactions IS 'Tracks all escrow payment transactions and milestone releases';
COMMENT ON COLUMN escrow_transactions.transaction_type IS 'Type of transaction: MILESTONE_RELEASE, ESCROW_HOLD, or REFUND';
COMMENT ON COLUMN escrow_transactions.amount IS 'Transaction amount in GHS (Ghana Cedis)';
COMMENT ON COLUMN escrow_transactions.metadata IS 'Additional transaction data in JSON format';

-- Create dispute_evidence table for tracking evidence files
CREATE TABLE IF NOT EXISTS dispute_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id UUID NOT NULL REFERENCES milestone_disputes(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain')),
    file_size INTEGER NOT NULL CHECK (file_size > 0),
    file_url TEXT NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES auth.users(id),
    uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT file_name_length CHECK (char_length(file_name) <= 255),
    CONSTRAINT file_url_format CHECK (file_url ~ '^https?://'),
    CONSTRAINT file_size_limit CHECK (file_size <= 10485760) -- 10MB limit
);

-- Create indexes for dispute evidence
CREATE INDEX IF NOT EXISTS idx_dispute_evidence_dispute_id ON dispute_evidence(dispute_id);
CREATE INDEX IF NOT EXISTS idx_dispute_evidence_uploaded_by ON dispute_evidence(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_dispute_evidence_uploaded_at ON dispute_evidence(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_dispute_evidence_file_type ON dispute_evidence(file_type);

-- Enable Row Level Security for dispute evidence
ALTER TABLE dispute_evidence ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dispute_evidence

-- Users can view evidence for disputes they're involved in
CREATE POLICY "Users can view evidence for their disputes"
    ON dispute_evidence FOR SELECT
    USING (
        dispute_id IN (
            SELECT id FROM milestone_disputes
            WHERE order_id IN (
                SELECT id FROM orders 
                WHERE customer_id = auth.uid() OR tailor_id = auth.uid()
            )
        )
    );

-- Users can upload evidence for disputes they're involved in
CREATE POLICY "Users can upload evidence for their disputes"
    ON dispute_evidence FOR INSERT
    WITH CHECK (
        dispute_id IN (
            SELECT id FROM milestone_disputes
            WHERE order_id IN (
                SELECT id FROM orders 
                WHERE customer_id = auth.uid() OR tailor_id = auth.uid()
            )
        )
        AND uploaded_by = auth.uid()
    );

-- Admins can view and manage all evidence
CREATE POLICY "Admins can manage all dispute evidence"
    ON dispute_evidence FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Grant appropriate permissions for dispute evidence
GRANT SELECT, INSERT ON dispute_evidence TO authenticated;
GRANT ALL ON dispute_evidence TO service_role;

-- Add helpful comments for dispute evidence table
COMMENT ON TABLE dispute_evidence IS 'Stores evidence files uploaded for milestone disputes';
COMMENT ON COLUMN dispute_evidence.file_name IS 'Original filename of the uploaded evidence';
COMMENT ON COLUMN dispute_evidence.file_type IS 'MIME type of the evidence file';
COMMENT ON COLUMN dispute_evidence.file_size IS 'File size in bytes (max 10MB)';
COMMENT ON COLUMN dispute_evidence.file_url IS 'Public URL to access the evidence file';

-- Create dispute_messages table for three-way messaging
CREATE TABLE IF NOT EXISTS dispute_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id UUID NOT NULL REFERENCES milestone_disputes(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id),
    sender_role TEXT NOT NULL CHECK (sender_role IN ('customer', 'tailor', 'admin')),
    sender_name TEXT NOT NULL,
    message TEXT NOT NULL CHECK (char_length(message) >= 1 AND char_length(message) <= 1000),
    is_internal BOOLEAN NOT NULL DEFAULT FALSE,
    read_by UUID[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT sender_name_length CHECK (char_length(sender_name) <= 100),
    CONSTRAINT internal_admin_only CHECK (NOT is_internal OR sender_role = 'admin')
);

-- Create indexes for dispute messages
CREATE INDEX IF NOT EXISTS idx_dispute_messages_dispute_id ON dispute_messages(dispute_id);
CREATE INDEX IF NOT EXISTS idx_dispute_messages_sender_id ON dispute_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_dispute_messages_created_at ON dispute_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_dispute_messages_is_internal ON dispute_messages(is_internal);

-- Enable Row Level Security for dispute messages
ALTER TABLE dispute_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dispute_messages

-- Users can view messages for disputes they're involved in (excluding internal notes for non-admins)
CREATE POLICY "Users can view messages for their disputes"
    ON dispute_messages FOR SELECT
    USING (
        dispute_id IN (
            SELECT id FROM milestone_disputes
            WHERE order_id IN (
                SELECT id FROM orders 
                WHERE customer_id = auth.uid() OR tailor_id = auth.uid()
            )
        )
        AND (
            NOT is_internal 
            OR EXISTS (
                SELECT 1 FROM auth.users 
                WHERE id = auth.uid() 
                AND raw_user_meta_data->>'role' = 'admin'
            )
        )
    );

-- Users can send messages for disputes they're involved in
CREATE POLICY "Users can send messages for their disputes"
    ON dispute_messages FOR INSERT
    WITH CHECK (
        dispute_id IN (
            SELECT id FROM milestone_disputes
            WHERE order_id IN (
                SELECT id FROM orders 
                WHERE customer_id = auth.uid() OR tailor_id = auth.uid()
            )
        )
        AND sender_id = auth.uid()
        AND (
            NOT is_internal 
            OR EXISTS (
                SELECT 1 FROM auth.users 
                WHERE id = auth.uid() 
                AND raw_user_meta_data->>'role' = 'admin'
            )
        )
    );

-- Users can update read status for messages
CREATE POLICY "Users can update message read status"
    ON dispute_messages FOR UPDATE
    USING (
        dispute_id IN (
            SELECT id FROM milestone_disputes
            WHERE order_id IN (
                SELECT id FROM orders 
                WHERE customer_id = auth.uid() OR tailor_id = auth.uid()
            )
        )
    )
    WITH CHECK (
        dispute_id IN (
            SELECT id FROM milestone_disputes
            WHERE order_id IN (
                SELECT id FROM orders 
                WHERE customer_id = auth.uid() OR tailor_id = auth.uid()
            )
        )
    );

-- Admins can view and manage all messages
CREATE POLICY "Admins can manage all dispute messages"
    ON dispute_messages FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Create function to mark messages as read
CREATE OR REPLACE FUNCTION mark_dispute_messages_read(
    p_message_ids UUID[],
    p_user_id UUID
)
RETURNS VOID AS $$
BEGIN
    -- Update messages to add user to read_by array if not already present
    UPDATE dispute_messages 
    SET read_by = array_append(
        CASE 
            WHEN read_by IS NULL THEN '{}'::UUID[]
            ELSE read_by 
        END, 
        p_user_id
    )
    WHERE id = ANY(p_message_ids)
    AND (read_by IS NULL OR NOT (p_user_id = ANY(read_by)));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant appropriate permissions for dispute messages
GRANT SELECT, INSERT, UPDATE ON dispute_messages TO authenticated;
GRANT ALL ON dispute_messages TO service_role;

-- Add helpful comments for dispute messages table
COMMENT ON TABLE dispute_messages IS 'Three-way messaging system for dispute resolution';
COMMENT ON COLUMN dispute_messages.sender_role IS 'Role of message sender: customer, tailor, or admin';
COMMENT ON COLUMN dispute_messages.is_internal IS 'Internal admin notes not visible to customer/tailor';
COMMENT ON COLUMN dispute_messages.read_by IS 'Array of user IDs who have read this message';
COMMENT ON FUNCTION mark_dispute_messages_read IS 'Marks dispute messages as read by a user';

-- Analytics Functions for Admin Reporting

-- Function to get milestone analytics overview
CREATE OR REPLACE FUNCTION get_milestone_analytics_overview(
  p_time_range_filter TEXT DEFAULT '',
  p_tailor_filter TEXT DEFAULT '',
  p_milestone_filter TEXT DEFAULT ''
) RETURNS TABLE (
  total_milestones BIGINT,
  approved_milestones BIGINT,
  rejected_milestones BIGINT,
  pending_milestones BIGINT,
  auto_approved_milestones BIGINT,
  average_approval_time NUMERIC,
  rejection_rate NUMERIC
) AS $$
DECLARE
  sql_query TEXT;
BEGIN
  sql_query := '
    WITH milestone_stats AS (
      SELECT 
        om.*,
        ma.action,
        CASE 
          WHEN ma.action = ''AUTO_APPROVED'' THEN 1 
          ELSE 0 
        END as is_auto_approved,
        EXTRACT(EPOCH FROM (
          COALESCE(om.customer_reviewed_at, om.auto_approval_deadline) - om.verified_at
        )) / 3600.0 as approval_time_hours
      FROM order_milestones om
      LEFT JOIN milestone_approvals ma ON om.id = ma.milestone_id
      LEFT JOIN orders o ON om.order_id = o.id
      WHERE om.verified_at IS NOT NULL ' 
      || p_time_range_filter || p_tailor_filter || p_milestone_filter || '
    )
    SELECT 
      COUNT(*)::BIGINT as total_milestones,
      COUNT(CASE WHEN approval_status = ''APPROVED'' THEN 1 END)::BIGINT as approved_milestones,
      COUNT(CASE WHEN approval_status = ''REJECTED'' THEN 1 END)::BIGINT as rejected_milestones,
      COUNT(CASE WHEN approval_status = ''PENDING'' THEN 1 END)::BIGINT as pending_milestones,
      SUM(is_auto_approved)::BIGINT as auto_approved_milestones,
      COALESCE(AVG(CASE WHEN approval_time_hours > 0 THEN approval_time_hours END), 0)::NUMERIC as average_approval_time,
      CASE 
        WHEN COUNT(*) > 0 THEN 
          (COUNT(CASE WHEN approval_status = ''REJECTED'' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC * 100)
        ELSE 0 
      END::NUMERIC as rejection_rate
    FROM milestone_stats';
  
  RETURN QUERY EXECUTE sql_query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get milestone breakdown statistics
CREATE OR REPLACE FUNCTION get_milestone_breakdown_stats(
  p_time_range_filter TEXT DEFAULT '',
  p_tailor_filter TEXT DEFAULT ''
) RETURNS TABLE (
  milestone TEXT,
  total BIGINT,
  approved BIGINT,
  rejected BIGINT,
  pending BIGINT,
  auto_approved BIGINT,
  avg_approval_time NUMERIC,
  rejection_rate NUMERIC
) AS $$
DECLARE
  sql_query TEXT;
BEGIN
  sql_query := '
    WITH milestone_stats AS (
      SELECT 
        om.milestone,
        om.approval_status,
        ma.action,
        CASE 
          WHEN ma.action = ''AUTO_APPROVED'' THEN 1 
          ELSE 0 
        END as is_auto_approved,
        EXTRACT(EPOCH FROM (
          COALESCE(om.customer_reviewed_at, om.auto_approval_deadline) - om.verified_at
        )) / 3600.0 as approval_time_hours
      FROM order_milestones om
      LEFT JOIN milestone_approvals ma ON om.id = ma.milestone_id
      LEFT JOIN orders o ON om.order_id = o.id
      WHERE om.verified_at IS NOT NULL ' 
      || p_time_range_filter || p_tailor_filter || '
    )
    SELECT 
      milestone::TEXT,
      COUNT(*)::BIGINT as total,
      COUNT(CASE WHEN approval_status = ''APPROVED'' THEN 1 END)::BIGINT as approved,
      COUNT(CASE WHEN approval_status = ''REJECTED'' THEN 1 END)::BIGINT as rejected,
      COUNT(CASE WHEN approval_status = ''PENDING'' THEN 1 END)::BIGINT as pending,
      SUM(is_auto_approved)::BIGINT as auto_approved,
      COALESCE(AVG(CASE WHEN approval_time_hours > 0 THEN approval_time_hours END), 0)::NUMERIC as avg_approval_time,
      CASE 
        WHEN COUNT(*) > 0 THEN 
          (COUNT(CASE WHEN approval_status = ''REJECTED'' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC * 100)
        ELSE 0 
      END::NUMERIC as rejection_rate
    FROM milestone_stats
    GROUP BY milestone
    ORDER BY milestone';
  
  RETURN QUERY EXECUTE sql_query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get tailor performance statistics
CREATE OR REPLACE FUNCTION get_tailor_performance_stats(
  p_time_range_filter TEXT DEFAULT '',
  p_milestone_filter TEXT DEFAULT ''
) RETURNS TABLE (
  tailor_id UUID,
  tailor_name TEXT,
  total_milestones BIGINT,
  approval_rate NUMERIC,
  rejection_rate NUMERIC,
  avg_approval_time NUMERIC
) AS $$
DECLARE
  sql_query TEXT;
BEGIN
  sql_query := '
    WITH tailor_stats AS (
      SELECT 
        o.tailor_id,
        COALESCE(profiles.full_name, profiles.email, ''Unknown'') as tailor_name,
        om.approval_status,
        EXTRACT(EPOCH FROM (
          COALESCE(om.customer_reviewed_at, om.auto_approval_deadline) - om.verified_at
        )) / 3600.0 as approval_time_hours
      FROM order_milestones om
      JOIN orders o ON om.order_id = o.id
      LEFT JOIN profiles ON o.tailor_id = profiles.id
      WHERE om.verified_at IS NOT NULL ' 
      || p_time_range_filter || p_milestone_filter || '
    )
    SELECT 
      tailor_id,
      tailor_name::TEXT,
      COUNT(*)::BIGINT as total_milestones,
      CASE 
        WHEN COUNT(*) > 0 THEN 
          (COUNT(CASE WHEN approval_status = ''APPROVED'' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC * 100)
        ELSE 0 
      END::NUMERIC as approval_rate,
      CASE 
        WHEN COUNT(*) > 0 THEN 
          (COUNT(CASE WHEN approval_status = ''REJECTED'' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC * 100)
        ELSE 0 
      END::NUMERIC as rejection_rate,
      COALESCE(AVG(CASE WHEN approval_time_hours > 0 THEN approval_time_hours END), 0)::NUMERIC as avg_approval_time
    FROM tailor_stats
    GROUP BY tailor_id, tailor_name
    HAVING COUNT(*) >= 3  -- Only include tailors with at least 3 milestones
    ORDER BY total_milestones DESC';
  
  RETURN QUERY EXECUTE sql_query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get milestone time series data
CREATE OR REPLACE FUNCTION get_milestone_time_series(
  p_time_range_filter TEXT DEFAULT '',
  p_tailor_filter TEXT DEFAULT ''
) RETURNS TABLE (
  date DATE,
  submitted BIGINT,
  approved BIGINT,
  rejected BIGINT,
  auto_approved BIGINT
) AS $$
DECLARE
  sql_query TEXT;
BEGIN
  sql_query := '
    WITH daily_stats AS (
      SELECT 
        DATE(om.verified_at) as date,
        om.approval_status,
        ma.action
      FROM order_milestones om
      LEFT JOIN milestone_approvals ma ON om.id = ma.milestone_id
      LEFT JOIN orders o ON om.order_id = o.id
      WHERE om.verified_at IS NOT NULL ' 
      || p_time_range_filter || p_tailor_filter || '
    )
    SELECT 
      date,
      COUNT(*)::BIGINT as submitted,
      COUNT(CASE WHEN approval_status = ''APPROVED'' THEN 1 END)::BIGINT as approved,
      COUNT(CASE WHEN approval_status = ''REJECTED'' THEN 1 END)::BIGINT as rejected,
      COUNT(CASE WHEN action = ''AUTO_APPROVED'' THEN 1 END)::BIGINT as auto_approved
    FROM daily_stats
    GROUP BY date
    ORDER BY date';
  
  RETURN QUERY EXECUTE sql_query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get milestone rejection patterns
CREATE OR REPLACE FUNCTION get_milestone_rejection_patterns(
  p_time_range_filter TEXT DEFAULT '',
  p_tailor_filter TEXT DEFAULT ''
) RETURNS TABLE (
  milestone TEXT,
  common_reasons JSONB
) AS $$
DECLARE
  sql_query TEXT;
BEGIN
  sql_query := '
    WITH rejection_reasons AS (
      SELECT 
        om.milestone,
        om.rejection_reason,
        COUNT(*) as reason_count
      FROM order_milestones om
      LEFT JOIN orders o ON om.order_id = o.id
      WHERE om.approval_status = ''REJECTED''
        AND om.rejection_reason IS NOT NULL ' 
        || p_time_range_filter || p_tailor_filter || '
      GROUP BY om.milestone, om.rejection_reason
    ),
    milestone_totals AS (
      SELECT milestone, SUM(reason_count) as total_rejections
      FROM rejection_reasons
      GROUP BY milestone
    )
    SELECT 
      rr.milestone::TEXT,
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            ''reason'', rr.rejection_reason,
            ''count'', rr.reason_count,
            ''percentage'', ROUND((rr.reason_count::NUMERIC / mt.total_rejections * 100), 1)
          )
          ORDER BY rr.reason_count DESC
        ) FILTER (WHERE rr.rejection_reason IS NOT NULL), 
        ''[]''::jsonb
      ) as common_reasons
    FROM rejection_reasons rr
    JOIN milestone_totals mt ON rr.milestone = mt.milestone
    GROUP BY rr.milestone
    ORDER BY rr.milestone';
  
  RETURN QUERY EXECUTE sql_query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for analytics functions to admins
GRANT EXECUTE ON FUNCTION get_milestone_analytics_overview TO service_role;
GRANT EXECUTE ON FUNCTION get_milestone_breakdown_stats TO service_role;
GRANT EXECUTE ON FUNCTION get_tailor_performance_stats TO service_role;
GRANT EXECUTE ON FUNCTION get_milestone_time_series TO service_role;
GRANT EXECUTE ON FUNCTION get_milestone_rejection_patterns TO service_role;

-- Add comments for analytics functions
COMMENT ON FUNCTION get_milestone_analytics_overview IS 'Returns comprehensive milestone analytics overview for admin reporting';
COMMENT ON FUNCTION get_milestone_breakdown_stats IS 'Returns milestone statistics broken down by milestone type';
COMMENT ON FUNCTION get_tailor_performance_stats IS 'Returns performance analytics for individual tailors';
COMMENT ON FUNCTION get_milestone_time_series IS 'Returns daily time series data for milestone trends';
COMMENT ON FUNCTION get_milestone_rejection_patterns IS 'Returns analysis of common rejection reasons by milestone type';