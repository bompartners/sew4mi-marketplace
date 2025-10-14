-- Role-based Access Control Extensions
-- Migration for Story 1.4: Role-Based Access Control

-- Create tailor applications table
CREATE TABLE public.tailor_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  business_type TEXT CHECK (business_type IN ('individual', 'company', 'cooperative')) DEFAULT 'individual',
  years_of_experience INTEGER CHECK (years_of_experience >= 0) DEFAULT 0,
  specializations TEXT[] DEFAULT '{}',
  portfolio_description TEXT NOT NULL,
  business_location TEXT NOT NULL,
  workspace_photos TEXT[] DEFAULT '{}',
  business_references JSONB DEFAULT '[]'::jsonb,
  business_registration_url TEXT,
  tax_id TEXT,
  status TEXT CHECK (status IN ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'RESUBMITTED')) DEFAULT 'PENDING',
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.users(id),
  reviewer_notes TEXT,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(user_id) -- One application per user
);

-- Create indexes for tailor_applications
CREATE INDEX idx_tailor_applications_user ON public.tailor_applications(user_id);
CREATE INDEX idx_tailor_applications_status ON public.tailor_applications(status);
CREATE INDEX idx_tailor_applications_submitted ON public.tailor_applications(submitted_at DESC);

-- Create audit logs table for role changes and other admin actions
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_values JSONB,
  new_values JSONB,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for audit_logs
CREATE INDEX idx_audit_logs_table ON public.audit_logs(table_name);
CREATE INDEX idx_audit_logs_record ON public.audit_logs(record_id);
CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_performed ON public.audit_logs(performed_at DESC);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);

-- Create role change requests table
CREATE TABLE public.role_change_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  from_role user_role NOT NULL,
  to_role user_role NOT NULL,
  reason TEXT NOT NULL,
  requested_by UUID NOT NULL REFERENCES public.users(id),
  status TEXT CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')) DEFAULT 'PENDING',
  approved_by UUID REFERENCES public.users(id),
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  effective_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for role_change_requests
CREATE INDEX idx_role_change_requests_user ON public.role_change_requests(user_id);
CREATE INDEX idx_role_change_requests_status ON public.role_change_requests(status);
CREATE INDEX idx_role_change_requests_requested_by ON public.role_change_requests(requested_by);
CREATE INDEX idx_role_change_requests_created ON public.role_change_requests(created_at DESC);

-- Add updated_at triggers for new tables
CREATE TRIGGER update_tailor_applications_updated_at 
  BEFORE UPDATE ON tailor_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_role_change_requests_updated_at 
  BEFORE UPDATE ON role_change_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically create tailor profile when application is approved
