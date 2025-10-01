-- Group Order Management System Migration
-- Extends group order functionality with fabric coordination, bulk discounts, and delivery management

-- ============================================================================
-- 1. Extend group_orders table with enhanced functionality
-- ============================================================================

-- Add new columns to existing group_orders table
ALTER TABLE group_orders 
ADD COLUMN IF NOT EXISTS bulk_discount_percentage DECIMAL(5, 2) DEFAULT 0 CHECK (bulk_discount_percentage >= 0 AND bulk_discount_percentage <= 100),
ADD COLUMN IF NOT EXISTS total_original_amount DECIMAL(10, 2) DEFAULT 0 CHECK (total_original_amount >= 0),
ADD COLUMN IF NOT EXISTS total_discounted_amount DECIMAL(10, 2) DEFAULT 0 CHECK (total_discounted_amount >= 0),
ADD COLUMN IF NOT EXISTS payment_mode TEXT CHECK (payment_mode IN ('SINGLE_PAYER', 'SPLIT_PAYMENT')) DEFAULT 'SINGLE_PAYER',
ADD COLUMN IF NOT EXISTS delivery_strategy TEXT CHECK (delivery_strategy IN ('ALL_TOGETHER', 'STAGGERED')) DEFAULT 'ALL_TOGETHER',
ADD COLUMN IF NOT EXISTS shared_fabric BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS fabric_type TEXT,
ADD COLUMN IF NOT EXISTS fabric_color TEXT,
ADD COLUMN IF NOT EXISTS fabric_pattern TEXT,
ADD COLUMN IF NOT EXISTS total_yardage DECIMAL(10, 2) CHECK (total_yardage >= 0),
ADD COLUMN IF NOT EXISTS cost_per_yard DECIMAL(10, 2) CHECK (cost_per_yard >= 0),
ADD COLUMN IF NOT EXISTS total_fabric_cost DECIMAL(10, 2) CHECK (total_fabric_cost >= 0),
ADD COLUMN IF NOT EXISTS preferred_vendor TEXT,
ADD COLUMN IF NOT EXISTS fabric_lot TEXT,
ADD COLUMN IF NOT EXISTS fabric_source TEXT CHECK (fabric_source IN ('CUSTOMER_PROVIDED', 'TAILOR_SOURCED')),
ADD COLUMN IF NOT EXISTS coordination_notes TEXT,
ADD COLUMN IF NOT EXISTS tailor_id UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS estimated_completion_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS group_order_number TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS completed_items INTEGER DEFAULT 0 CHECK (completed_items >= 0),
ADD COLUMN IF NOT EXISTS in_progress_items INTEGER DEFAULT 0 CHECK (in_progress_items >= 0),
ADD COLUMN IF NOT EXISTS ready_for_delivery INTEGER DEFAULT 0 CHECK (ready_for_delivery >= 0),
ADD COLUMN IF NOT EXISTS pending_items INTEGER DEFAULT 0 CHECK (pending_items >= 0),
ADD COLUMN IF NOT EXISTS overall_progress_percentage DECIMAL(5, 2) DEFAULT 0 CHECK (overall_progress_percentage >= 0 AND overall_progress_percentage <= 100),
ADD COLUMN IF NOT EXISTS estimated_days_remaining INTEGER CHECK (estimated_days_remaining >= 0),
ADD COLUMN IF NOT EXISTS next_group_milestone TEXT;

-- Update status enum to include new statuses
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t 
        JOIN pg_enum e ON t.oid = e.enumtypid 
        WHERE t.typname = 'group_order_status' 
        AND e.enumlabel = 'DRAFT'
    ) THEN
        -- Drop and recreate the enum with all values
        ALTER TABLE group_orders ALTER COLUMN status DROP DEFAULT;
        ALTER TABLE group_orders ALTER COLUMN status TYPE TEXT;
        DROP TYPE IF EXISTS group_order_status_old CASCADE;
        ALTER TABLE group_orders ALTER COLUMN status SET DEFAULT 'DRAFT';
    END IF;
END $$;

-- ============================================================================
-- 2. Create group_order_items table
-- ============================================================================

