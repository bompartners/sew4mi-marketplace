-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create custom types/enums
CREATE TYPE user_role AS ENUM ('CUSTOMER', 'TAILOR', 'ADMIN');
CREATE TYPE verification_status AS ENUM ('PENDING', 'VERIFIED', 'SUSPENDED');
CREATE TYPE order_status AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'ACCEPTED',
  'DEPOSIT_PAID',
  'MEASUREMENT_CONFIRMED',
  'FABRIC_SOURCED',
  'CUTTING_STARTED',
  'SEWING_IN_PROGRESS',
  'FITTING_SCHEDULED',
  'FITTING_COMPLETED',
  'ADJUSTMENTS_IN_PROGRESS',
  'FINAL_INSPECTION',
  'READY_FOR_DELIVERY',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
  'DISPUTED'
);
CREATE TYPE escrow_stage AS ENUM ('DEPOSIT', 'FITTING', 'FINAL', 'RELEASED', 'REFUNDED');
CREATE TYPE transaction_type AS ENUM (
  'DEPOSIT',
  'FITTING_PAYMENT',
  'FINAL_PAYMENT',
  'REFUND',
  'DISPUTE_RESOLUTION',
  'PLATFORM_FEE'
);
CREATE TYPE payment_provider AS ENUM ('MTN_MOMO', 'VODAFONE_CASH', 'BANK_TRANSFER', 'CASH');
CREATE TYPE payment_status AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'REFUNDED');
CREATE TYPE dispute_status AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'ESCALATED', 'CLOSED');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  phone_number TEXT UNIQUE,
  phone_verified BOOLEAN DEFAULT false,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'CUSTOMER',
  avatar_url TEXT,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  preferred_language TEXT DEFAULT 'en',
  whatsapp_opted_in BOOLEAN DEFAULT false,
  whatsapp_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  CONSTRAINT valid_ghana_phone CHECK (
    phone_number IS NULL OR 
    phone_number ~ '^\+233[0-9]{9}$'
  ),
  CONSTRAINT valid_whatsapp_phone CHECK (
    whatsapp_number IS NULL OR 
    whatsapp_number ~ '^\+233[0-9]{9}$'
  )
);

-- Tailor profiles table
CREATE TABLE public.tailor_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  bio TEXT,
  years_of_experience INTEGER CHECK (years_of_experience >= 0),
  specializations TEXT[] DEFAULT '{}',
  portfolio_url TEXT,
  location GEOGRAPHY(POINT, 4326),
  location_name TEXT,
  city TEXT,
  region TEXT,
  delivery_radius_km DECIMAL(5,2) DEFAULT 10.00,
  verification_status verification_status DEFAULT 'PENDING',
  verification_date TIMESTAMPTZ,
  verified_by UUID REFERENCES public.users(id),
  rating DECIMAL(3,2) DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5),
  total_reviews INTEGER DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  completion_rate DECIMAL(5,2) DEFAULT 0.00,
  response_time_hours DECIMAL(5,2),
  pricing_tiers JSONB DEFAULT '{"basic": {}, "premium": {}, "luxury": {}}'::jsonb,
  working_hours JSONB DEFAULT '{"monday": {"open": "09:00", "close": "18:00"}}'::jsonb,
  vacation_mode BOOLEAN DEFAULT false,
  vacation_message TEXT,
  accepts_rush_orders BOOLEAN DEFAULT true,
  rush_order_fee_percentage DECIMAL(5,2) DEFAULT 25.00,
  instagram_handle TEXT,
  facebook_page TEXT,
  tiktok_handle TEXT,
  bank_account_details JSONB,
  mobile_money_details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for tailor_profiles
CREATE INDEX idx_tailor_location ON tailor_profiles USING GIST (location);
CREATE INDEX idx_tailor_city ON tailor_profiles (city);
CREATE INDEX idx_tailor_region ON tailor_profiles (region);
CREATE INDEX idx_tailor_rating ON tailor_profiles (rating DESC);
CREATE INDEX idx_tailor_verification ON tailor_profiles (verification_status);

