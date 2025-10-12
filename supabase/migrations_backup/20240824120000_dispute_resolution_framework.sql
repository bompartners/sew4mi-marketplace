-- Migration: Comprehensive Dispute Resolution Framework
-- Story 2.4: Dispute Resolution Framework
-- Date: 2024-08-24
-- Builds on existing dispute foundation from Story 2.3

-- Create enhanced dispute category enum type
DO $$ BEGIN
    CREATE TYPE dispute_category AS ENUM (
        'QUALITY_ISSUE',
        'DELIVERY_DELAY', 
        'PAYMENT_PROBLEM',
        'COMMUNICATION_ISSUE',
        'MILESTONE_REJECTION',
        'OTHER'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create dispute resolution type enum
DO $$ BEGIN
    CREATE TYPE dispute_resolution_type AS ENUM (
        'FULL_REFUND',
        'PARTIAL_REFUND',
        'ORDER_COMPLETION',
        'NO_ACTION'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Extend existing dispute_status enum to include ESCALATED
DO $$ BEGIN
    ALTER TYPE dispute_status ADD VALUE 'ESCALATED';
EXCEPTION
    WHEN invalid_parameter_value THEN null;
END $$;

-- Extend existing dispute_priority enum to include CRITICAL
DO $$ BEGIN
    ALTER TYPE dispute_priority RENAME TO dispute_priority_old;
    CREATE TYPE dispute_priority AS ENUM (
        'LOW',
        'MEDIUM', 
        'HIGH',
        'CRITICAL'
    );
    
    -- Update existing table to use new enum
    ALTER TABLE milestone_disputes 
    ALTER COLUMN priority TYPE dispute_priority 
    USING priority::text::dispute_priority;
    
    DROP TYPE dispute_priority_old;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create comprehensive disputes table (extending milestone_disputes for general disputes)
CREATE TABLE IF NOT EXISTS disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    milestone_id UUID REFERENCES order_milestones(id) ON DELETE CASCADE, -- Optional for non-milestone disputes
    created_by UUID NOT NULL REFERENCES auth.users(id),
    category dispute_category NOT NULL,
    title TEXT NOT NULL CHECK (char_length(title) >= 5 AND char_length(title) <= 200),
    description TEXT NOT NULL CHECK (char_length(description) >= 10 AND char_length(description) <= 2000),
    status dispute_status NOT NULL DEFAULT 'OPEN',
    priority dispute_priority NOT NULL DEFAULT 'MEDIUM',
    assigned_admin UUID REFERENCES auth.users(id),
    sla_deadline TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '48 hours'),
    
    -- Resolution fields
    resolution_type dispute_resolution_type,
    resolution_description TEXT,
    refund_amount DECIMAL(10,2) CHECK (refund_amount >= 0),
    resolved_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT title_length CHECK (char_length(title) <= 200),
    CONSTRAINT description_length CHECK (char_length(description) <= 2000),
    CONSTRAINT resolution_description_length CHECK (char_length(resolution_description) <= 1000),
    CONSTRAINT sla_deadline_valid CHECK (sla_deadline > created_at),
    CONSTRAINT resolution_requires_resolver CHECK (
        (status != 'RESOLVED' AND status != 'CLOSED') OR 
        (resolved_by IS NOT NULL AND resolved_at IS NOT NULL)
    ),
    CONSTRAINT refund_amount_requires_resolution CHECK (
        refund_amount IS NULL OR 
        (resolution_type IN ('FULL_REFUND', 'PARTIAL_REFUND') AND refund_amount > 0)
    )
);

-- Create dispute evidence table (enhanced version of existing structure)
CREATE TABLE IF NOT EXISTS dispute_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES auth.users(id),
    file_name TEXT NOT NULL CHECK (char_length(file_name) <= 255),
    file_type TEXT NOT NULL CHECK (file_type IN (
        'image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain'
    )),
    file_size INTEGER NOT NULL CHECK (file_size > 0 AND file_size <= 10485760), -- 10MB limit
    file_url TEXT NOT NULL CHECK (file_url ~ '^https?://'),
    description TEXT CHECK (char_length(description) <= 500),
    uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create dispute messages table for three-way communication
