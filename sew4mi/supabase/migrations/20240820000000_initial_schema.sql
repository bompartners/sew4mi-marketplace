-- =====================================================================
-- Sew4Mi Marketplace - Comprehensive Initial Database Schema
-- =====================================================================
-- Description: Creates all base tables, enums, indexes, RLS policies,
--              triggers, and functions for the Sew4Mi marketplace
-- Created: 2024-08-20
-- =====================================================================

-- Enable necessary PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- =====================================================================
-- ENUMS & CUSTOM TYPES
-- =====================================================================

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

CREATE TYPE milestone_stage AS ENUM (
  'FABRIC_SELECTED',
  'CUTTING_STARTED',
  'INITIAL_ASSEMBLY',
  'FITTING_READY',
  'ADJUSTMENTS_COMPLETE',
  'FINAL_PRESSING',
  'READY_FOR_DELIVERY'
);

CREATE TYPE milestone_approval_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TYPE milestone_approval_action AS ENUM ('APPROVED', 'REJECTED', 'AUTO_APPROVED');

CREATE TYPE commission_status AS ENUM ('PENDING', 'PROCESSED', 'DISPUTED');

CREATE TYPE invoice_status AS ENUM ('DRAFT', 'ISSUED', 'CANCELLED');

-- =====================================================================
-- CORE TABLES
-- =====================================================================

-- ---------------------------------------------------------------------
-- Users Table
-- ---------------------------------------------------------------------
-- Extends Supabase auth.users with application-specific fields
COMMENT ON TABLE public.users IS 'Application user profiles extending Supabase auth.users';

CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  phone_number TEXT UNIQUE,
  phone_verified BOOLEAN NOT NULL DEFAULT false,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'CUSTOMER',
  avatar_url TEXT,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  preferred_language TEXT NOT NULL DEFAULT 'en',
  whatsapp_opted_in BOOLEAN NOT NULL DEFAULT false,
  whatsapp_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Constraints
  CONSTRAINT valid_ghana_phone CHECK (
    phone_number IS NULL OR
    phone_number ~ '^\+233[0-9]{9}$'
  ),
  CONSTRAINT valid_whatsapp_phone CHECK (
    whatsapp_number IS NULL OR
    whatsapp_number ~ '^\+233[0-9]{9}$'
  )
);

-- Indexes for users table
CREATE INDEX idx_users_email ON public.users(email) WHERE email IS NOT NULL;
CREATE INDEX idx_users_phone ON public.users(phone_number) WHERE phone_number IS NOT NULL;
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_deleted ON public.users(deleted_at) WHERE deleted_at IS NULL;

COMMENT ON COLUMN public.users.phone_number IS 'Ghana phone number in E.164 format: +233XXXXXXXXX';
COMMENT ON COLUMN public.users.metadata IS 'Additional user metadata stored as JSONB';

-- ---------------------------------------------------------------------
-- Tailor Profiles Table
-- ---------------------------------------------------------------------
COMMENT ON TABLE public.tailor_profiles IS 'Extended profiles for users with TAILOR role';

CREATE TABLE public.tailor_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  bio TEXT,
  years_of_experience INTEGER CHECK (years_of_experience >= 0),
  specializations TEXT[] NOT NULL DEFAULT '{}',
  portfolio_url TEXT,

  -- Location fields
  location GEOGRAPHY(POINT, 4326),
  location_name TEXT,
  city TEXT,
  region TEXT,
  delivery_radius_km DECIMAL(5,2) NOT NULL DEFAULT 10.00,

  -- Verification
  verification_status verification_status NOT NULL DEFAULT 'PENDING',
  verification_date TIMESTAMPTZ,
  verified_by UUID REFERENCES public.users(id),

  -- Performance metrics
  rating DECIMAL(3,2) NOT NULL DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5),
  total_reviews INTEGER NOT NULL DEFAULT 0,
  total_orders INTEGER NOT NULL DEFAULT 0,
  completion_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  response_time_hours DECIMAL(5,2),

  -- Business configuration
  pricing_tiers JSONB NOT NULL DEFAULT '{}'::jsonb,
  working_hours JSONB NOT NULL DEFAULT '{}'::jsonb,
  vacation_mode BOOLEAN NOT NULL DEFAULT false,
  vacation_message TEXT,
  accepts_rush_orders BOOLEAN NOT NULL DEFAULT true,
  rush_order_fee_percentage DECIMAL(5,2) NOT NULL DEFAULT 25.00,

  -- Social media
  instagram_handle TEXT,
  facebook_page TEXT,
  tiktok_handle TEXT,

  -- Payment details
  bank_account_details JSONB,
  mobile_money_details JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for tailor_profiles table
