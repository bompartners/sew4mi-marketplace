# Database Schema

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Enum types
CREATE TYPE user_role AS ENUM ('CUSTOMER', 'TAILOR', 'ADMIN');
CREATE TYPE language AS ENUM ('EN', 'TWI', 'GA');
CREATE TYPE gender AS ENUM ('MALE', 'FEMALE');
CREATE TYPE verification_status AS ENUM ('PENDING', 'VERIFIED', 'SUSPENDED');
CREATE TYPE order_status AS ENUM (
    'DRAFT', 'PENDING_DEPOSIT', 'DEPOSIT_PAID', 'IN_PROGRESS',
    'READY_FOR_FITTING', 'FITTING_APPROVED', 'COMPLETING',
    'READY_FOR_DELIVERY', 'DELIVERED', 'DISPUTED', 'CANCELLED', 'REFUNDED'
);
CREATE TYPE escrow_stage AS ENUM ('DEPOSIT', 'FITTING', 'FINAL', 'RELEASED');
CREATE TYPE milestone_type AS ENUM (
    'FABRIC_SELECTED', 'CUTTING_STARTED', 'INITIAL_ASSEMBLY',
    'FITTING_READY', 'ADJUSTMENTS_COMPLETE', 'FINAL_PRESSING',
    'READY_FOR_DELIVERY'
);
CREATE TYPE transaction_type AS ENUM (
    'DEPOSIT', 'FITTING_PAYMENT', 'FINAL_PAYMENT', 'REFUND'
);
CREATE TYPE payment_provider AS ENUM ('MTN_MOMO', 'VODAFONE_CASH');
CREATE TYPE transaction_status AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- Users table (managed by Supabase Auth, extended with profile)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'CUSTOMER',
    preferred_language language DEFAULT 'EN',
    whatsapp_opt_in BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_phone CHECK (phone ~ '^\+233[0-9]{9}$')
);

-- Tailor profiles
CREATE TABLE tailor_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_name VARCHAR(255) NOT NULL,
    specializations TEXT[] NOT NULL,
    years_experience INTEGER NOT NULL,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    city VARCHAR(100) NOT NULL,
    verification_status verification_status DEFAULT 'PENDING',
    portfolio_images TEXT[],
    capacity INTEGER NOT NULL DEFAULT 10,
    average_delivery_days INTEGER NOT NULL DEFAULT 14,
    rating DECIMAL(2,1) DEFAULT 0.0,
    total_orders INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_user_tailor UNIQUE(user_id),
    CONSTRAINT valid_rating CHECK (rating >= 0 AND rating <= 5),
    CONSTRAINT valid_capacity CHECK (capacity > 0 AND capacity <= 100)
);

-- Measurement profiles
CREATE TABLE measurement_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nickname VARCHAR(100) NOT NULL,
    gender gender NOT NULL,
    measurements JSONB NOT NULL,
    voice_note_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_user_nickname UNIQUE(user_id, nickname)
);

-- Group orders for family coordination
CREATE TABLE group_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organizer_id UUID NOT NULL REFERENCES users(id),
    event_name VARCHAR(255) NOT NULL,
    event_date DATE NOT NULL,
    shared_fabric BOOLEAN DEFAULT false,
    total_orders INTEGER DEFAULT 0,
    whatsapp_group_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Main orders table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(20) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES users(id),
    tailor_id UUID NOT NULL REFERENCES tailor_profiles(id),
    measurement_profile_id UUID REFERENCES measurement_profiles(id),
    group_order_id UUID REFERENCES group_orders(id),
    garment_type VARCHAR(100) NOT NULL,
    fabric_choice VARCHAR(255),
    special_instructions TEXT,
    status order_status NOT NULL DEFAULT 'DRAFT',
    escrow_stage escrow_stage NOT NULL DEFAULT 'DEPOSIT',
    total_amount DECIMAL(10,2) NOT NULL,
    deposit_paid DECIMAL(10,2) DEFAULT 0,
    fitting_paid DECIMAL(10,2) DEFAULT 0,
    final_paid DECIMAL(10,2) DEFAULT 0,
    estimated_delivery DATE NOT NULL,
    actual_delivery DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_amounts CHECK (
        total_amount > 0 AND
        deposit_paid >= 0 AND
        fitting_paid >= 0 AND
        final_paid >= 0
    ),
    CONSTRAINT valid_dates CHECK (
        estimated_delivery > created_at::DATE
    )
);

-- Order milestones with photo verification
CREATE TABLE order_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    milestone milestone_type NOT NULL,
    photo_url TEXT NOT NULL,
    notes TEXT,
    verified_at TIMESTAMPTZ DEFAULT NOW(),
    verified_by UUID REFERENCES users(id),
    
    CONSTRAINT unique_order_milestone UNIQUE(order_id, milestone)
);

-- Payment transactions for audit trail
CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id),
    type transaction_type NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    provider payment_provider NOT NULL,
    provider_transaction_id VARCHAR(255) NOT NULL,
    status transaction_status NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_amount CHECK (amount > 0),
    CONSTRAINT unique_provider_tx UNIQUE(provider, provider_transaction_id)
);

