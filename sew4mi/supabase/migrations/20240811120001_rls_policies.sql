-- Enable Row Level Security on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tailor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurement_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

-- Users table policies
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Users can view other users' public info (for tailors)
CREATE POLICY "Users can view public profiles" ON public.users
  FOR SELECT USING (
    role = 'TAILOR' AND 
    EXISTS (
      SELECT 1 FROM tailor_profiles 
      WHERE user_id = users.id 
      AND verification_status = 'VERIFIED'
    )
  );

-- Admins can view all users
CREATE POLICY "Admins can view all users" ON public.users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'ADMIN'
    )
  );

-- Tailor profiles policies
-- Anyone can view verified tailor profiles
CREATE POLICY "Anyone can view verified tailors" ON public.tailor_profiles
  FOR SELECT USING (verification_status = 'VERIFIED');

-- Tailors can view their own profile regardless of status
CREATE POLICY "Tailors can view own profile" ON public.tailor_profiles
  FOR SELECT USING (user_id = auth.uid());

-- Tailors can update their own profile
CREATE POLICY "Tailors can update own profile" ON public.tailor_profiles
  FOR UPDATE USING (user_id = auth.uid());

-- Tailors can insert their own profile
CREATE POLICY "Tailors can create profile" ON public.tailor_profiles
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'TAILOR'
    )
  );

-- Admins have full access to tailor profiles
CREATE POLICY "Admins manage tailor profiles" ON public.tailor_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'ADMIN'
    )
  );

-- Measurement profiles policies
-- Users can view their own measurement profiles
CREATE POLICY "Users view own measurements" ON public.measurement_profiles
  FOR SELECT USING (user_id = auth.uid());

-- Users can create their own measurement profiles
CREATE POLICY "Users create own measurements" ON public.measurement_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own measurement profiles
CREATE POLICY "Users update own measurements" ON public.measurement_profiles
  FOR UPDATE USING (user_id = auth.uid());

-- Users can delete their own measurement profiles
CREATE POLICY "Users delete own measurements" ON public.measurement_profiles
  FOR DELETE USING (user_id = auth.uid());

-- Tailors can view customer measurements for their orders
CREATE POLICY "Tailors view order measurements" ON public.measurement_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders o
      JOIN tailor_profiles tp ON o.tailor_id = tp.id
      WHERE o.measurement_profile_id = measurement_profiles.id
      AND tp.user_id = auth.uid()
      AND o.status NOT IN ('DRAFT', 'CANCELLED')
    )
  );

-- Orders policies
-- Customers can view their own orders
CREATE POLICY "Customers view own orders" ON public.orders
  FOR SELECT USING (customer_id = auth.uid());

-- Customers can create orders
CREATE POLICY "Customers create orders" ON public.orders
  FOR INSERT WITH CHECK (customer_id = auth.uid());

-- Customers can update their draft orders
CREATE POLICY "Customers update draft orders" ON public.orders
  FOR UPDATE USING (
    customer_id = auth.uid() 
    AND status = 'DRAFT'
  );

-- Tailors can view orders assigned to them
CREATE POLICY "Tailors view assigned orders" ON public.orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tailor_profiles 
      WHERE id = orders.tailor_id 
      AND user_id = auth.uid()
    )
  );

-- Tailors can update order status for their orders
CREATE POLICY "Tailors update order status" ON public.orders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM tailor_profiles 
      WHERE id = orders.tailor_id 
      AND user_id = auth.uid()
    )
  );

-- Admins have full access to orders
CREATE POLICY "Admins manage all orders" ON public.orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'ADMIN'
    )
  );

-- Order milestones policies
-- Order participants can view milestones
CREATE POLICY "Order participants view milestones" ON public.order_milestones
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders o
      LEFT JOIN tailor_profiles tp ON o.tailor_id = tp.id
      WHERE o.id = order_milestones.order_id
      AND (o.customer_id = auth.uid() OR tp.user_id = auth.uid())
    )
  );

