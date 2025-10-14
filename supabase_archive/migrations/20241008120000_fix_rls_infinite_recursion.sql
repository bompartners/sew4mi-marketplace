-- Fix infinite recursion in RLS policies
-- The issue: policies on users table query tailor_profiles, which query users table again

-- Drop problematic policies
DROP POLICY IF EXISTS "Users can view public profiles" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins manage tailor profiles" ON public.tailor_profiles;

-- Recreate users policies without recursion
-- Use helper functions with SECURITY DEFINER to break the recursion chain

-- Create safe helper function to check admin role in public schema
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT COALESCE(
      (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'ADMIN' OR
      (SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'ADMIN',
      false
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Recreate admin policy using the safe helper
CREATE POLICY "Admins can view all users" ON public.users
  FOR ALL USING (public.is_admin());

-- Simplified policy for viewing public tailor profiles
-- Users can view other users only if they have a verified tailor profile
CREATE POLICY "Verified tailors are publicly viewable" ON public.users
  FOR SELECT USING (
    role = 'TAILOR' AND
    id IN (
      SELECT user_id FROM tailor_profiles
      WHERE verification_status = 'VERIFIED'
    )
  );

-- Recreate admin policy for tailor profiles
CREATE POLICY "Admins manage tailor profiles" ON public.tailor_profiles
  FOR ALL USING (public.is_admin());

-- Grant execute permission on the helper function
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;

-- Add comment for documentation
COMMENT ON FUNCTION public.is_admin() IS 'Helper function to check if current user is admin. Uses SECURITY DEFINER to avoid RLS recursion.';