CREATE INDEX idx_tailor_location ON public.tailor_profiles USING GIST (location);
CREATE INDEX idx_tailor_city ON public.tailor_profiles(city);
CREATE INDEX idx_tailor_region ON public.tailor_profiles(region);
CREATE INDEX idx_tailor_rating ON public.tailor_profiles(rating DESC);
CREATE INDEX idx_tailor_verification ON public.tailor_profiles(verification_status);
CREATE INDEX idx_tailor_specializations ON public.tailor_profiles USING GIN (specializations);
CREATE INDEX idx_tailor_user ON public.tailor_profiles(user_id);

COMMENT ON COLUMN public.tailor_profiles.location IS 'Geographic location using PostGIS POINT';
COMMENT ON COLUMN public.tailor_profiles.pricing_tiers IS 'JSON structure defining basic, premium, luxury pricing';

-- ---------------------------------------------------------------------
-- Measurement Profiles Table
-- ---------------------------------------------------------------------
COMMENT ON TABLE public.measurement_profiles IS 'Customer measurement profiles for tailoring orders';

CREATE TABLE public.measurement_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  profile_name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  gender TEXT CHECK (gender IN ('male', 'female', 'unisex')),
  measurements JSONB NOT NULL DEFAULT '{}'::jsonb,
  measurement_unit TEXT NOT NULL DEFAULT 'cm' CHECK (measurement_unit IN ('cm', 'inches')),
  notes TEXT,
  last_updated_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, profile_name)
);

-- Indexes for measurement_profiles table
CREATE INDEX idx_measurement_user ON public.measurement_profiles(user_id);
CREATE INDEX idx_measurement_default ON public.measurement_profiles(user_id, is_default) WHERE is_default = true;

COMMENT ON COLUMN public.measurement_profiles.measurements IS 'JSONB structure storing all body measurements';

-- ---------------------------------------------------------------------
-- Group Orders Table
-- ---------------------------------------------------------------------
COMMENT ON TABLE public.group_orders IS 'Group/bulk orders for events (weddings, graduations, etc.)';

CREATE TABLE public.group_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_name TEXT NOT NULL,
  organizer_id UUID NOT NULL REFERENCES public.users(id),
  event_type TEXT,
  event_date DATE,
  total_participants INTEGER NOT NULL DEFAULT 0,
  total_orders INTEGER NOT NULL DEFAULT 0,
  group_discount_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  status TEXT CHECK (status IN ('open', 'closed', 'processing', 'completed', 'cancelled')),
  whatsapp_group_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for group_orders table
CREATE INDEX idx_group_organizer ON public.group_orders(organizer_id);
CREATE INDEX idx_group_status ON public.group_orders(status);
CREATE INDEX idx_group_event_date ON public.group_orders(event_date);

-- ---------------------------------------------------------------------
-- Orders Table
-- ---------------------------------------------------------------------
COMMENT ON TABLE public.orders IS 'Main orders table tracking tailoring jobs from draft to completion';

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES public.users(id),
  tailor_id UUID NOT NULL REFERENCES public.users(id),
  measurement_profile_id UUID REFERENCES public.measurement_profiles(id),
  status order_status NOT NULL DEFAULT 'DRAFT',

  -- Order details
  garment_type TEXT NOT NULL,
  style_preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  fabric_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),

  -- Financial details
  total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount > 0),
  deposit_amount DECIMAL(10,2) NOT NULL CHECK (deposit_amount > 0),
  fitting_payment_amount DECIMAL(10,2),
  final_payment_amount DECIMAL(10,2),
  currency TEXT NOT NULL DEFAULT 'GHS' CHECK (currency IN ('GHS', 'USD')),
  escrow_stage escrow_stage NOT NULL DEFAULT 'DEPOSIT',
  escrow_balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,

  -- Delivery details
  delivery_method TEXT CHECK (delivery_method IN ('pickup', 'delivery', 'courier')),
  delivery_address JSONB,
  delivery_date DATE,

  -- Rush order
  rush_order BOOLEAN NOT NULL DEFAULT false,
  rush_fee DECIMAL(10,2),

  -- Additional information
  special_instructions TEXT,
  reference_images TEXT[] NOT NULL DEFAULT '{}',
  order_notes TEXT,
  group_order_id UUID REFERENCES public.group_orders(id),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancelled_reason TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Indexes for orders table