-- Measurement profiles table
CREATE TABLE public.measurement_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  profile_name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  gender TEXT CHECK (gender IN ('male', 'female', 'unisex')),
  measurements JSONB NOT NULL DEFAULT '{}'::jsonb,
  measurement_unit TEXT DEFAULT 'cm' CHECK (measurement_unit IN ('cm', 'inches')),
  notes TEXT,
  last_updated_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, profile_name)
);

-- Create index for measurement_profiles
CREATE INDEX idx_measurement_user ON measurement_profiles (user_id);

-- Orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES public.users(id),
  tailor_id UUID NOT NULL REFERENCES public.tailor_profiles(id),
  measurement_profile_id UUID REFERENCES public.measurement_profiles(id),
  status order_status NOT NULL DEFAULT 'DRAFT',
  garment_type TEXT NOT NULL,
  style_preferences JSONB DEFAULT '{}'::jsonb,
  fabric_details JSONB DEFAULT '{}'::jsonb,
  quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
  total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount > 0),
  deposit_amount DECIMAL(10,2) NOT NULL CHECK (deposit_amount > 0),
  fitting_payment_amount DECIMAL(10,2),
  final_payment_amount DECIMAL(10,2),
  currency TEXT DEFAULT 'GHS' CHECK (currency IN ('GHS', 'USD')),
  escrow_stage escrow_stage DEFAULT 'DEPOSIT',
  escrow_balance DECIMAL(10,2) DEFAULT 0.00,
  delivery_method TEXT CHECK (delivery_method IN ('pickup', 'delivery', 'courier')),
  delivery_address JSONB,
  delivery_date DATE,
  rush_order BOOLEAN DEFAULT false,
  rush_fee DECIMAL(10,2),
  special_instructions TEXT,
  reference_images TEXT[],
  order_notes TEXT,
  group_order_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancelled_reason TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for orders
CREATE INDEX idx_order_customer ON orders (customer_id);
CREATE INDEX idx_order_tailor ON orders (tailor_id);
CREATE INDEX idx_order_status ON orders (status);
CREATE INDEX idx_order_created ON orders (created_at DESC);
CREATE INDEX idx_order_delivery_date ON orders (delivery_date);