CREATE TABLE IF NOT EXISTS dispute_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id),
    sender_role TEXT NOT NULL CHECK (sender_role IN ('customer', 'tailor', 'admin')),
    sender_name TEXT NOT NULL CHECK (char_length(sender_name) <= 100),
    message TEXT NOT NULL CHECK (char_length(message) >= 1 AND char_length(message) <= 1000),
    attachments TEXT[], -- Array of file URLs
    is_internal BOOLEAN NOT NULL DEFAULT FALSE, -- Admin-only internal notes
    read_by UUID[] DEFAULT '{}', -- Array of user IDs who have read the message
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT internal_admin_only CHECK (NOT is_internal OR sender_role = 'admin'),
    CONSTRAINT attachments_limit CHECK (array_length(attachments, 1) <= 3)
);

-- Create dispute resolutions table for audit trail
CREATE TABLE IF NOT EXISTS dispute_resolutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
    resolution_type dispute_resolution_type NOT NULL,
    outcome TEXT NOT NULL CHECK (char_length(outcome) <= 1000),
    refund_amount DECIMAL(10,2) CHECK (refund_amount >= 0),
    reason_code TEXT NOT NULL CHECK (char_length(reason_code) <= 50),
    admin_notes TEXT CHECK (char_length(admin_notes) <= 2000),
    customer_notified BOOLEAN NOT NULL DEFAULT FALSE,
    tailor_notified BOOLEAN NOT NULL DEFAULT FALSE,
    payment_processed BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_by UUID NOT NULL REFERENCES auth.users(id),
    resolved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT refund_amount_valid CHECK (
        (resolution_type NOT IN ('FULL_REFUND', 'PARTIAL_REFUND')) OR 
        (refund_amount IS NOT NULL AND refund_amount > 0)
    )
);

-- Create indexes for efficient dispute queries
CREATE INDEX IF NOT EXISTS idx_disputes_order_id ON disputes(order_id);
CREATE INDEX IF NOT EXISTS idx_disputes_milestone_id ON disputes(milestone_id);
CREATE INDEX IF NOT EXISTS idx_disputes_created_by ON disputes(created_by);
CREATE INDEX IF NOT EXISTS idx_disputes_category ON disputes(category);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_priority ON disputes(priority);
CREATE INDEX IF NOT EXISTS idx_disputes_assigned_admin ON disputes(assigned_admin);
CREATE INDEX IF NOT EXISTS idx_disputes_sla_deadline ON disputes(sla_deadline) WHERE status IN ('OPEN', 'IN_PROGRESS');
CREATE INDEX IF NOT EXISTS idx_disputes_created_at ON disputes(created_at);
CREATE INDEX IF NOT EXISTS idx_disputes_resolved_at ON disputes(resolved_at);