CREATE INDEX idx_order_customer ON public.orders(customer_id);
CREATE INDEX idx_order_tailor ON public.orders(tailor_id);
CREATE INDEX idx_order_status ON public.orders(status);
CREATE INDEX idx_order_created ON public.orders(created_at DESC);
CREATE INDEX idx_order_delivery_date ON public.orders(delivery_date);
CREATE INDEX idx_order_group ON public.orders(group_order_id) WHERE group_order_id IS NOT NULL;
CREATE INDEX idx_order_number ON public.orders(order_number);

COMMENT ON COLUMN public.orders.escrow_balance IS 'Current balance held in escrow for this order';
COMMENT ON COLUMN public.orders.order_number IS 'Auto-generated unique order identifier';

-- ---------------------------------------------------------------------
-- Order Milestones Table
-- ---------------------------------------------------------------------
COMMENT ON TABLE public.order_milestones IS 'Progress milestones with photo verification for each order';

CREATE TABLE public.order_milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  milestone milestone_stage NOT NULL,
  photo_url TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_by UUID NOT NULL REFERENCES public.users(id),
  approval_status milestone_approval_status NOT NULL DEFAULT 'PENDING',
  customer_reviewed_at TIMESTAMPTZ,
  auto_approval_deadline TIMESTAMPTZ NOT NULL,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for order_milestones table
CREATE INDEX idx_milestone_order ON public.order_milestones(order_id);
CREATE INDEX idx_milestone_status ON public.order_milestones(approval_status);
CREATE INDEX idx_milestone_verified ON public.order_milestones(verified_by);
CREATE INDEX idx_milestone_deadline ON public.order_milestones(auto_approval_deadline) WHERE approval_status = 'PENDING';

COMMENT ON COLUMN public.order_milestones.auto_approval_deadline IS 'Milestone auto-approves if customer does not review by this date';

-- ---------------------------------------------------------------------
-- Milestone Approvals Table
-- ---------------------------------------------------------------------
COMMENT ON TABLE public.milestone_approvals IS 'Customer approval/rejection actions for order milestones';