CREATE OR REPLACE FUNCTION create_tailor_profile_from_application()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if status changed to 'APPROVED'
  IF NEW.status = 'APPROVED' AND (OLD.status IS NULL OR OLD.status != 'APPROVED') THEN
    
    -- Update user role to TAILOR
    UPDATE public.users 
    SET role = 'TAILOR',
        updated_at = NOW()
    WHERE id = NEW.user_id;
    
    -- Create tailor profile
    INSERT INTO public.tailor_profiles (
      user_id,
      business_name,
      bio,
      years_of_experience,
      specializations,
      location_name,
      verification_status,
      verification_date,
      verified_by,
      created_at,
      updated_at
    ) VALUES (
      NEW.user_id,
      NEW.business_name,
      LEFT(NEW.portfolio_description, 500), -- Truncate to fit bio field
      NEW.years_of_experience,
      NEW.specializations,
      NEW.business_location,
      'VERIFIED',
      NOW(),
      NEW.reviewed_by,
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      business_name = EXCLUDED.business_name,
      bio = EXCLUDED.bio,
      years_of_experience = EXCLUDED.years_of_experience,
      specializations = EXCLUDED.specializations,
      location_name = EXCLUDED.location_name,
      verification_status = 'VERIFIED',
      verification_date = NOW(),
      verified_by = NEW.reviewed_by,
      updated_at = NOW();
    
    -- Create audit log entry
    INSERT INTO public.audit_logs (
      table_name,
      record_id,
      action,
      old_values,
      new_values,
      user_id,
      metadata
    ) VALUES (
      'tailor_applications',
      NEW.id,
      'UPDATE',
      to_jsonb(OLD),
      to_jsonb(NEW),
      NEW.reviewed_by,
      jsonb_build_object(
        'action_type', 'tailor_application_approved',
        'user_promoted_to_tailor', NEW.user_id,
        'approval_timestamp', NOW()
      )
    );
    
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for automatic tailor profile creation
CREATE TRIGGER create_tailor_profile_on_approval
  AFTER UPDATE ON tailor_applications
  FOR EACH ROW EXECUTE FUNCTION create_tailor_profile_from_application();

-- Create function to log role changes
CREATE OR REPLACE FUNCTION log_role_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if role actually changed
  IF OLD.role != NEW.role THEN
    INSERT INTO public.audit_logs (
      table_name,
      record_id,
      action,
      old_values,
      new_values,
      user_id,
      metadata
    ) VALUES (
      'users',
      NEW.id,
      'UPDATE',
      jsonb_build_object('role', OLD.role),
      jsonb_build_object('role', NEW.role),
      NEW.id, -- For now, user changing themselves; this can be overridden by admin functions
      jsonb_build_object(
        'action_type', 'role_change',
        'from_role', OLD.role,
        'to_role', NEW.role,
        'change_timestamp', NOW()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for role change logging
CREATE TRIGGER log_user_role_changes
  AFTER UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION log_role_changes();

-- Insert some sample audit log retention policy data
INSERT INTO public.audit_logs (
  table_name,
  record_id,
  action,
  new_values,
  user_id,
  metadata
) VALUES (
  'system',
  uuid_generate_v4(),
  'INSERT',
  jsonb_build_object('event', 'role_system_initialized'),
  (SELECT id FROM public.users WHERE role = 'ADMIN' LIMIT 1),
  jsonb_build_object(
    'action_type', 'system_initialization',
    'component', 'role_based_access_control',
    'migration_version', '20240818120000'
  )
);

-- Create RLS policies for new tables

-- Tailor applications RLS policies
ALTER TABLE public.tailor_applications ENABLE ROW LEVEL SECURITY;

-- Users can view/edit their own applications
CREATE POLICY "Users can view own tailor applications" ON public.tailor_applications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tailor applications" ON public.tailor_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pending applications" ON public.tailor_applications
  FOR UPDATE USING (auth.uid() = user_id AND status = 'PENDING');

-- Admins can view/manage all applications
CREATE POLICY "Admins can view all tailor applications" ON public.tailor_applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can update all tailor applications" ON public.tailor_applications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Audit logs RLS policies
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all audit logs
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- System can insert audit logs (for triggers and system operations)
CREATE POLICY "System can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (true);

-- Role change requests RLS policies
ALTER TABLE public.role_change_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own role change requests
CREATE POLICY "Users can view own role change requests" ON public.role_change_requests
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = requested_by);

-- Admins can view/manage all role change requests
CREATE POLICY "Admins can manage role change requests" ON public.role_change_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_role ON public.users(created_at, role);

-- Add comments for documentation
COMMENT ON TABLE public.tailor_applications IS 'Applications submitted by users wanting to become expert tailors';
COMMENT ON TABLE public.audit_logs IS 'System-wide audit trail for tracking changes to sensitive data';
COMMENT ON TABLE public.role_change_requests IS 'Formal requests for user role changes requiring approval';

COMMENT ON COLUMN public.tailor_applications.status IS 'Application status: PENDING, UNDER_REVIEW, APPROVED, REJECTED, RESUBMITTED';
COMMENT ON COLUMN public.audit_logs.action IS 'Database action that was performed: INSERT, UPDATE, DELETE';
COMMENT ON COLUMN public.audit_logs.metadata IS 'Additional context about the action performed';

-- Create function for admin role management
CREATE OR REPLACE FUNCTION admin_change_user_role(
  target_user_id UUID,
  new_role user_role,
  admin_user_id UUID,
  reason TEXT DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  old_role user_role;
  admin_role user_role;
  result jsonb;
BEGIN
  -- Verify admin permissions
  SELECT role INTO admin_role 
  FROM public.users 
  WHERE id = admin_user_id;
  
  IF admin_role != 'ADMIN' THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Insufficient permissions'
    );
  END IF;
  
  -- Get current role
  SELECT role INTO old_role 
  FROM public.users 
  WHERE id = target_user_id;
  
  IF old_role IS NULL THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'User not found'
    );
  END IF;
  
  IF old_role = new_role THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'User already has this role'
    );
  END IF;
  
  -- Update user role
  UPDATE public.users 
  SET role = new_role, updated_at = NOW() 
  WHERE id = target_user_id;
  
  -- Create audit log entry (will be handled by trigger, but we add additional context)
  INSERT INTO public.audit_logs (
    table_name,
    record_id,
    action,
    old_values,
    new_values,
    user_id,
    metadata
  ) VALUES (
    'users',
    target_user_id,
    'UPDATE',
    jsonb_build_object('role', old_role),
    jsonb_build_object('role', new_role),
    admin_user_id,
    jsonb_build_object(
      'action_type', 'admin_role_change',
      'from_role', old_role,
      'to_role', new_role,
      'reason', COALESCE(reason, 'Admin role change'),
      'admin_user_id', admin_user_id,
      'change_timestamp', NOW()
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'old_role', old_role,
    'new_role', new_role,
    'user_id', target_user_id,
    'changed_by', admin_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;