-- Reviews and ratings
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id),
    reviewer_id UUID NOT NULL REFERENCES users(id),
    tailor_id UUID NOT NULL REFERENCES tailor_profiles(id),
    rating INTEGER NOT NULL,
    comment TEXT,
    photos TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_order_review UNIQUE(order_id),
    CONSTRAINT valid_review_rating CHECK (rating >= 1 AND rating <= 5)
);

-- Disputes for conflict resolution
CREATE TABLE disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id),
    raised_by UUID NOT NULL REFERENCES users(id),
    reason TEXT NOT NULL,
    evidence_urls TEXT[],
    resolution TEXT,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_order_dispute UNIQUE(order_id)
);

-- Indexes for performance
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_tailor_profiles_user ON tailor_profiles(user_id);
CREATE INDEX idx_tailor_profiles_location ON tailor_profiles USING GIST(location);
CREATE INDEX idx_tailor_profiles_city ON tailor_profiles(city);
CREATE INDEX idx_tailor_profiles_verification ON tailor_profiles(verification_status);
CREATE INDEX idx_tailor_profiles_rating ON tailor_profiles(rating DESC);
CREATE INDEX idx_measurement_profiles_user ON measurement_profiles(user_id);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_tailor ON orders(tailor_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_group ON orders(group_order_id);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_payment_transactions_order ON payment_transactions(order_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX idx_reviews_tailor ON reviews(tailor_id);
CREATE INDEX idx_disputes_order ON disputes(order_id);

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tailor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurement_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Comprehensive RLS policies for security
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'ADMIN'
        )
    );

-- Tailor profile policies
CREATE POLICY "Tailors can view own profile" ON tailor_profiles
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Customers can view verified tailors" ON tailor_profiles
    FOR SELECT USING (verification_status = 'VERIFIED');

CREATE POLICY "Admins can manage tailor profiles" ON tailor_profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'ADMIN'
        )
    );

-- Measurement profile policies
CREATE POLICY "Users can manage own measurements" ON measurement_profiles
    FOR ALL USING (auth.uid() = user_id);

-- Order policies
CREATE POLICY "Customers can view own orders" ON orders
    FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Customers can create orders" ON orders
    FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Tailors can view assigned orders" ON orders
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM tailor_profiles WHERE id = orders.tailor_id
        )
    );

CREATE POLICY "Tailors can update assigned orders" ON orders
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT user_id FROM tailor_profiles WHERE id = orders.tailor_id
        )
    );

CREATE POLICY "Admins can manage all orders" ON orders
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'ADMIN'
        )
    );

-- Payment transaction policies
CREATE POLICY "Users can view own payment transactions" ON payment_transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE id = payment_transactions.order_id 
            AND (customer_id = auth.uid() OR tailor_id IN (
                SELECT id FROM tailor_profiles WHERE user_id = auth.uid()
            ))
        )
    );

CREATE POLICY "System can create payment transactions" ON payment_transactions
    FOR INSERT WITH CHECK (true); -- Handled by service layer

CREATE POLICY "Admins can manage payment transactions" ON payment_transactions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'ADMIN'
        )
    );

-- Order milestones policies
CREATE POLICY "Order participants can view milestones" ON order_milestones
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE id = order_milestones.order_id 
            AND (customer_id = auth.uid() OR tailor_id IN (
                SELECT id FROM tailor_profiles WHERE user_id = auth.uid()
            ))
        )
    );

CREATE POLICY "Tailors can create milestones" ON order_milestones
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM orders 
            JOIN tailor_profiles ON orders.tailor_id = tailor_profiles.id
            WHERE orders.id = order_milestones.order_id 
            AND tailor_profiles.user_id = auth.uid()
        )
    );

-- Reviews policies
CREATE POLICY "Users can view public reviews" ON reviews
    FOR SELECT USING (true);

CREATE POLICY "Customers can create reviews for own orders" ON reviews
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE id = reviews.order_id AND customer_id = auth.uid()
        )
    );

-- Disputes policies
CREATE POLICY "Order participants can view disputes" ON disputes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE id = disputes.order_id 
            AND (customer_id = auth.uid() OR tailor_id IN (
                SELECT id FROM tailor_profiles WHERE user_id = auth.uid()
            ))
        )
    );

CREATE POLICY "Order participants can create disputes" ON disputes
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE id = disputes.order_id 
            AND (customer_id = auth.uid() OR tailor_id IN (
                SELECT id FROM tailor_profiles WHERE user_id = auth.uid()
            ))
        )
    );

CREATE POLICY "Admins can manage disputes" ON disputes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'ADMIN'
        )
    );

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_tailor_profiles_updated_at BEFORE UPDATE ON tailor_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to update tailor ratings
CREATE OR REPLACE FUNCTION update_tailor_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE tailor_profiles
    SET rating = (
        SELECT AVG(rating)::DECIMAL(2,1)
        FROM reviews
        WHERE tailor_id = NEW.tailor_id
    )
    WHERE id = NEW.tailor_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tailor_rating_on_review
    AFTER INSERT OR UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_tailor_rating();
```