-- Order milestones table
CREATE TABLE public.order_milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  milestone_type TEXT NOT NULL,
  milestone_status TEXT CHECK (milestone_status IN ('pending', 'in_progress', 'completed', 'skipped')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES public.users(id),
  photo_urls TEXT[],
  video_url TEXT,
  notes TEXT,
  customer_approved BOOLEAN DEFAULT false,
  customer_approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for order_milestones
CREATE INDEX idx_milestone_order ON order_milestones (order_id);
CREATE INDEX idx_milestone_status ON order_milestones (milestone_status);

-- Payment transactions table
CREATE TABLE public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id TEXT UNIQUE NOT NULL,
  order_id UUID NOT NULL REFERENCES public.orders(id),
  user_id UUID NOT NULL REFERENCES public.users(id),
  transaction_type transaction_type NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  currency TEXT DEFAULT 'GHS',
  payment_provider payment_provider NOT NULL,
  provider_transaction_id TEXT,
  status payment_status NOT NULL DEFAULT 'PENDING',
  escrow_stage escrow_stage,
  payment_phone TEXT,
  payment_metadata JSONB DEFAULT '{}'::jsonb,
  initiated_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,
  refunded_at TIMESTAMPTZ,
  refund_amount DECIMAL(10,2),
  refund_reason TEXT,
  fee_amount DECIMAL(10,2),
  net_amount DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for payment_transactions
CREATE INDEX idx_transaction_order ON payment_transactions (order_id);
CREATE INDEX idx_transaction_user ON payment_transactions (user_id);
CREATE INDEX idx_transaction_status ON payment_transactions (status);
CREATE INDEX idx_transaction_provider ON payment_transactions (payment_provider);
CREATE INDEX idx_transaction_created ON payment_transactions (created_at DESC);

-- Group orders table
CREATE TABLE public.group_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_name TEXT NOT NULL,
  organizer_id UUID NOT NULL REFERENCES public.users(id),
  event_type TEXT,
  event_date DATE,
  total_participants INTEGER DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  group_discount_percentage DECIMAL(5,2) DEFAULT 0.00,
  status TEXT CHECK (status IN ('open', 'closed', 'processing', 'completed', 'cancelled')),
  whatsapp_group_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for group_orders
CREATE INDEX idx_group_organizer ON group_orders (organizer_id);
CREATE INDEX idx_group_status ON group_orders (status);

-- Reviews table
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID UNIQUE NOT NULL REFERENCES public.orders(id),
  customer_id UUID NOT NULL REFERENCES public.users(id),
  tailor_id UUID NOT NULL REFERENCES public.tailor_profiles(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
  timeliness_rating INTEGER CHECK (timeliness_rating >= 1 AND timeliness_rating <= 5),
  value_rating INTEGER CHECK (value_rating >= 1 AND value_rating <= 5),
  review_text TEXT,
  tailor_response TEXT,
  tailor_responded_at TIMESTAMPTZ,
  photo_urls TEXT[],
  is_verified_purchase BOOLEAN DEFAULT true,
  helpful_count INTEGER DEFAULT 0,
  reported BOOLEAN DEFAULT false,
  reported_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for reviews
CREATE INDEX idx_review_tailor ON reviews (tailor_id);
CREATE INDEX idx_review_customer ON reviews (customer_id);
CREATE INDEX idx_review_rating ON reviews (rating DESC);
CREATE INDEX idx_review_created ON reviews (created_at DESC);

-- Disputes table
CREATE TABLE public.disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id),
  raised_by UUID NOT NULL REFERENCES public.users(id),
  dispute_type TEXT NOT NULL,
  status dispute_status NOT NULL DEFAULT 'OPEN',
  description TEXT NOT NULL,
  evidence_urls TEXT[],
  assigned_to UUID REFERENCES public.users(id),
  resolution TEXT,
  resolution_date TIMESTAMPTZ,
  refund_amount DECIMAL(10,2),
  compensation_amount DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for disputes
CREATE INDEX idx_dispute_order ON disputes (order_id);
CREATE INDEX idx_dispute_status ON disputes (status);
CREATE INDEX idx_dispute_assigned ON disputes (assigned_to);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tailor_profiles_updated_at BEFORE UPDATE ON tailor_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_measurement_profiles_updated_at BEFORE UPDATE ON measurement_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_order_milestones_updated_at BEFORE UPDATE ON order_milestones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_transactions_updated_at BEFORE UPDATE ON payment_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_group_orders_updated_at BEFORE UPDATE ON group_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_disputes_updated_at BEFORE UPDATE ON disputes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to update tailor rating after review
CREATE OR REPLACE FUNCTION update_tailor_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE tailor_profiles
  SET 
    rating = (SELECT AVG(rating)::DECIMAL(3,2) FROM reviews WHERE tailor_id = NEW.tailor_id),
    total_reviews = (SELECT COUNT(*) FROM reviews WHERE tailor_id = NEW.tailor_id)
  WHERE id = NEW.tailor_id;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tailor_rating_on_review
  AFTER INSERT OR UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_tailor_rating();

-- Create function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number = 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
    LPAD(NEXTVAL('order_number_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create sequence for order numbers
CREATE SEQUENCE order_number_seq START 1;

CREATE TRIGGER set_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW 
  WHEN (NEW.order_number IS NULL)
  EXECUTE FUNCTION generate_order_number();

-- Create function to ensure only one default measurement profile per user
CREATE OR REPLACE FUNCTION ensure_single_default_measurement()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE measurement_profiles 
    SET is_default = false 
    WHERE user_id = NEW.user_id AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER ensure_single_default_measurement_trigger
  BEFORE INSERT OR UPDATE ON measurement_profiles
  FOR EACH ROW EXECUTE FUNCTION ensure_single_default_measurement();