CREATE TABLE public.milestone_approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  milestone_id UUID NOT NULL REFERENCES public.order_milestones(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.users(id),
  action milestone_approval_action NOT NULL,
  comment TEXT,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for milestone_approvals table
CREATE INDEX idx_milestone_approval_milestone ON public.milestone_approvals(milestone_id);
CREATE INDEX idx_milestone_approval_order ON public.milestone_approvals(order_id);
CREATE INDEX idx_milestone_approval_customer ON public.milestone_approvals(customer_id);

-- ---------------------------------------------------------------------
-- Payment Transactions Table
-- ---------------------------------------------------------------------
COMMENT ON TABLE public.payment_transactions IS 'All payment transactions including deposits, payments, refunds';

CREATE TABLE public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id TEXT UNIQUE NOT NULL,
  order_id UUID NOT NULL REFERENCES public.orders(id),
  user_id UUID NOT NULL REFERENCES public.users(id),
  transaction_type transaction_type NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'GHS',
  payment_provider payment_provider NOT NULL,
  provider_transaction_id TEXT,
  status payment_status NOT NULL DEFAULT 'PENDING',
  escrow_stage escrow_stage,
  payment_phone TEXT,
  payment_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Timestamps
  initiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,

  -- Refund details
  refunded_at TIMESTAMPTZ,
  refund_amount DECIMAL(10,2),
  refund_reason TEXT,

  -- Fee details
  fee_amount DECIMAL(10,2),
  net_amount DECIMAL(10,2),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for payment_transactions table
CREATE INDEX idx_transaction_order ON public.payment_transactions(order_id);
CREATE INDEX idx_transaction_user ON public.payment_transactions(user_id);
CREATE INDEX idx_transaction_status ON public.payment_transactions(status);
CREATE INDEX idx_transaction_provider ON public.payment_transactions(payment_provider);
CREATE INDEX idx_transaction_created ON public.payment_transactions(created_at DESC);
CREATE INDEX idx_transaction_id ON public.payment_transactions(transaction_id);

COMMENT ON COLUMN public.payment_transactions.escrow_stage IS 'Which escrow stage this payment contributes to';

-- ---------------------------------------------------------------------
-- Reviews Table
-- ---------------------------------------------------------------------
COMMENT ON TABLE public.reviews IS 'Customer reviews and ratings for completed orders';

CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID UNIQUE NOT NULL REFERENCES public.orders(id),
  customer_id UUID NOT NULL REFERENCES public.users(id),
  tailor_id UUID NOT NULL REFERENCES public.users(id),

  -- Ratings
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
  timeliness_rating INTEGER CHECK (timeliness_rating >= 1 AND timeliness_rating <= 5),
  value_rating INTEGER CHECK (value_rating >= 1 AND value_rating <= 5),

  -- Review content
  review_text TEXT,
  tailor_response TEXT,
  tailor_responded_at TIMESTAMPTZ,
  photo_urls TEXT[] NOT NULL DEFAULT '{}',

  -- Verification and moderation
  is_verified_purchase BOOLEAN NOT NULL DEFAULT true,
  helpful_count INTEGER NOT NULL DEFAULT 0,
  reported BOOLEAN NOT NULL DEFAULT false,
  reported_reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for reviews table
CREATE INDEX idx_review_tailor ON public.reviews(tailor_id);
CREATE INDEX idx_review_customer ON public.reviews(customer_id);
CREATE INDEX idx_review_rating ON public.reviews(rating DESC);
CREATE INDEX idx_review_created ON public.reviews(created_at DESC);
CREATE INDEX idx_review_order ON public.reviews(order_id);

-- ---------------------------------------------------------------------
-- Disputes Table
-- ---------------------------------------------------------------------
COMMENT ON TABLE public.disputes IS 'Order dispute cases requiring admin resolution';

CREATE TABLE public.disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id),
  raised_by UUID NOT NULL REFERENCES public.users(id),
  dispute_type TEXT NOT NULL,
  status dispute_status NOT NULL DEFAULT 'OPEN',
  description TEXT NOT NULL,
  evidence_urls TEXT[] NOT NULL DEFAULT '{}',
  assigned_to UUID REFERENCES public.users(id),
  resolution TEXT,
  resolution_date TIMESTAMPTZ,
  refund_amount DECIMAL(10,2),
  compensation_amount DECIMAL(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for disputes table
CREATE INDEX idx_dispute_order ON public.disputes(order_id);
CREATE INDEX idx_dispute_status ON public.disputes(status);
CREATE INDEX idx_dispute_assigned ON public.disputes(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_dispute_raised_by ON public.disputes(raised_by);

-- ---------------------------------------------------------------------
-- Payment Statistics Table
-- ---------------------------------------------------------------------
COMMENT ON TABLE public.payment_statistics IS 'Aggregated payment statistics per tailor per period';

CREATE TABLE public.payment_statistics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tailor_id UUID NOT NULL REFERENCES public.users(id),
  period TEXT NOT NULL,
  total_earnings DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  gross_payments DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  platform_commission DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  net_earnings DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  pending_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  completed_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  disputed_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  refunded_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total_orders INTEGER NOT NULL DEFAULT 0,
  completed_orders INTEGER NOT NULL DEFAULT 0,
  average_order_value DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  commission_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(tailor_id, period)
);

-- Indexes for payment_statistics table
CREATE INDEX idx_payment_stats_tailor ON public.payment_statistics(tailor_id);
CREATE INDEX idx_payment_stats_period ON public.payment_statistics(period);

-- ---------------------------------------------------------------------
-- Tailor Commission Records Table
-- ---------------------------------------------------------------------
COMMENT ON TABLE public.tailor_commission_records IS 'Individual commission records per order for tailors';

CREATE TABLE public.tailor_commission_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tailor_id UUID NOT NULL REFERENCES public.users(id),
  order_id UUID NOT NULL REFERENCES public.orders(id),
  payment_transaction_id UUID REFERENCES public.payment_transactions(id),
  order_amount DECIMAL(10,2) NOT NULL,
  commission_rate DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  commission_amount DECIMAL(10,2) NOT NULL,
  net_payment DECIMAL(10,2) NOT NULL,
  processed_at TIMESTAMPTZ,
  status commission_status NOT NULL DEFAULT 'PENDING',
  invoice_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for tailor_commission_records table
CREATE INDEX idx_commission_tailor ON public.tailor_commission_records(tailor_id);
CREATE INDEX idx_commission_order ON public.tailor_commission_records(order_id);
CREATE INDEX idx_commission_status ON public.tailor_commission_records(status);
CREATE INDEX idx_commission_invoice ON public.tailor_commission_records(invoice_id) WHERE invoice_id IS NOT NULL;

-- ---------------------------------------------------------------------
-- Tax Invoices Table
-- ---------------------------------------------------------------------
COMMENT ON TABLE public.tax_invoices IS 'Tax invoices for tailor payments and commissions';

CREATE TABLE public.tax_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number TEXT UNIQUE NOT NULL,
  tailor_id UUID NOT NULL REFERENCES public.users(id),
  order_id UUID NOT NULL REFERENCES public.orders(id),
  commission_record_id UUID REFERENCES public.tailor_commission_records(id),
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  gross_amount DECIMAL(10,2) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  net_amount DECIMAL(10,2) NOT NULL,
  ghana_vat_number TEXT,
  pdf_url TEXT,
  status invoice_status NOT NULL DEFAULT 'DRAFT',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for tax_invoices table
CREATE INDEX idx_invoice_tailor ON public.tax_invoices(tailor_id);
CREATE INDEX idx_invoice_order ON public.tax_invoices(order_id);
CREATE INDEX idx_invoice_number ON public.tax_invoices(invoice_number);
CREATE INDEX idx_invoice_status ON public.tax_invoices(status);
CREATE INDEX idx_invoice_issue_date ON public.tax_invoices(issue_date DESC);

-- =====================================================================
-- SEQUENCES
-- =====================================================================

-- Sequence for generating order numbers
CREATE SEQUENCE order_number_seq START 1;

-- Sequence for generating invoice numbers
CREATE SEQUENCE invoice_number_seq START 1;

-- =====================================================================
-- FUNCTIONS
-- =====================================================================

-- ---------------------------------------------------------------------
-- Function: update_updated_at_column
-- ---------------------------------------------------------------------
-- Automatically updates the updated_at timestamp on row updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- Function: update_tailor_rating
-- ---------------------------------------------------------------------
-- Recalculates tailor's average rating when a review is added/updated
CREATE OR REPLACE FUNCTION update_tailor_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE tailor_profiles
  SET
    rating = (
      SELECT COALESCE(AVG(rating)::DECIMAL(3,2), 0.00)
      FROM reviews
      WHERE tailor_id = NEW.tailor_id
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM reviews
      WHERE tailor_id = NEW.tailor_id
    )
  WHERE user_id = NEW.tailor_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- Function: generate_order_number
-- ---------------------------------------------------------------------
-- Auto-generates unique order numbers in format: ORD-YYYYMMDD-XXXXXX
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number = 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
      LPAD(NEXTVAL('order_number_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- Function: generate_invoice_number
-- ---------------------------------------------------------------------
-- Auto-generates unique invoice numbers in format: INV-YYYYMMDD-XXXXXX
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number = 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
      LPAD(NEXTVAL('invoice_number_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- Function: ensure_single_default_measurement
-- ---------------------------------------------------------------------
-- Ensures only one measurement profile per user is marked as default
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
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- Function: is_admin
-- ---------------------------------------------------------------------
-- Checks if current user has ADMIN role
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------
-- Function: is_tailor
-- ---------------------------------------------------------------------
-- Checks if current user has TAILOR role
CREATE OR REPLACE FUNCTION is_tailor()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'TAILOR'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------
-- Function: owns_order
-- ---------------------------------------------------------------------
-- Checks if current user is customer or tailor for the given order
CREATE OR REPLACE FUNCTION owns_order(order_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.orders
    WHERE id = order_id
    AND (customer_id = auth.uid() OR tailor_id = auth.uid())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================
-- TRIGGERS
-- =====================================================================

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tailor_profiles_updated_at
  BEFORE UPDATE ON public.tailor_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_measurement_profiles_updated_at
  BEFORE UPDATE ON public.measurement_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_order_milestones_updated_at
  BEFORE UPDATE ON public.order_milestones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_transactions_updated_at
  BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_group_orders_updated_at
  BEFORE UPDATE ON public.group_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_disputes_updated_at
  BEFORE UPDATE ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_statistics_updated_at
  BEFORE UPDATE ON public.payment_statistics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_commission_records_updated_at
  BEFORE UPDATE ON public.tailor_commission_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tax_invoices_updated_at
  BEFORE UPDATE ON public.tax_invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-generate order numbers
CREATE TRIGGER set_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION generate_order_number();

-- Auto-generate invoice numbers
CREATE TRIGGER set_invoice_number
  BEFORE INSERT ON public.tax_invoices
  FOR EACH ROW
  EXECUTE FUNCTION generate_invoice_number();

-- Update tailor rating on review changes
CREATE TRIGGER update_tailor_rating_on_review
  AFTER INSERT OR UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION update_tailor_rating();

-- Ensure single default measurement profile
CREATE TRIGGER ensure_single_default_measurement_trigger
  BEFORE INSERT OR UPDATE ON public.measurement_profiles
  FOR EACH ROW EXECUTE FUNCTION ensure_single_default_measurement();

-- =====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tailor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurement_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestone_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tailor_commission_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_invoices ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- Users Table RLS Policies
-- ---------------------------------------------------------------------

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Public can view basic user info (for tailor discovery)
CREATE POLICY "Public can view basic user info"
  ON public.users FOR SELECT
  USING (true);

-- Service role can do everything
CREATE POLICY "Service role has full access to users"
  ON public.users FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ---------------------------------------------------------------------
-- Tailor Profiles RLS Policies
-- ---------------------------------------------------------------------

-- Anyone can view verified tailor profiles
CREATE POLICY "Anyone can view verified tailor profiles"
  ON public.tailor_profiles FOR SELECT
  USING (verification_status = 'VERIFIED' OR user_id = auth.uid() OR is_admin());

-- Tailors can update their own profile
CREATE POLICY "Tailors can update own profile"
  ON public.tailor_profiles FOR UPDATE
  USING (user_id = auth.uid() AND is_tailor());

-- Tailors can create their profile
CREATE POLICY "Tailors can create own profile"
  ON public.tailor_profiles FOR INSERT
  WITH CHECK (user_id = auth.uid() AND is_tailor());

-- Admins can do everything
CREATE POLICY "Admins have full access to tailor profiles"
  ON public.tailor_profiles FOR ALL
  USING (is_admin());

-- ---------------------------------------------------------------------
-- Measurement Profiles RLS Policies
-- ---------------------------------------------------------------------

-- Users can manage their own measurement profiles
CREATE POLICY "Users can view own measurement profiles"
  ON public.measurement_profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own measurement profiles"
  ON public.measurement_profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own measurement profiles"
  ON public.measurement_profiles FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own measurement profiles"
  ON public.measurement_profiles FOR DELETE
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Orders RLS Policies
-- ---------------------------------------------------------------------

-- Customers and tailors can view their orders
CREATE POLICY "Users can view own orders"
  ON public.orders FOR SELECT
  USING (customer_id = auth.uid() OR tailor_id = auth.uid() OR is_admin());

-- Customers can create orders
CREATE POLICY "Customers can create orders"
  ON public.orders FOR INSERT
  WITH CHECK (customer_id = auth.uid());

-- Customers and tailors can update their orders (status changes)
CREATE POLICY "Order participants can update orders"
  ON public.orders FOR UPDATE
  USING (customer_id = auth.uid() OR tailor_id = auth.uid() OR is_admin());

-- Admins have full access
CREATE POLICY "Admins have full access to orders"
  ON public.orders FOR ALL
  USING (is_admin());

-- ---------------------------------------------------------------------
-- Order Milestones RLS Policies
-- ---------------------------------------------------------------------

-- Order participants can view milestones
CREATE POLICY "Order participants can view milestones"
  ON public.order_milestones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = order_milestones.order_id
      AND (customer_id = auth.uid() OR tailor_id = auth.uid())
    ) OR is_admin()
  );

-- Tailors can create milestones for their orders
CREATE POLICY "Tailors can create milestones"
  ON public.order_milestones FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = order_milestones.order_id
      AND tailor_id = auth.uid()
    ) AND is_tailor()
  );

-- Tailors can update their milestones
CREATE POLICY "Tailors can update milestones"
  ON public.order_milestones FOR UPDATE
  USING (verified_by = auth.uid() OR is_admin());

-- ---------------------------------------------------------------------
-- Milestone Approvals RLS Policies
-- ---------------------------------------------------------------------

-- Order participants can view approvals
CREATE POLICY "Order participants can view approvals"
  ON public.milestone_approvals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = milestone_approvals.order_id
      AND (customer_id = auth.uid() OR tailor_id = auth.uid())
    ) OR is_admin()
  );