-- Tailors can create and update milestones for their orders
CREATE POLICY "Tailors manage milestones" ON public.order_milestones
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM orders o
      JOIN tailor_profiles tp ON o.tailor_id = tp.id
      WHERE o.id = order_milestones.order_id
      AND tp.user_id = auth.uid()
    )
  );

-- Payment transactions policies
-- Users can view their own transactions
CREATE POLICY "Users view own transactions" ON public.payment_transactions
  FOR SELECT USING (user_id = auth.uid());

-- Order participants can view order transactions
CREATE POLICY "Order participants view transactions" ON public.payment_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders o
      LEFT JOIN tailor_profiles tp ON o.tailor_id = tp.id
      WHERE o.id = payment_transactions.order_id
      AND (o.customer_id = auth.uid() OR tp.user_id = auth.uid())
    )
  );

-- System can create transactions (using service role key)
-- No policy needed as service role bypasses RLS

-- Admins can view all transactions
CREATE POLICY "Admins view all transactions" ON public.payment_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'ADMIN'
    )
  );

-- Group orders policies
-- Organizers can manage their group orders
CREATE POLICY "Organizers manage group orders" ON public.group_orders
  FOR ALL USING (organizer_id = auth.uid());

-- Participants can view group orders they're part of
CREATE POLICY "Participants view group orders" ON public.group_orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE group_order_id = group_orders.id 
      AND customer_id = auth.uid()
    )
  );

-- Reviews policies
-- Anyone can view reviews
CREATE POLICY "Public can view reviews" ON public.reviews
  FOR SELECT USING (true);

-- Customers can create reviews for their completed orders
CREATE POLICY "Customers create reviews" ON public.reviews
  FOR INSERT WITH CHECK (
    customer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM orders 
      WHERE id = reviews.order_id 
      AND customer_id = auth.uid() 
      AND status = 'COMPLETED'
    )
  );

-- Customers can update their own reviews
CREATE POLICY "Customers update own reviews" ON public.reviews
  FOR UPDATE USING (customer_id = auth.uid());

-- Tailors can respond to reviews
CREATE POLICY "Tailors respond to reviews" ON public.reviews
  FOR UPDATE USING (
    tailor_id IN (
      SELECT id FROM tailor_profiles
      WHERE user_id = auth.uid()
    )
  );

-- Disputes policies
-- Order participants can view disputes for their orders
CREATE POLICY "Order participants view disputes" ON public.disputes
  FOR SELECT USING (
    raised_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM orders o
      LEFT JOIN tailor_profiles tp ON o.tailor_id = tp.id
      WHERE o.id = disputes.order_id
      AND (o.customer_id = auth.uid() OR tp.user_id = auth.uid())
    )
  );

-- Users can create disputes for their orders
CREATE POLICY "Users create disputes" ON public.disputes
  FOR INSERT WITH CHECK (
    raised_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM orders o
      LEFT JOIN tailor_profiles tp ON o.tailor_id = tp.id
      WHERE o.id = disputes.order_id
      AND (o.customer_id = auth.uid() OR tp.user_id = auth.uid())
    )
  );

-- Dispute participants can add evidence
CREATE POLICY "Participants update disputes" ON public.disputes
  FOR UPDATE USING (
    raised_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM orders o
      LEFT JOIN tailor_profiles tp ON o.tailor_id = tp.id
      WHERE o.id = disputes.order_id
      AND (o.customer_id = auth.uid() OR tp.user_id = auth.uid())
    )
  );

-- Admins can manage all disputes
CREATE POLICY "Admins manage disputes" ON public.disputes
  FOR ALL USING (
    assigned_to = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'ADMIN'
    )
  );

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user is tailor
CREATE OR REPLACE FUNCTION is_tailor()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'TAILOR'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user owns order
CREATE OR REPLACE FUNCTION owns_order(order_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM orders o
    LEFT JOIN tailor_profiles tp ON o.tailor_id = tp.id
    WHERE o.id = order_id
    AND (o.customer_id = auth.uid() OR tp.user_id = auth.uid())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;