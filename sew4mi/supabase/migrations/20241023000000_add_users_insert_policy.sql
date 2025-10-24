-- Add missing INSERT policy for users table
-- This allows users to create their own profile during registration

CREATE POLICY "Users can create own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