-- Customers can create approvals for their orders
CREATE POLICY "Customers can create approvals"
  ON public.milestone_approvals FOR INSERT
  WITH CHECK (customer_id = auth.uid());

-- ---------------------------------------------------------------------
-- Payment Transactions RLS Policies
-- ---------------------------------------------------------------------

-- Users can view their own transactions
CREATE POLICY "Users can view own transactions"
  ON public.payment_transactions FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = payment_transactions.order_id
      AND (customer_id = auth.uid() OR tailor_id = auth.uid())
    ) OR is_admin()
  );

-- Users can create transactions for their orders
CREATE POLICY "Users can create transactions"
  ON public.payment_transactions FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Admins have full access
CREATE POLICY "Admins have full access to transactions"
  ON public.payment_transactions FOR ALL
  USING (is_admin());

-- ---------------------------------------------------------------------
-- Group Orders RLS Policies
-- ---------------------------------------------------------------------

-- Anyone can view group orders
CREATE POLICY "Anyone can view group orders"
  ON public.group_orders FOR SELECT
  USING (true);

-- Users can create group orders
CREATE POLICY "Users can create group orders"
  ON public.group_orders FOR INSERT
  WITH CHECK (organizer_id = auth.uid());

-- Organizers can update their group orders
CREATE POLICY "Organizers can update group orders"
  ON public.group_orders FOR UPDATE
  USING (organizer_id = auth.uid() OR is_admin());

