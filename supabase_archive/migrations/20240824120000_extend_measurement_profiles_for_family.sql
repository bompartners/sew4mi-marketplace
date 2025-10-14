-- Migration to extend measurement_profiles table for family profile functionality
-- Story 4.1: Family Measurement Profiles

-- First, add new columns to existing measurement_profiles table
ALTER TABLE public.measurement_profiles 
ADD COLUMN IF NOT EXISTS relationship TEXT CHECK (relationship IN ('SELF', 'SPOUSE', 'CHILD', 'PARENT', 'SIBLING', 'OTHER')) DEFAULT 'SELF',
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS privacy_settings JSONB DEFAULT '{"visibility": "FAMILY_ONLY", "shareWithFamily": true, "allowEditing": false}'::jsonb,
ADD COLUMN IF NOT EXISTS growth_tracking JSONB DEFAULT '{"isTrackingEnabled": false, "reminderFrequency": "NEVER"}'::jsonb,
ADD COLUMN IF NOT EXISTS family_account_id UUID,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS shared_with UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Note: Cannot use GENERATED column with CURRENT_DATE (not immutable)
-- Instead, we'll create a function to calculate age dynamically
-- The 'age' field will be calculated in the application layer or via a database function

-- Function to calculate age from birth_date (can be used in queries)
CREATE OR REPLACE FUNCTION calculate_profile_age(birth_date DATE)
RETURNS INTEGER AS $$
BEGIN
  IF birth_date IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN EXTRACT(YEAR FROM AGE(CURRENT_DATE, birth_date))::INTEGER;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create family_accounts table for managing family groups
CREATE TABLE IF NOT EXISTS public.family_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  primary_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  family_name TEXT,
  member_ids UUID[] DEFAULT '{}',
  shared_profile_ids UUID[] DEFAULT '{}',
  invite_code TEXT UNIQUE,
  settings JSONB DEFAULT '{
    "allowInvitations": true,
    "defaultProfileVisibility": "FAMILY_ONLY",
    "requireApprovalForSharing": false,
    "maxMembers": 10
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create family_members table for tracking family relationships
CREATE TABLE IF NOT EXISTS public.family_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  family_account_id UUID NOT NULL REFERENCES public.family_accounts(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL CHECK (relationship IN ('SELF', 'SPOUSE', 'CHILD', 'PARENT', 'SIBLING', 'OTHER')),
  nickname TEXT,
  permissions TEXT[] DEFAULT '{"VIEW_ONLY"}' CHECK (
    permissions <@ ARRAY['VIEW_ONLY', 'EDIT', 'ADMIN']
  ),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, family_account_id)
);

-- Create measurement_history table for tracking growth over time
CREATE TABLE IF NOT EXISTS public.measurement_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.measurement_profiles(id) ON DELETE CASCADE,
  measurements JSONB NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  recorded_by UUID NOT NULL REFERENCES public.users(id),
  notes TEXT,
  photo_urls TEXT[],
  height DECIMAL(5,2), -- in cm
  weight DECIMAL(5,2), -- in kg
  is_growth_check BOOLEAN DEFAULT false
);

-- Create profile_audit_log table for security and tracking
CREATE TABLE IF NOT EXISTS public.profile_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.measurement_profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('CREATED', 'UPDATED', 'SHARED', 'UNSHARED', 'VIEWED', 'DELETED', 'RESTORED')),
  performed_by UUID NOT NULL REFERENCES public.users(id),
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  details JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT
);

-- Create reminder_schedules table for growth tracking reminders
CREATE TABLE IF NOT EXISTS public.reminder_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.measurement_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reminder_type TEXT DEFAULT 'GROWTH_TRACKING' CHECK (reminder_type IN ('GROWTH_TRACKING', 'MEASUREMENT_UPDATE')),
  frequency TEXT NOT NULL CHECK (frequency IN ('MONTHLY', 'QUARTERLY', 'BIANNUALLY', 'ANNUALLY')),
  next_reminder_date TIMESTAMPTZ NOT NULL,
  notification_channels TEXT[] DEFAULT '{"EMAIL"}' CHECK (
    notification_channels <@ ARRAY['SMS', 'EMAIL', 'WHATSAPP', 'PUSH']
  ),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraint for family_account_id
ALTER TABLE public.measurement_profiles 
ADD CONSTRAINT fk_measurement_profiles_family_account 
FOREIGN KEY (family_account_id) REFERENCES public.family_accounts(id);