CREATE TABLE IF NOT EXISTS group_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_order_id UUID NOT NULL REFERENCES group_orders(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    family_member_profile_id UUID NOT NULL,
    family_member_name TEXT NOT NULL,
    garment_type TEXT NOT NULL,
    individual_discount DECIMAL(10, 2) DEFAULT 0 CHECK (individual_discount >= 0),
    delivery_priority INTEGER DEFAULT 5 CHECK (delivery_priority >= 1 AND delivery_priority <= 10),
    payment_responsibility UUID NOT NULL REFERENCES users(id),
    coordinated_design_notes TEXT,
    individual_amount DECIMAL(10, 2) NOT NULL CHECK (individual_amount > 0),
    discounted_amount DECIMAL(10, 2) NOT NULL CHECK (discounted_amount > 0),
    status TEXT NOT NULL DEFAULT 'PENDING',
    progress_percentage DECIMAL(5, 2) DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    estimated_delivery TIMESTAMPTZ NOT NULL,
    actual_delivery TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_order_in_group UNIQUE (group_order_id, order_id),
    CONSTRAINT valid_discount CHECK (discounted_amount <= individual_amount)
);

-- Create indexes for group_order_items
CREATE INDEX idx_group_order_items_group_order_id ON group_order_items(group_order_id);
CREATE INDEX idx_group_order_items_order_id ON group_order_items(order_id);
CREATE INDEX idx_group_order_items_family_member_profile_id ON group_order_items(family_member_profile_id);
CREATE INDEX idx_group_order_items_payment_responsibility ON group_order_items(payment_responsibility);
CREATE INDEX idx_group_order_items_status ON group_order_items(status);
CREATE INDEX idx_group_order_items_delivery_priority ON group_order_items(delivery_priority);

-- Create updated_at trigger for group_order_items
CREATE TRIGGER update_group_order_items_updated_at 
    BEFORE UPDATE ON group_order_items 
    FOR EACH ROW 
    EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================================
-- 3. Create group_payment_tracking table
-- ============================================================================

CREATE TABLE IF NOT EXISTS group_payment_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_order_id UUID NOT NULL REFERENCES group_orders(id) ON DELETE CASCADE,
    payer_id UUID NOT NULL REFERENCES users(id),
    payer_name TEXT NOT NULL,
    responsibility TEXT[] NOT NULL, -- Array of order IDs
    total_responsible_amount DECIMAL(10, 2) NOT NULL CHECK (total_responsible_amount >= 0),
    paid_amount DECIMAL(10, 2) DEFAULT 0 CHECK (paid_amount >= 0),
    outstanding_amount DECIMAL(10, 2) GENERATED ALWAYS AS (total_responsible_amount - paid_amount) STORED,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PARTIAL', 'COMPLETED', 'OVERDUE')),
    deposit_paid DECIMAL(10, 2) DEFAULT 0 CHECK (deposit_paid >= 0),
    fitting_paid DECIMAL(10, 2) DEFAULT 0 CHECK (fitting_paid >= 0),
    final_paid DECIMAL(10, 2) DEFAULT 0 CHECK (final_paid >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_payer_per_group UNIQUE (group_order_id, payer_id),
    CONSTRAINT valid_payment_total CHECK (paid_amount <= total_responsible_amount)
);

-- Create indexes for group_payment_tracking
CREATE INDEX idx_group_payment_tracking_group_order_id ON group_payment_tracking(group_order_id);
CREATE INDEX idx_group_payment_tracking_payer_id ON group_payment_tracking(payer_id);
CREATE INDEX idx_group_payment_tracking_status ON group_payment_tracking(status);

-- Create updated_at trigger for group_payment_tracking
CREATE TRIGGER update_group_payment_tracking_updated_at 
    BEFORE UPDATE ON group_payment_tracking 
    FOR EACH ROW 
    EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================================
-- 4. Create group_delivery_schedules table
-- ============================================================================

CREATE TABLE IF NOT EXISTS group_delivery_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_order_id UUID NOT NULL REFERENCES group_orders(id) ON DELETE CASCADE,
    order_items UUID[] NOT NULL, -- Array of order item IDs
    scheduled_date TIMESTAMPTZ NOT NULL,
    actual_date TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'READY', 'IN_TRANSIT', 'DELIVERED', 'FAILED')),
    notes TEXT,
    notification_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for group_delivery_schedules