-- ---------------------------------------------------------------------
-- Reviews RLS Policies
-- ---------------------------------------------------------------------

-- Anyone can view reviews
CREATE POLICY "Anyone can view reviews"
  ON public.reviews FOR SELECT
  USING (true);

-- Customers can create reviews for their orders
CREATE POLICY "Customers can create reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (customer_id = auth.uid());

-- Customers can update their own reviews
CREATE POLICY "Customers can update own reviews"
  ON public.reviews FOR UPDATE
  USING (customer_id = auth.uid());

-- Tailors can add responses to reviews
CREATE POLICY "Tailors can respond to reviews"
  ON public.reviews FOR UPDATE
  USING (tailor_id = auth.uid() AND is_tailor());

-- ---------------------------------------------------------------------
-- Disputes RLS Policies
-- ---------------------------------------------------------------------

-- Order participants can view disputes
CREATE POLICY "Order participants can view disputes"
  ON public.disputes FOR SELECT
  USING (
    raised_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = disputes.order_id
      AND (customer_id = auth.uid() OR tailor_id = auth.uid())
    ) OR is_admin()
  );

-- Order participants can create disputes
CREATE POLICY "Order participants can create disputes"
  ON public.disputes FOR INSERT
  WITH CHECK (
    raised_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = disputes.order_id
      AND (customer_id = auth.uid() OR tailor_id = auth.uid())
    )
  );