-- Add foreign key constraint for created_by
ALTER TABLE public.measurement_profiles 
ADD CONSTRAINT fk_measurement_profiles_created_by 
FOREIGN KEY (created_by) REFERENCES public.users(id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_measurement_profiles_relationship ON measurement_profiles(relationship);
CREATE INDEX IF NOT EXISTS idx_measurement_profiles_family_account ON measurement_profiles(family_account_id);
CREATE INDEX IF NOT EXISTS idx_measurement_profiles_birth_date ON measurement_profiles(birth_date);
-- Note: Cannot index on calculated_age as it's now a function, not a column
-- Age-based queries can use: WHERE calculate_profile_age(birth_date) < 18
CREATE INDEX IF NOT EXISTS idx_measurement_profiles_created_by ON measurement_profiles(created_by);
CREATE INDEX IF NOT EXISTS idx_measurement_profiles_archived ON measurement_profiles(is_archived) WHERE is_archived = false;

CREATE INDEX IF NOT EXISTS idx_family_accounts_primary_user ON family_accounts(primary_user_id);
CREATE INDEX IF NOT EXISTS idx_family_accounts_invite_code ON family_accounts(invite_code) WHERE invite_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_family_members_user ON family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_family_account ON family_members(family_account_id);
CREATE INDEX IF NOT EXISTS idx_family_members_active ON family_members(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_measurement_history_profile ON measurement_history(profile_id);
CREATE INDEX IF NOT EXISTS idx_measurement_history_recorded_at ON measurement_history(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_measurement_history_growth_check ON measurement_history(is_growth_check) WHERE is_growth_check = true;

CREATE INDEX IF NOT EXISTS idx_profile_audit_log_profile ON profile_audit_log(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_audit_log_performed_at ON profile_audit_log(performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_profile_audit_log_action ON profile_audit_log(action);

CREATE INDEX IF NOT EXISTS idx_reminder_schedules_profile ON reminder_schedules(profile_id);
CREATE INDEX IF NOT EXISTS idx_reminder_schedules_next_reminder ON reminder_schedules(next_reminder_date) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_reminder_schedules_user ON reminder_schedules(user_id);

-- Add triggers for updated_at columns
CREATE TRIGGER update_family_accounts_updated_at BEFORE UPDATE ON family_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reminder_schedules_updated_at BEFORE UPDATE ON reminder_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically set created_by field if not provided
CREATE OR REPLACE FUNCTION set_measurement_profile_created_by()
RETURNS TRIGGER AS $$
BEGIN
  -- Set created_by to user_id if not explicitly provided
  IF NEW.created_by IS NULL THEN
    NEW.created_by = NEW.user_id;
  END IF;
  
  -- Set default privacy settings based on relationship
  IF NEW.privacy_settings IS NULL OR NEW.privacy_settings = '{}'::jsonb THEN
    CASE NEW.relationship
      WHEN 'CHILD' THEN
        NEW.privacy_settings = '{"visibility": "FAMILY_ONLY", "shareWithFamily": true, "allowEditing": true}'::jsonb;
      WHEN 'SPOUSE' THEN
        NEW.privacy_settings = '{"visibility": "FAMILY_ONLY", "shareWithFamily": true, "allowEditing": true}'::jsonb;
      WHEN 'PARENT' THEN
        NEW.privacy_settings = '{"visibility": "PRIVATE", "shareWithFamily": false, "allowEditing": false}'::jsonb;
      WHEN 'SIBLING' THEN
        NEW.privacy_settings = '{"visibility": "FAMILY_ONLY", "shareWithFamily": true, "allowEditing": false}'::jsonb;
      WHEN 'OTHER' THEN
        NEW.privacy_settings = '{"visibility": "PRIVATE", "shareWithFamily": false, "allowEditing": false}'::jsonb;
      ELSE
        NEW.privacy_settings = '{"visibility": "FAMILY_ONLY", "shareWithFamily": true, "allowEditing": false}'::jsonb;
    END CASE;
  END IF;
  
  -- Set growth tracking defaults based on relationship and age
  IF NEW.growth_tracking IS NULL OR NEW.growth_tracking = '{}'::jsonb THEN
    DECLARE
      profile_age INTEGER;
    BEGIN
      profile_age := calculate_profile_age(NEW.birth_date);

      CASE NEW.relationship
        WHEN 'CHILD' THEN
          NEW.growth_tracking = '{"isTrackingEnabled": true, "reminderFrequency": "QUARTERLY", "lastMeasurementUpdate": "' || NOW() || '"}'::jsonb;
        WHEN 'SIBLING' THEN
          IF profile_age IS NULL OR profile_age <= 16 THEN
            NEW.growth_tracking = '{"isTrackingEnabled": true, "reminderFrequency": "BIANNUALLY", "lastMeasurementUpdate": "' || NOW() || '"}'::jsonb;
          ELSE
            NEW.growth_tracking = '{"isTrackingEnabled": false, "reminderFrequency": "NEVER"}'::jsonb;
          END IF;
        ELSE
          NEW.growth_tracking = '{"isTrackingEnabled": false, "reminderFrequency": "NEVER"}'::jsonb;
      END CASE;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_measurement_profile_created_by_trigger
  BEFORE INSERT ON measurement_profiles
  FOR EACH ROW EXECUTE FUNCTION set_measurement_profile_created_by();

-- Function to generate unique family invite codes
CREATE OR REPLACE FUNCTION generate_family_invite_code()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate a random 8-character invite code if not provided
  IF NEW.invite_code IS NULL THEN
    NEW.invite_code = upper(substring(gen_random_uuid()::text from 1 for 8));
    
    -- Ensure uniqueness (retry if collision, which is extremely rare)
    WHILE EXISTS (SELECT 1 FROM family_accounts WHERE invite_code = NEW.invite_code) LOOP
      NEW.invite_code = upper(substring(gen_random_uuid()::text from 1 for 8));
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER generate_family_invite_code_trigger
  BEFORE INSERT ON family_accounts
  FOR EACH ROW EXECUTE FUNCTION generate_family_invite_code();

-- Function to create audit log entries automatically
CREATE OR REPLACE FUNCTION create_profile_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    action_type TEXT;
    old_data JSONB;
    new_data JSONB;
BEGIN
    -- Determine action type
    IF TG_OP = 'INSERT' THEN
        action_type = 'CREATED';
        new_data = row_to_json(NEW)::jsonb;
    ELSIF TG_OP = 'UPDATE' THEN
        action_type = 'UPDATED';
        old_data = row_to_json(OLD)::jsonb;
        new_data = row_to_json(NEW)::jsonb;
    ELSIF TG_OP = 'DELETE' THEN
        action_type = 'DELETED';
        old_data = row_to_json(OLD)::jsonb;
    END IF;
    
    -- Insert audit log entry
    INSERT INTO profile_audit_log (
        profile_id,
        action,
        performed_by,
        details
    ) VALUES (
        COALESCE(NEW.id, OLD.id),
        action_type,
        COALESCE(NEW.created_by, NEW.user_id, OLD.user_id),
        jsonb_build_object(
            'old_data', old_data,
            'new_data', new_data,
            'table_name', TG_TABLE_NAME
        )
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

CREATE TRIGGER measurement_profiles_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON measurement_profiles
    FOR EACH ROW EXECUTE FUNCTION create_profile_audit_log();

-- Function to automatically create reminder schedules for children
CREATE OR REPLACE FUNCTION create_growth_reminder_schedule()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create reminders for profiles with growth tracking enabled
    IF NEW.growth_tracking->>'isTrackingEnabled' = 'true' 
       AND NEW.growth_tracking->>'reminderFrequency' != 'NEVER' THEN
        
        INSERT INTO reminder_schedules (
            profile_id,
            user_id,
            frequency,
            next_reminder_date,
            notification_channels
        ) VALUES (
            NEW.id,
            NEW.user_id,
            NEW.growth_tracking->>'reminderFrequency',
            -- Calculate next reminder date based on frequency
            CASE NEW.growth_tracking->>'reminderFrequency'
                WHEN 'MONTHLY' THEN NOW() + INTERVAL '1 month'
                WHEN 'QUARTERLY' THEN NOW() + INTERVAL '3 months'
                WHEN 'BIANNUALLY' THEN NOW() + INTERVAL '6 months'
                WHEN 'ANNUALLY' THEN NOW() + INTERVAL '1 year'
                ELSE NOW() + INTERVAL '3 months'
            END,
            ARRAY['EMAIL', 'WHATSAPP']
        );
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER create_growth_reminder_schedule_trigger
    AFTER INSERT ON measurement_profiles
    FOR EACH ROW EXECUTE FUNCTION create_growth_reminder_schedule();

-- Update existing measurement profiles to have SELF relationship for existing users
UPDATE measurement_profiles 
SET relationship = 'SELF' 
WHERE relationship IS NULL;

-- Set created_by for existing profiles
UPDATE measurement_profiles 
SET created_by = user_id 
WHERE created_by IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN measurement_profiles.relationship IS 'Family relationship type: SELF, SPOUSE, CHILD, PARENT, SIBLING, OTHER';
COMMENT ON COLUMN measurement_profiles.birth_date IS 'Birth date for age calculation and growth tracking. Use calculate_profile_age(birth_date) function to get current age.';
COMMENT ON COLUMN measurement_profiles.avatar_url IS 'Profile avatar/photo URL for visual identification';
COMMENT ON COLUMN measurement_profiles.privacy_settings IS 'JSON object containing visibility, sharing, and editing permissions';
COMMENT ON COLUMN measurement_profiles.growth_tracking IS 'JSON object containing growth tracking settings and reminder preferences';
COMMENT ON COLUMN measurement_profiles.family_account_id IS 'Reference to family account for sharing profiles';
COMMENT ON COLUMN measurement_profiles.created_by IS 'User who created this profile (may differ from user_id for family members)';
COMMENT ON COLUMN measurement_profiles.shared_with IS 'Array of user IDs who have access to this profile';

COMMENT ON FUNCTION calculate_profile_age(DATE) IS 'Calculates current age in years from birth_date. Returns NULL if birth_date is NULL.';

COMMENT ON TABLE family_accounts IS 'Groups of users sharing measurement profiles within a family unit';
COMMENT ON TABLE family_members IS 'Membership and relationship tracking within family accounts';
COMMENT ON TABLE measurement_history IS 'Historical measurement data for growth tracking and analysis';
COMMENT ON TABLE profile_audit_log IS 'Audit trail for all profile access and modifications';
COMMENT ON TABLE reminder_schedules IS 'Automated reminder scheduling for measurement updates';