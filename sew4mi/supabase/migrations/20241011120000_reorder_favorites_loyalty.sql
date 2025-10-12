-- Migration for Story 4.3: Reorder and Favorites
-- Creates tables for favorite_orders, loyalty_accounts, loyalty_transactions, loyalty_rewards, and order_analytics

-- ==============================================
-- FAVORITE ORDERS TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS favorite_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  nickname VARCHAR(100) NOT NULL,
  shared_with_profiles UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_favorite_order UNIQUE(user_id, order_id)
);

CREATE INDEX idx_favorite_orders_user ON favorite_orders(user_id);
CREATE INDEX idx_favorite_orders_order ON favorite_orders(order_id);

COMMENT ON TABLE favorite_orders IS 'User favorite garment orders for quick reordering';
COMMENT ON COLUMN favorite_orders.nickname IS 'User-assigned name like "My Wedding Suit"';
COMMENT ON COLUMN favorite_orders.shared_with_profiles IS 'Array of measurement_profile IDs for family sharing';

-- ==============================================
-- LOYALTY SYSTEM TABLES
-- ==============================================

-- Loyalty tier enum
CREATE TYPE loyalty_tier AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM');

-- Loyalty accounts table
CREATE TABLE IF NOT EXISTS loyalty_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  total_points INTEGER DEFAULT 0,
  available_points INTEGER DEFAULT 0,
  lifetime_points INTEGER DEFAULT 0,
  tier loyalty_tier DEFAULT 'BRONZE',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_points CHECK (available_points >= 0 AND available_points <= total_points)
);

CREATE INDEX idx_loyalty_accounts_user ON loyalty_accounts(user_id);
CREATE INDEX idx_loyalty_accounts_tier ON loyalty_accounts(tier);

COMMENT ON TABLE loyalty_accounts IS 'User loyalty program accounts with points and tier status';
COMMENT ON COLUMN loyalty_accounts.total_points IS 'Total unexpired points including those used';
COMMENT ON COLUMN loyalty_accounts.available_points IS 'Points available for redemption';
COMMENT ON COLUMN loyalty_accounts.lifetime_points IS 'All-time points earned regardless of expiry';

-- Loyalty transaction type enum
CREATE TYPE loyalty_transaction_type AS ENUM ('EARN', 'REDEEM', 'EXPIRE', 'BONUS');

-- Loyalty transactions table
CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id),
  type loyalty_transaction_type NOT NULL,
  points INTEGER NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_transaction_points CHECK (points != 0)
);

CREATE INDEX idx_loyalty_transactions_user ON loyalty_transactions(user_id);
CREATE INDEX idx_loyalty_transactions_order ON loyalty_transactions(order_id);
CREATE INDEX idx_loyalty_transactions_created ON loyalty_transactions(created_at DESC);

COMMENT ON TABLE loyalty_transactions IS 'History of all loyalty point transactions';
COMMENT ON COLUMN loyalty_transactions.type IS 'Transaction type: EARN (points earned), REDEEM (points spent), EXPIRE (points expired), BONUS (milestone/referral bonus)';

-- Reward type enum
CREATE TYPE reward_type AS ENUM ('DISCOUNT', 'PRIORITY', 'FREE_DELIVERY');

-- Loyalty rewards catalog table
CREATE TABLE IF NOT EXISTS loyalty_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  points_cost INTEGER NOT NULL,
  discount_percentage DECIMAL(5,2),
  discount_amount DECIMAL(10,2),
  reward_type reward_type NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_loyalty_rewards_active ON loyalty_rewards(is_active);

COMMENT ON TABLE loyalty_rewards IS 'Catalog of available loyalty rewards';
COMMENT ON COLUMN loyalty_rewards.discount_percentage IS 'Percentage discount (e.g., 10.00 for 10%)';
COMMENT ON COLUMN loyalty_rewards.discount_amount IS 'Fixed discount amount in GHS';

-- ==============================================
-- ORDER ANALYTICS TABLE
-- ==============================================

CREATE TABLE IF NOT EXISTS order_analytics (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  garment_type_frequency JSONB DEFAULT '{}',
  fabric_preferences JSONB DEFAULT '{}',
  color_preferences JSONB DEFAULT '{}',
  avg_order_value DECIMAL(10,2) DEFAULT 0,
  preferred_tailors UUID[] DEFAULT '{}',
  seasonal_patterns JSONB DEFAULT '{}',
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_analytics_updated ON order_analytics(last_updated);

COMMENT ON TABLE order_analytics IS 'Aggregated user order data for personalized recommendations';
COMMENT ON COLUMN order_analytics.garment_type_frequency IS 'JSON object of garment types to frequency count';
COMMENT ON COLUMN order_analytics.fabric_preferences IS 'JSON object of fabrics to preference score';
COMMENT ON COLUMN order_analytics.color_preferences IS 'JSON object of colors to preference score';
COMMENT ON COLUMN order_analytics.seasonal_patterns IS 'JSON object of seasons to frequently ordered garment types';

-- ==============================================
-- SEED DEFAULT LOYALTY REWARDS
-- ==============================================

INSERT INTO loyalty_rewards (name, description, points_cost, discount_percentage, reward_type, is_active) VALUES
  ('10% Discount', 'Save 10% on your next order', 500, 10.00, 'DISCOUNT', true),
  ('15% Discount', 'Save 15% on your next order', 750, 15.00, 'DISCOUNT', true),
  ('20% Discount', 'Save 20% on your next order', 1000, 20.00, 'DISCOUNT', true),
  ('Free Delivery', 'Free delivery on your next order', 300, NULL, 'FREE_DELIVERY', true),
  ('Priority Service', 'Fast-track your order to the front of the queue', 400, NULL, 'PRIORITY', true),
  ('Premium Tailor Access', 'Access to exclusive premium tailors', 1500, NULL, 'PRIORITY', true)
ON CONFLICT DO NOTHING;

-- ==============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================

-- Enable RLS
ALTER TABLE favorite_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_analytics ENABLE ROW LEVEL SECURITY;

-- Favorite orders policies
CREATE POLICY "Users can view their own favorite orders"
  ON favorite_orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own favorite orders"
  ON favorite_orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own favorite orders"
  ON favorite_orders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorite orders"
  ON favorite_orders FOR DELETE
  USING (auth.uid() = user_id);

-- Loyalty accounts policies
CREATE POLICY "Users can view their own loyalty account"
  ON loyalty_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own loyalty account"
  ON loyalty_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Loyalty transactions policies
CREATE POLICY "Users can view their own loyalty transactions"
  ON loyalty_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Loyalty rewards policies (public read)
CREATE POLICY "Anyone can view active rewards"
  ON loyalty_rewards FOR SELECT
  USING (is_active = true);

-- Order analytics policies
CREATE POLICY "Users can view their own order analytics"
  ON order_analytics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own order analytics"
  ON order_analytics FOR UPDATE
  USING (auth.uid() = user_id);

-- ==============================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ==============================================

-- Update loyalty account updated_at timestamp
CREATE OR REPLACE FUNCTION update_loyalty_account_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER loyalty_account_updated
  BEFORE UPDATE ON loyalty_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_loyalty_account_timestamp();

-- Automatically create loyalty account for new users
CREATE OR REPLACE FUNCTION create_loyalty_account_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO loyalty_accounts (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_loyalty_account_on_user_creation
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_loyalty_account_for_new_user();

COMMENT ON TRIGGER create_loyalty_account_on_user_creation ON users IS 'Automatically creates a loyalty account when a new user registers';