-- Admins can update disputes
CREATE POLICY "Admins can update disputes"
  ON public.disputes FOR UPDATE
  USING (is_admin());

-- ---------------------------------------------------------------------
-- Payment Statistics RLS Policies
-- ---------------------------------------------------------------------

-- Tailors can view their own statistics
CREATE POLICY "Tailors can view own statistics"
  ON public.payment_statistics FOR SELECT
  USING (tailor_id = auth.uid() OR is_admin());

-- System can create/update statistics (handled by triggers/functions)
CREATE POLICY "Service role can manage statistics"
  ON public.payment_statistics FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ---------------------------------------------------------------------
-- Tailor Commission Records RLS Policies
-- ---------------------------------------------------------------------

-- Tailors can view their own commission records
CREATE POLICY "Tailors can view own commissions"
  ON public.tailor_commission_records FOR SELECT
  USING (tailor_id = auth.uid() OR is_admin());

-- System can create commission records
CREATE POLICY "Service role can manage commissions"
  ON public.tailor_commission_records FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ---------------------------------------------------------------------
-- Tax Invoices RLS Policies
-- ---------------------------------------------------------------------

-- Tailors can view their own invoices
CREATE POLICY "Tailors can view own invoices"
  ON public.tax_invoices FOR SELECT
  USING (tailor_id = auth.uid() OR is_admin());