CREATE INDEX idx_group_delivery_schedules_group_order_id ON group_delivery_schedules(group_order_id);
CREATE INDEX idx_group_delivery_schedules_status ON group_delivery_schedules(status);
CREATE INDEX idx_group_delivery_schedules_scheduled_date ON group_delivery_schedules(scheduled_date);
CREATE INDEX idx_group_delivery_schedules_notification_sent ON group_delivery_schedules(notification_sent) WHERE notification_sent = false;

-- Create updated_at trigger for group_delivery_schedules
CREATE TRIGGER update_group_delivery_schedules_updated_at 
    BEFORE UPDATE ON group_delivery_schedules 
    FOR EACH ROW 
    EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================================
-- 5. Create tailor_group_coordination table
-- ============================================================================

CREATE TABLE IF NOT EXISTS tailor_group_coordination (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_order_id UUID NOT NULL REFERENCES group_orders(id) ON DELETE CASCADE,
    tailor_id UUID NOT NULL REFERENCES users(id),
    coordination_notes TEXT,
    total_yards_needed DECIMAL(10, 2) NOT NULL CHECK (total_yards_needed >= 0),
    recommended_purchase_quantity DECIMAL(10, 2) NOT NULL CHECK (recommended_purchase_quantity >= 0),
    buffer_percentage DECIMAL(5, 2) DEFAULT 10 CHECK (buffer_percentage >= 0 AND buffer_percentage <= 100),
    estimated_waste DECIMAL(10, 2) DEFAULT 0 CHECK (estimated_waste >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_tailor_group UNIQUE (group_order_id, tailor_id)
);

-- Create indexes for tailor_group_coordination
CREATE INDEX idx_tailor_group_coordination_group_order_id ON tailor_group_coordination(group_order_id);
CREATE INDEX idx_tailor_group_coordination_tailor_id ON tailor_group_coordination(tailor_id);

-- Create updated_at trigger for tailor_group_coordination
CREATE TRIGGER update_tailor_group_coordination_updated_at 
    BEFORE UPDATE ON tailor_group_coordination 
    FOR EACH ROW 
    EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================================
-- 6. Create design_suggestions table
-- ============================================================================

CREATE TABLE IF NOT EXISTS design_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_order_id UUID NOT NULL REFERENCES group_orders(id) ON DELETE CASCADE,
    tailor_id UUID NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('FABRIC', 'COLOR', 'PATTERN', 'ACCESSORIES', 'STYLE')),
    image_urls TEXT[],
    applicable_items UUID[], -- Array of order item IDs
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for design_suggestions
CREATE INDEX idx_design_suggestions_group_order_id ON design_suggestions(group_order_id);
CREATE INDEX idx_design_suggestions_tailor_id ON design_suggestions(tailor_id);
CREATE INDEX idx_design_suggestions_category ON design_suggestions(category);

-- ============================================================================
-- 7. Create fabric_allocations table
-- ============================================================================