-- Indexes for dispute evidence
CREATE INDEX IF NOT EXISTS idx_dispute_evidence_dispute_id ON dispute_evidence(dispute_id);
CREATE INDEX IF NOT EXISTS idx_dispute_evidence_uploaded_by ON dispute_evidence(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_dispute_evidence_uploaded_at ON dispute_evidence(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_dispute_evidence_file_type ON dispute_evidence(file_type);

-- Indexes for dispute messages
CREATE INDEX IF NOT EXISTS idx_dispute_messages_dispute_id ON dispute_messages(dispute_id);
CREATE INDEX IF NOT EXISTS idx_dispute_messages_sender_id ON dispute_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_dispute_messages_created_at ON dispute_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_dispute_messages_is_internal ON dispute_messages(is_internal);

-- Indexes for dispute resolutions
CREATE INDEX IF NOT EXISTS idx_dispute_resolutions_dispute_id ON dispute_resolutions(dispute_id);
CREATE INDEX IF NOT EXISTS idx_dispute_resolutions_resolved_by ON dispute_resolutions(resolved_by);
CREATE INDEX IF NOT EXISTS idx_dispute_resolutions_resolved_at ON dispute_resolutions(resolved_at);
CREATE INDEX IF NOT EXISTS idx_dispute_resolutions_resolution_type ON dispute_resolutions(resolution_type);

-- Create trigger functions for auto-updating timestamps
CREATE OR REPLACE FUNCTION update_disputes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_update_disputes_updated_at ON disputes;
CREATE TRIGGER trigger_update_disputes_updated_at
    BEFORE UPDATE ON disputes
    FOR EACH ROW
    EXECUTE FUNCTION update_disputes_updated_at();

-- Create function to calculate dispute priority based on order value and urgency
CREATE OR REPLACE FUNCTION calculate_dispute_priority(
    p_order_id UUID,
    p_category dispute_category,
    p_description TEXT
)
RETURNS dispute_priority AS $$
DECLARE
    v_order_amount DECIMAL(10,2);
    v_priority dispute_priority;
BEGIN
    -- Get order amount
    SELECT total_amount INTO v_order_amount 
    FROM orders 
    WHERE id = p_order_id;
    
    -- Calculate priority based on order value and category
    CASE 
        WHEN p_category = 'PAYMENT_PROBLEM' OR v_order_amount > 500 THEN
            v_priority := 'HIGH';
        WHEN p_category = 'QUALITY_ISSUE' AND v_order_amount > 200 THEN
            v_priority := 'HIGH';
        WHEN p_category = 'DELIVERY_DELAY' AND (
            p_description ILIKE '%urgent%' OR 
            p_description ILIKE '%wedding%' OR 
            p_description ILIKE '%event%'
        ) THEN
            v_priority := 'CRITICAL';
        WHEN v_order_amount > 100 THEN
            v_priority := 'MEDIUM';
        ELSE
            v_priority := 'LOW';
    END CASE;
    
    RETURN v_priority;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to create dispute with automatic priority calculation
CREATE OR REPLACE FUNCTION create_dispute(
    p_order_id UUID,
    p_milestone_id UUID DEFAULT NULL,
    p_created_by UUID,
    p_category dispute_category,
    p_title TEXT,
    p_description TEXT
)
RETURNS UUID AS $$
DECLARE
    v_dispute_id UUID;
    v_priority dispute_priority;
    v_sla_hours INTEGER;
BEGIN
    -- Calculate priority
    v_priority := calculate_dispute_priority(p_order_id, p_category, p_description);
    
    -- Set SLA based on priority
    v_sla_hours := CASE v_priority
        WHEN 'CRITICAL' THEN 4
        WHEN 'HIGH' THEN 24
        WHEN 'MEDIUM' THEN 48
        WHEN 'LOW' THEN 72
    END;
    
    -- Create dispute
    INSERT INTO disputes (
        order_id, milestone_id, created_by, category, title, description, 
        priority, sla_deadline
    ) VALUES (
        p_order_id, p_milestone_id, p_created_by, p_category, p_title, p_description,
        v_priority, now() + (v_sla_hours || ' hours')::INTERVAL
    ) RETURNING id INTO v_dispute_id;
    
    RETURN v_dispute_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to resolve dispute
CREATE OR REPLACE FUNCTION resolve_dispute(
    p_dispute_id UUID,
    p_resolved_by UUID,
    p_resolution_type dispute_resolution_type,
    p_outcome TEXT,
    p_refund_amount DECIMAL(10,2) DEFAULT NULL,
    p_reason_code TEXT DEFAULT 'ADMIN_DECISION',
    p_admin_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_resolution_id UUID;
BEGIN
    -- Validate dispute exists and is not already resolved
    IF NOT EXISTS (
        SELECT 1 FROM disputes 
        WHERE id = p_dispute_id AND status NOT IN ('RESOLVED', 'CLOSED')
    ) THEN
        RAISE EXCEPTION 'Dispute not found or already resolved';
    END IF;
    
    -- Update dispute status
    UPDATE disputes 
    SET 
        status = 'RESOLVED',
        resolution_type = p_resolution_type,
        resolution_description = p_outcome,
        refund_amount = p_refund_amount,
        resolved_by = p_resolved_by,
        resolved_at = now()
    WHERE id = p_dispute_id;
    
    -- Create resolution record
    INSERT INTO dispute_resolutions (
        dispute_id, resolution_type, outcome, refund_amount, 
        reason_code, admin_notes, resolved_by
    ) VALUES (
        p_dispute_id, p_resolution_type, p_outcome, p_refund_amount,
        p_reason_code, p_admin_notes, p_resolved_by
    ) RETURNING id INTO v_resolution_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to mark messages as read
CREATE OR REPLACE FUNCTION mark_dispute_messages_read(
    p_message_ids UUID[],
    p_user_id UUID
)
RETURNS VOID AS $$
BEGIN
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

-- Create function to get dispute analytics
CREATE OR REPLACE FUNCTION get_dispute_analytics(
    p_start_date DATE DEFAULT (CURRENT_DATE - INTERVAL '30 days')::DATE,
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
    total_disputes BIGINT,
    open_disputes BIGINT,
    resolved_disputes BIGINT,
    avg_resolution_time_hours NUMERIC,
    resolution_rate NUMERIC,
    category_breakdown JSONB,
    priority_breakdown JSONB,
    sla_performance JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH dispute_stats AS (
        SELECT 
            d.*,
            EXTRACT(EPOCH FROM (d.resolved_at - d.created_at)) / 3600.0 as resolution_time_hours,
            CASE 
                WHEN d.resolved_at IS NOT NULL AND d.resolved_at <= d.sla_deadline THEN TRUE
                ELSE FALSE
            END as sla_met
        FROM disputes d
        WHERE d.created_at::DATE BETWEEN p_start_date AND p_end_date
    ),
    aggregated_stats AS (
        SELECT 
            COUNT(*) as total_disputes,
            COUNT(*) FILTER (WHERE status IN ('OPEN', 'IN_PROGRESS')) as open_disputes,
            COUNT(*) FILTER (WHERE status IN ('RESOLVED', 'CLOSED')) as resolved_disputes,
            AVG(resolution_time_hours) FILTER (WHERE resolution_time_hours IS NOT NULL) as avg_resolution_time_hours,
            CASE 
                WHEN COUNT(*) > 0 THEN 
                    COUNT(*) FILTER (WHERE status IN ('RESOLVED', 'CLOSED'))::NUMERIC / COUNT(*)::NUMERIC * 100
                ELSE 0 
            END as resolution_rate,
            
            -- Category breakdown
            jsonb_object_agg(
                category::TEXT, 
                COUNT(*) FILTER (WHERE category IS NOT NULL)
            ) as category_breakdown,
            
            -- Priority breakdown  
            jsonb_object_agg(
                priority::TEXT,
                COUNT(*) FILTER (WHERE priority IS NOT NULL)
            ) as priority_breakdown,
            
            -- SLA performance
            jsonb_build_object(
                'total_resolved', COUNT(*) FILTER (WHERE resolved_at IS NOT NULL),
                'sla_met', COUNT(*) FILTER (WHERE sla_met = TRUE),
                'sla_missed', COUNT(*) FILTER (WHERE sla_met = FALSE AND resolved_at IS NOT NULL),
                'sla_performance_rate', 
                CASE 
                    WHEN COUNT(*) FILTER (WHERE resolved_at IS NOT NULL) > 0 THEN
                        COUNT(*) FILTER (WHERE sla_met = TRUE)::NUMERIC / 
                        COUNT(*) FILTER (WHERE resolved_at IS NOT NULL)::NUMERIC * 100
                    ELSE 0
                END
            ) as sla_performance
        FROM dispute_stats
    )
    SELECT 
        total_disputes::BIGINT,
        open_disputes::BIGINT, 
        resolved_disputes::BIGINT,
        avg_resolution_time_hours::NUMERIC,
        resolution_rate::NUMERIC,
        category_breakdown::JSONB,
        priority_breakdown::JSONB,
        sla_performance::JSONB
    FROM aggregated_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to resolve dispute with payment processing
CREATE OR REPLACE FUNCTION resolve_dispute_with_payment(
    p_dispute_id UUID,
    p_admin_id UUID,
    p_resolution_type dispute_resolution_type,
    p_outcome TEXT,
    p_refund_amount DECIMAL DEFAULT NULL,
    p_reason_code TEXT DEFAULT 'ADMIN_DECISION',
    p_admin_notes TEXT DEFAULT NULL,
    p_resolved_at TIMESTAMP DEFAULT now()
)
RETURNS JSONB AS $$
DECLARE
    v_dispute RECORD;
    v_order RECORD;
    v_resolution_id UUID;
    v_result JSONB;
BEGIN
    -- Get dispute and order information
    SELECT d.*, o.total_amount, o.customer_id, o.tailor_id
    INTO v_dispute, v_order
    FROM disputes d
    JOIN orders o ON d.order_id = o.id
    WHERE d.id = p_dispute_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Dispute not found';
    END IF;

    -- Check if dispute is already resolved
    IF v_dispute.status IN ('RESOLVED', 'CLOSED') THEN
        RAISE EXCEPTION 'Dispute is already resolved';
    END IF;

    -- Validate refund amount
    IF p_resolution_type IN ('FULL_REFUND', 'PARTIAL_REFUND') THEN
        IF p_refund_amount IS NULL OR p_refund_amount <= 0 THEN
            RAISE EXCEPTION 'Refund amount is required for refund resolutions';
        END IF;
        
        IF p_refund_amount > v_order.total_amount THEN
            RAISE EXCEPTION 'Refund amount cannot exceed order amount';
        END IF;
    END IF;

    -- Update dispute status and resolution
    UPDATE disputes
    SET 
        status = 'RESOLVED',
        resolution_type = p_resolution_type,
        outcome = p_outcome,
        refund_amount = p_refund_amount,
        resolved_at = p_resolved_at,
        resolved_by = p_admin_id,
        updated_at = p_resolved_at
    WHERE id = p_dispute_id;

    -- Create resolution record
    INSERT INTO dispute_resolutions (
        dispute_id,
        admin_id,
        resolution_type,
        outcome,
        refund_amount,
        reason_code,
        admin_notes,
        created_at
    ) VALUES (
        p_dispute_id,
        p_admin_id,
        p_resolution_type,
        p_outcome,
        p_refund_amount,
        p_reason_code,
        p_admin_notes,
        p_resolved_at
    ) RETURNING id INTO v_resolution_id;

    -- Process refund if applicable
    IF p_resolution_type IN ('FULL_REFUND', 'PARTIAL_REFUND') THEN
        -- Create payment adjustment record for refund
        INSERT INTO payment_adjustments (
            order_id,
            adjustment_type,
            amount,
            reason,
            processed_by,
            processed_at,
            reference_id,
            status
        ) VALUES (
            v_dispute.order_id,
            'REFUND',
            p_refund_amount,
            CONCAT('Dispute resolution: ', p_reason_code),
            p_admin_id,
            p_resolved_at,
            p_dispute_id,
            'PENDING'
        );

        -- Update order status if full refund
        IF p_resolution_type = 'FULL_REFUND' THEN
            UPDATE orders 
            SET 
                status = 'REFUNDED',
                updated_at = p_resolved_at
            WHERE id = v_dispute.order_id;
        END IF;
    END IF;

    -- If resolution is ORDER_COMPLETION, mark order as completed
    IF p_resolution_type = 'ORDER_COMPLETION' THEN
        UPDATE orders 
        SET 
            status = 'COMPLETED',
            completed_at = p_resolved_at,
            updated_at = p_resolved_at
        WHERE id = v_dispute.order_id;
    END IF;

    -- Build result
    v_result := jsonb_build_object(
        'dispute_id', p_dispute_id,
        'resolution_id', v_resolution_id,
        'resolution_type', p_resolution_type,
        'refund_amount', p_refund_amount,
        'resolved_at', p_resolved_at
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark dispute messages as read
CREATE OR REPLACE FUNCTION mark_dispute_messages_read(
    p_message_ids UUID[],
    p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    v_updated_count INTEGER := 0;
    v_message_id UUID;
BEGIN
    FOREACH v_message_id IN ARRAY p_message_ids
    LOOP
        UPDATE dispute_messages
        SET read_by = array_append(
            COALESCE(read_by, '{}'), 
            p_user_id
        )
        WHERE id = v_message_id
        AND NOT (p_user_id = ANY(COALESCE(read_by, '{}')));
        
        GET DIAGNOSTICS v_updated_count = v_updated_count + ROW_COUNT;
    END LOOP;
    
    RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create payment_adjustments table for refund processing
CREATE TABLE IF NOT EXISTS payment_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('REFUND', 'FEE_ADJUSTMENT', 'PENALTY')),
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    reason TEXT NOT NULL,
    processed_by UUID NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reference_id UUID, -- References dispute_id or other related record
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'PROCESSED', 'FAILED', 'CANCELLED')) DEFAULT 'PENDING',
    payment_transaction_id UUID, -- Link to actual payment transaction
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for payment_adjustments
CREATE INDEX IF NOT EXISTS idx_payment_adjustments_order_id ON payment_adjustments(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_adjustments_status ON payment_adjustments(status);
CREATE INDEX IF NOT EXISTS idx_payment_adjustments_processed_by ON payment_adjustments(processed_by);
CREATE INDEX IF NOT EXISTS idx_payment_adjustments_reference_id ON payment_adjustments(reference_id);

-- Create dispute_activities table for audit trail
CREATE TABLE IF NOT EXISTS dispute_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id UUID NOT NULL,
    user_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN (
        'CREATED', 'ASSIGNED', 'STATUS_CHANGED', 'RESOLVED', 
        'MESSAGE_SENT', 'INTERNAL_NOTE_ADDED', 'EVIDENCE_UPLOADED'
    )),
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for dispute_activities
CREATE INDEX IF NOT EXISTS idx_dispute_activities_dispute_id ON dispute_activities(dispute_id);
CREATE INDEX IF NOT EXISTS idx_dispute_activities_user_id ON dispute_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_dispute_activities_created_at ON dispute_activities(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for disputes table

-- Users can view disputes for orders they're involved in
CREATE POLICY "Users can view disputes for their orders"
    ON disputes FOR SELECT
    USING (
        order_id IN (
            SELECT id FROM orders 
            WHERE customer_id = auth.uid() OR tailor_id = auth.uid()
        )
    );

-- Users can create disputes for orders they're involved in
CREATE POLICY "Users can create disputes for their orders"
    ON disputes FOR INSERT
    WITH CHECK (
        order_id IN (
            SELECT id FROM orders 
            WHERE customer_id = auth.uid() OR tailor_id = auth.uid()
        )
        AND created_by = auth.uid()
    );

-- Users can update their own disputes (limited fields)
CREATE POLICY "Users can update their own disputes"
    ON disputes FOR UPDATE
    USING (created_by = auth.uid() AND status NOT IN ('RESOLVED', 'CLOSED'))
    WITH CHECK (created_by = auth.uid() AND status NOT IN ('RESOLVED', 'CLOSED'));

-- Admins can view and manage all disputes
CREATE POLICY "Admins can manage all disputes"
    ON disputes FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- RLS Policies for dispute_evidence table

-- Users can view evidence for disputes they're involved in
CREATE POLICY "Users can view evidence for their disputes"
    ON dispute_evidence FOR SELECT
    USING (
        dispute_id IN (
            SELECT id FROM disputes
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
            SELECT id FROM disputes
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

-- RLS Policies for dispute_messages table

-- Users can view messages for disputes they're involved in (excluding internal notes)
CREATE POLICY "Users can view messages for their disputes"
    ON dispute_messages FOR SELECT
    USING (
        dispute_id IN (
            SELECT id FROM disputes
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
            SELECT id FROM disputes
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
            SELECT id FROM disputes
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

-- RLS Policies for dispute_resolutions table

-- Users can view resolutions for their disputes
CREATE POLICY "Users can view resolutions for their disputes"
    ON dispute_resolutions FOR SELECT
    USING (
        dispute_id IN (
            SELECT id FROM disputes
            WHERE order_id IN (
                SELECT id FROM orders 
                WHERE customer_id = auth.uid() OR tailor_id = auth.uid()
            )
        )
    );

-- Only admins can create and manage resolutions
CREATE POLICY "Admins can manage all dispute resolutions"
    ON dispute_resolutions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Create views for admin dashboard
CREATE OR REPLACE VIEW admin_dispute_dashboard AS
SELECT 
    d.id,
    d.order_id,
    d.category,
    d.title,
    d.status,
    d.priority,
    d.assigned_admin,
    d.sla_deadline,
    d.created_at,
    d.resolved_at,
    o.total_amount as order_amount,
    u_creator.email as creator_email,
    u_customer.email as customer_email,
    u_tailor.email as tailor_email,
    u_admin.email as admin_email,
    CASE 
        WHEN d.status IN ('OPEN', 'IN_PROGRESS') AND d.sla_deadline < now() 
        THEN TRUE 
        ELSE FALSE 
    END as is_overdue,
    EXTRACT(EPOCH FROM (d.sla_deadline - now())) / 3600 as hours_until_sla,
    COUNT(dm.id) as message_count,
    COUNT(de.id) as evidence_count
FROM disputes d
JOIN orders o ON d.order_id = o.id
LEFT JOIN auth.users u_creator ON d.created_by = u_creator.id
LEFT JOIN auth.users u_customer ON o.customer_id = u_customer.id
LEFT JOIN auth.users u_tailor ON o.tailor_id = u_tailor.id
LEFT JOIN auth.users u_admin ON d.assigned_admin = u_admin.id
LEFT JOIN dispute_messages dm ON d.id = dm.dispute_id
LEFT JOIN dispute_evidence de ON d.id = de.dispute_id
GROUP BY d.id, o.total_amount, u_creator.email, u_customer.email, u_tailor.email, u_admin.email
ORDER BY 
    CASE d.priority
        WHEN 'CRITICAL' THEN 1
        WHEN 'HIGH' THEN 2
        WHEN 'MEDIUM' THEN 3
        WHEN 'LOW' THEN 4
    END,
    d.sla_deadline ASC;

-- RLS Policies for payment_adjustments table
CREATE POLICY "Users can view adjustments for their orders"
    ON payment_adjustments FOR SELECT
    USING (
        order_id IN (
            SELECT id FROM orders 
            WHERE customer_id = auth.uid() OR tailor_id = auth.uid()
        )
    );

-- Only admins can create and manage payment adjustments
CREATE POLICY "Admins can manage all payment adjustments"
    ON payment_adjustments FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- RLS Policies for dispute_activities table
CREATE POLICY "Users can view activities for their disputes"
    ON dispute_activities FOR SELECT
    USING (
        dispute_id IN (
            SELECT id FROM disputes
            WHERE order_id IN (
                SELECT id FROM orders 
                WHERE customer_id = auth.uid() OR tailor_id = auth.uid()
            )
        )
    );

-- Only authenticated users can create activities (typically through functions)
CREATE POLICY "Authenticated users can create activities"
    ON dispute_activities FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE ON disputes TO authenticated;
GRANT SELECT, INSERT ON dispute_evidence TO authenticated;
GRANT SELECT, INSERT, UPDATE ON dispute_messages TO authenticated;
GRANT SELECT ON dispute_resolutions TO authenticated;
GRANT SELECT ON payment_adjustments TO authenticated;
GRANT SELECT, INSERT ON dispute_activities TO authenticated;
GRANT SELECT ON admin_dispute_dashboard TO authenticated;

-- Grant admin functions to service_role
GRANT EXECUTE ON FUNCTION calculate_dispute_priority TO service_role;
GRANT EXECUTE ON FUNCTION create_dispute TO service_role;
GRANT EXECUTE ON FUNCTION resolve_dispute TO service_role;
GRANT EXECUTE ON FUNCTION resolve_dispute_with_payment TO service_role;
GRANT EXECUTE ON FUNCTION mark_dispute_messages_read TO service_role;
GRANT EXECUTE ON FUNCTION get_dispute_analytics TO service_role;

-- Add helpful comments
COMMENT ON TABLE disputes IS 'Comprehensive dispute resolution system for orders';
COMMENT ON COLUMN disputes.category IS 'Type of dispute: QUALITY_ISSUE, DELIVERY_DELAY, PAYMENT_PROBLEM, etc.';
COMMENT ON COLUMN disputes.priority IS 'Priority level: LOW, MEDIUM, HIGH, CRITICAL (auto-calculated)';
COMMENT ON COLUMN disputes.sla_deadline IS 'Deadline for initial admin response based on priority';
COMMENT ON COLUMN disputes.resolution_type IS 'Type of resolution: FULL_REFUND, PARTIAL_REFUND, ORDER_COMPLETION, NO_ACTION';

COMMENT ON TABLE dispute_evidence IS 'Evidence files uploaded for dispute resolution';
COMMENT ON TABLE dispute_messages IS 'Three-way messaging system for disputes';
COMMENT ON TABLE dispute_resolutions IS 'Audit trail for dispute resolution decisions';

COMMENT ON VIEW admin_dispute_dashboard IS 'Comprehensive dispute dashboard for admin management';

COMMENT ON FUNCTION create_dispute IS 'Creates dispute with automatic priority calculation and SLA setting';
COMMENT ON FUNCTION resolve_dispute IS 'Resolves dispute with outcome tracking and audit trail';
COMMENT ON FUNCTION get_dispute_analytics IS 'Returns comprehensive dispute analytics for reporting';