-- System can create invoices
CREATE POLICY "Service role can manage invoices"
  ON public.tax_invoices FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================================
-- GRANTS
-- =====================================================================

-- Grant appropriate permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.tailor_profiles TO authenticated;
GRANT ALL ON public.measurement_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.order_milestones TO authenticated;
GRANT SELECT, INSERT ON public.milestone_approvals TO authenticated;
GRANT SELECT, INSERT ON public.payment_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.group_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.reviews TO authenticated;
GRANT SELECT, INSERT ON public.disputes TO authenticated;
GRANT SELECT ON public.payment_statistics TO authenticated;
GRANT SELECT ON public.tailor_commission_records TO authenticated;
GRANT SELECT ON public.tax_invoices TO authenticated;

-- Grant sequence usage
GRANT USAGE ON SEQUENCE order_number_seq TO authenticated;
GRANT USAGE ON SEQUENCE invoice_number_seq TO authenticated;

-- Grant function execution
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_tailor() TO authenticated;
GRANT EXECUTE ON FUNCTION owns_order(UUID) TO authenticated;

-- Grant to anonymous users (for browsing tailors)
GRANT SELECT ON public.users TO anon;
GRANT SELECT ON public.tailor_profiles TO anon;
GRANT SELECT ON public.reviews TO anon;
GRANT SELECT ON public.group_orders TO anon;

-- =====================================================================
-- VIEWS
-- =====================================================================

-- Create a view for tailor payment summaries
CREATE OR REPLACE VIEW tailor_payment_summary AS
SELECT
  ps.tailor_id,
  ps.period,
  ps.total_earnings,
  ps.gross_payments,
  ps.platform_commission,
  ps.net_earnings,
  ps.pending_amount,
  ps.completed_amount,
  ps.disputed_amount,
  ps.refunded_amount,
  ps.total_orders,
  ps.completed_orders,
  ps.average_order_value,
  ps.commission_rate,
  ps.updated_at as last_updated
FROM public.payment_statistics ps;

-- Grant view access
GRANT SELECT ON tailor_payment_summary TO authenticated;

-- =====================================================================
-- COMMENTS
-- =====================================================================

COMMENT ON SCHEMA public IS 'Sew4Mi Marketplace database schema';
COMMENT ON EXTENSION "uuid-ossp" IS 'UUID generation functions';
COMMENT ON EXTENSION "postgis" IS 'Geographic information system support';
COMMENT ON EXTENSION "pg_trgm" IS 'Trigram matching for text search';
COMMENT ON EXTENSION "btree_gin" IS 'GIN index support for B-tree data types';

-- =====================================================================
-- END OF MIGRATION
-- =====================================================================