CREATE TABLE IF NOT EXISTS fabric_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_order_id UUID NOT NULL REFERENCES group_orders(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    garment_type TEXT NOT NULL,
    yards_allocated DECIMAL(10, 2) NOT NULL CHECK (yards_allocated > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_order_allocation UNIQUE (group_order_id, order_id)
);

-- Create indexes for fabric_allocations
CREATE INDEX idx_fabric_allocations_group_order_id ON fabric_allocations(group_order_id);
CREATE INDEX idx_fabric_allocations_order_id ON fabric_allocations(order_id);

-- Create updated_at trigger for fabric_allocations
CREATE TRIGGER update_fabric_allocations_updated_at 
    BEFORE UPDATE ON fabric_allocations 
    FOR EACH ROW 
    EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================================
-- 8. Create production_schedules table
-- ============================================================================

CREATE TABLE IF NOT EXISTS production_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_order_id UUID NOT NULL REFERENCES group_orders(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    family_member_name TEXT NOT NULL,
    garment_type TEXT NOT NULL,
    priority INTEGER NOT NULL CHECK (priority >= 1 AND priority <= 10),
    estimated_start_date TIMESTAMPTZ NOT NULL,
    estimated_completion_date TIMESTAMPTZ NOT NULL,
    dependencies UUID[], -- Array of order IDs that must complete first
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_order_schedule UNIQUE (group_order_id, order_id),
    CONSTRAINT valid_date_range CHECK (estimated_completion_date > estimated_start_date)
);

-- Create indexes for production_schedules
CREATE INDEX idx_production_schedules_group_order_id ON production_schedules(group_order_id);
CREATE INDEX idx_production_schedules_order_id ON production_schedules(order_id);
CREATE INDEX idx_production_schedules_priority ON production_schedules(priority);
CREATE INDEX idx_production_schedules_start_date ON production_schedules(estimated_start_date);

-- Create updated_at trigger for production_schedules
CREATE TRIGGER update_production_schedules_updated_at 
    BEFORE UPDATE ON production_schedules 
    FOR EACH ROW 
    EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================================
-- 9. Functions for group order management
-- ============================================================================

-- Function to generate unique group order number
CREATE OR REPLACE FUNCTION generate_group_order_number()
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
    number_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate format: GRP + YYMMDD + sequential 3-digit number
        new_number := 'GRP' || TO_CHAR(NOW(), 'YYMMDD') || 
                     LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0');
        
        -- Check if number exists
        SELECT EXISTS(SELECT 1 FROM group_orders WHERE group_order_number = new_number) 
        INTO number_exists;
        
        EXIT WHEN NOT number_exists;
    END LOOP;
    
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function to update group order progress summary
CREATE OR REPLACE FUNCTION update_group_order_progress()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the group order progress summary based on individual item statuses
    UPDATE group_orders
    SET 
        completed_items = (
            SELECT COUNT(*) FROM group_order_items 
            WHERE group_order_id = NEW.group_order_id 
            AND status IN ('COMPLETED', 'DELIVERED')
        ),
        in_progress_items = (
            SELECT COUNT(*) FROM group_order_items 
            WHERE group_order_id = NEW.group_order_id 
            AND status IN ('IN_PROGRESS', 'IN_PRODUCTION', 'FITTING_READY')
        ),
        ready_for_delivery = (
            SELECT COUNT(*) FROM group_order_items 
            WHERE group_order_id = NEW.group_order_id 
            AND status = 'READY_FOR_DELIVERY'
        ),
        pending_items = (
            SELECT COUNT(*) FROM group_order_items 
            WHERE group_order_id = NEW.group_order_id 
            AND status IN ('PENDING', 'DRAFT', 'DEPOSIT_PAID')
        ),
        overall_progress_percentage = (
            SELECT COALESCE(AVG(progress_percentage), 0) 
            FROM group_order_items 
            WHERE group_order_id = NEW.group_order_id
        )
    WHERE id = NEW.group_order_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update group order progress when items change
CREATE TRIGGER update_group_progress_on_item_change
    AFTER INSERT OR UPDATE OF status, progress_percentage ON group_order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_group_order_progress();

-- Function to calculate bulk discount
CREATE OR REPLACE FUNCTION calculate_bulk_discount(item_count INTEGER)
RETURNS DECIMAL AS $$
BEGIN
    IF item_count < 3 THEN
        RETURN 0;
    ELSIF item_count >= 3 AND item_count <= 5 THEN
        RETURN 15;
    ELSIF item_count >= 6 AND item_count <= 9 THEN
        RETURN 20;
    ELSE
        RETURN 25;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- 10. Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE group_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_payment_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_delivery_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE tailor_group_coordination ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fabric_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for group_order_items
CREATE POLICY "Users can view items in their group orders" ON group_order_items
    FOR SELECT USING (
        group_order_id IN (
            SELECT id FROM group_orders WHERE organizer_id = auth.uid()
        ) OR payment_responsibility = auth.uid()
    );

CREATE POLICY "Group organizers can insert items" ON group_order_items
    FOR INSERT WITH CHECK (
        group_order_id IN (
            SELECT id FROM group_orders WHERE organizer_id = auth.uid()
        )
    );

CREATE POLICY "Group organizers can update items" ON group_order_items
    FOR UPDATE USING (
        group_order_id IN (
            SELECT id FROM group_orders WHERE organizer_id = auth.uid()
        )
    );

-- RLS Policies for group_payment_tracking
CREATE POLICY "Users can view their payment tracking" ON group_payment_tracking
    FOR SELECT USING (
        payer_id = auth.uid() OR 
        group_order_id IN (
            SELECT id FROM group_orders WHERE organizer_id = auth.uid()
        )
    );

CREATE POLICY "Payers can update their payments" ON group_payment_tracking
    FOR UPDATE USING (payer_id = auth.uid());

-- RLS Policies for group_delivery_schedules
CREATE POLICY "Users can view delivery schedules for their groups" ON group_delivery_schedules
    FOR SELECT USING (
        group_order_id IN (
            SELECT id FROM group_orders WHERE organizer_id = auth.uid()
        ) OR group_order_id IN (
            SELECT DISTINCT group_order_id FROM group_order_items 
            WHERE payment_responsibility = auth.uid()
        )
    );

-- RLS Policies for tailor_group_coordination
CREATE POLICY "Tailors can view their group coordination" ON tailor_group_coordination
    FOR SELECT USING (tailor_id = auth.uid());

CREATE POLICY "Tailors can manage their group coordination" ON tailor_group_coordination
    FOR ALL USING (tailor_id = auth.uid());

-- RLS Policies for design_suggestions
CREATE POLICY "Users can view design suggestions for their groups" ON design_suggestions
    FOR SELECT USING (
        group_order_id IN (
            SELECT id FROM group_orders WHERE organizer_id = auth.uid()
        ) OR tailor_id = auth.uid()
    );

CREATE POLICY "Tailors can create design suggestions" ON design_suggestions
    FOR INSERT WITH CHECK (tailor_id = auth.uid());

-- RLS Policies for fabric_allocations
CREATE POLICY "Users can view fabric allocations for their groups" ON fabric_allocations
    FOR SELECT USING (
        group_order_id IN (
            SELECT id FROM group_orders WHERE organizer_id = auth.uid()
        ) OR group_order_id IN (
            SELECT group_order_id FROM tailor_group_coordination WHERE tailor_id = auth.uid()
        )
    );

-- RLS Policies for production_schedules
CREATE POLICY "Users can view production schedules for their groups" ON production_schedules
    FOR SELECT USING (
        group_order_id IN (
            SELECT id FROM group_orders WHERE organizer_id = auth.uid()
        ) OR group_order_id IN (
            SELECT group_order_id FROM tailor_group_coordination WHERE tailor_id = auth.uid()
        )
    );

-- ============================================================================
-- 11. Create indexes for group_orders extended columns
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_group_orders_tailor_id ON group_orders(tailor_id);
CREATE INDEX IF NOT EXISTS idx_group_orders_payment_mode ON group_orders(payment_mode);
CREATE INDEX IF NOT EXISTS idx_group_orders_delivery_strategy ON group_orders(delivery_strategy);
CREATE INDEX IF NOT EXISTS idx_group_orders_group_order_number ON group_orders(group_order_number);
CREATE INDEX IF NOT EXISTS idx_group_orders_estimated_completion ON group_orders(estimated_completion_date);
CREATE INDEX IF NOT EXISTS idx_group_orders_shared_fabric ON group_orders(shared_fabric) WHERE shared_fabric = true;

-- ============================================================================
-- 12. Comments for documentation
-- ============================================================================

COMMENT ON TABLE group_order_items IS 'Individual order items within a group order for family event coordination';
COMMENT ON TABLE group_payment_tracking IS 'Tracks payment responsibilities and status for group orders with split or single payment modes';
COMMENT ON TABLE group_delivery_schedules IS 'Manages staggered delivery schedules for completed items within group orders';
COMMENT ON TABLE tailor_group_coordination IS 'Tailor coordination data for managing group orders including fabric calculations';
COMMENT ON TABLE design_suggestions IS 'Design coordination suggestions from tailors for group orders';
COMMENT ON TABLE fabric_allocations IS 'Fabric yardage allocations for individual orders within a group';
COMMENT ON TABLE production_schedules IS 'Production scheduling and prioritization for group order items';

COMMENT ON FUNCTION generate_group_order_number() IS 'Generates unique group order numbers in format GRP + YYMMDD + sequential number';
COMMENT ON FUNCTION calculate_bulk_discount(INTEGER) IS 'Calculates bulk discount percentage based on number of items (15% for 3-5, 20% for 6-9, 25% for 10+)';
COMMENT ON FUNCTION update_group_order_progress() IS 'Automatically updates group order progress summary when individual items change status';

