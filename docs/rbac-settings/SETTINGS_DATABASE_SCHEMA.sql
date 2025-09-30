-- ============================================================================
-- SETTINGS DATABASE SCHEMA
-- Extends existing schema with all settings configurations
-- ============================================================================

-- ============================================================================
-- 1. USER PROFILE SETTINGS (extends user_profiles)
-- ============================================================================

-- Add columns to user_profiles for profile settings
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS profile_picture_url TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en',
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

-- ============================================================================
-- 2. USER NOTIFICATION PREFERENCES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Email Notifications
  email_account_activity BOOLEAN DEFAULT true,
  email_team_updates BOOLEAN DEFAULT true,
  email_project_activity BOOLEAN DEFAULT false,
  email_marketing BOOLEAN DEFAULT false,
  
  -- In-App Notifications
  inapp_push_enabled BOOLEAN DEFAULT false,
  inapp_sound_enabled BOOLEAN DEFAULT true,
  
  -- Communication Preferences
  email_digest_frequency TEXT DEFAULT 'realtime' CHECK (email_digest_frequency IN ('realtime', 'daily', 'weekly', 'never')),
  
  -- Quiet Hours
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '08:00',
  quiet_hours_timezone TEXT DEFAULT 'UTC',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_user_notification_prefs UNIQUE (user_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_user_notification_prefs_user_id 
ON public.user_notification_preferences(user_id);

-- ============================================================================
-- 3. USER SECURITY SETTINGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_security_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 2FA Settings
  mfa_enabled BOOLEAN DEFAULT false,
  mfa_factor_id TEXT,
  mfa_enrolled_at TIMESTAMPTZ,
  
  -- Password Settings
  password_changed_at TIMESTAMPTZ,
  require_password_change BOOLEAN DEFAULT false,
  
  -- Security Preferences
  login_notifications BOOLEAN DEFAULT true,
  unusual_activity_alerts BOOLEAN DEFAULT true,
  
  -- Session Management
  max_active_sessions INTEGER DEFAULT 5,
  session_timeout_minutes INTEGER DEFAULT 10080, -- 7 days
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_user_security_settings UNIQUE (user_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_user_security_settings_user_id 
ON public.user_security_settings(user_id);

-- ============================================================================
-- 4. ORGANIZATION SETTINGS (extends organizations)
-- ============================================================================

-- Add columns to organizations for general settings
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS website_url TEXT,
ADD COLUMN IF NOT EXISTS support_email TEXT,
ADD COLUMN IF NOT EXISTS business_address TEXT,
ADD COLUMN IF NOT EXISTS industry TEXT,
ADD COLUMN IF NOT EXISTS company_size TEXT CHECK (company_size IN ('1-10', '11-50', '51-200', '201-500', '501-1000', '1000+')),
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

-- ============================================================================
-- 5. ORGANIZATION TEAM SETTINGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.organization_team_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Invitation Settings
  require_admin_approval BOOLEAN DEFAULT false,
  allow_member_invites BOOLEAN DEFAULT false,
  
  -- Team Management
  auto_assign_default_role user_role DEFAULT 'member',
  max_team_size INTEGER,
  
  -- Collaboration Settings
  allow_guest_access BOOLEAN DEFAULT false,
  guest_link_expiry_days INTEGER DEFAULT 30,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_org_team_settings UNIQUE (org_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_org_team_settings_org_id 
ON public.organization_team_settings(org_id);

-- ============================================================================
-- 6. USER ACTIVE SESSIONS (for security tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Session Info
  session_token TEXT NOT NULL UNIQUE,
  device_info JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  
  -- Location (optional)
  country TEXT,
  city TEXT,
  
  -- Session Status
  is_current BOOLEAN DEFAULT false,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_active_sessions_user_id 
ON public.user_active_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_active_sessions_token 
ON public.user_active_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_active_sessions_expires 
ON public.user_active_sessions(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================================================
-- 7. SECURITY AUDIT LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Event Details
  event_type TEXT NOT NULL, -- 'login', 'logout', 'password_change', 'mfa_enabled', etc.
  event_action TEXT NOT NULL, -- 'success', 'failure', 'attempted'
  event_metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Context
  ip_address INET,
  user_agent TEXT,
  location_data JSONB,
  
  -- Severity
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  
  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_security_audit_user_id 
ON public.security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_org_id 
ON public.security_audit_log(org_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_event_type 
ON public.security_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_created_at 
ON public.security_audit_log(created_at DESC);

-- ============================================================================
-- 8. RBAC CAPABILITIES FOR SETTINGS (extends capabilities)
-- ============================================================================

-- Insert settings-related capabilities
INSERT INTO public.capabilities (key, name, description, category) VALUES
  -- User Profile
  ('profile.edit_own', 'Edit Own Profile', 'Edit own profile information', 'profile'),
  ('profile.edit_others', 'Edit Others Profiles', 'Edit other users profiles', 'profile'),
  ('profile.upload_picture', 'Upload Profile Picture', 'Upload profile picture', 'profile'),
  
  -- Security
  ('security.view_own', 'View Own Security', 'View own security settings', 'security'),
  ('security.edit_own', 'Edit Own Security', 'Edit own security settings', 'security'),
  ('security.view_org_audit', 'View Org Security Audit', 'View organization security audit log', 'security'),
  ('security.manage_sessions', 'Manage Sessions', 'Manage active sessions', 'security'),
  
  -- Notifications
  ('notifications.edit_own', 'Edit Own Notifications', 'Edit own notification preferences', 'notifications'),
  
  -- Organization Settings
  ('org.settings.edit', 'Edit Organization Settings', 'Edit organization general settings', 'organization'),
  ('org.team_settings.edit', 'Edit Team Settings', 'Edit team management settings', 'organization'),
  ('org.logo.upload', 'Upload Organization Logo', 'Upload organization logo', 'organization')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- 9. DEFAULT ROLE CAPABILITIES FOR SETTINGS
-- ============================================================================

-- OWNER - Full access to all settings
INSERT INTO public.role_capabilities (role, capability_id, is_default)
SELECT 'owner', id, true FROM public.capabilities
WHERE category IN ('profile', 'security', 'notifications', 'organization')
ON CONFLICT (role, capability_id) DO NOTHING;

-- SUPERADMIN - All settings access
INSERT INTO public.role_capabilities (role, capability_id, is_default)
SELECT 'superadmin', id, true FROM public.capabilities
WHERE category IN ('profile', 'security', 'notifications', 'organization')
ON CONFLICT (role, capability_id) DO NOTHING;

-- ADMIN - Org settings + own user settings
INSERT INTO public.role_capabilities (role, capability_id, is_default)
SELECT 'admin', id, true FROM public.capabilities
WHERE key IN (
  'profile.edit_own', 'profile.upload_picture',
  'security.view_own', 'security.edit_own', 'security.manage_sessions',
  'notifications.edit_own',
  'org.settings.edit', 'org.team_settings.edit', 'org.logo.upload'
)
ON CONFLICT (role, capability_id) DO NOTHING;

-- MEMBER - Only own settings
INSERT INTO public.role_capabilities (role, capability_id, is_default)
SELECT 'member', id, true FROM public.capabilities
WHERE key IN (
  'profile.edit_own', 'profile.upload_picture',
  'security.view_own', 'security.edit_own', 'security.manage_sessions',
  'notifications.edit_own'
)
ON CONFLICT (role, capability_id) DO NOTHING;

-- VIEW-ONLY - Only view own settings
INSERT INTO public.role_capabilities (role, capability_id, is_default)
SELECT 'view-only', id, true FROM public.capabilities
WHERE key IN (
  'security.view_own'
)
ON CONFLICT (role, capability_id) DO NOTHING;

-- ============================================================================
-- 10. RLS POLICIES FOR NEW TABLES
-- ============================================================================

-- User Notification Preferences RLS
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_notification_prefs"
ON public.user_notification_preferences FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "insert_own_notification_prefs"
ON public.user_notification_preferences FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "update_own_notification_prefs"
ON public.user_notification_preferences FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "service_all_notification_prefs"
ON public.user_notification_preferences FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- User Security Settings RLS
ALTER TABLE public.user_security_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_security_settings"
ON public.user_security_settings FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "insert_own_security_settings"
ON public.user_security_settings FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "update_own_security_settings"
ON public.user_security_settings FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "service_all_security_settings"
ON public.user_security_settings FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Organization Team Settings RLS
ALTER TABLE public.organization_team_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_org_team_settings"
ON public.organization_team_settings FOR SELECT
TO authenticated
USING (
  user_org_access(auth.uid(), org_id)
);

CREATE POLICY "manage_org_team_settings"
ON public.organization_team_settings FOR ALL
TO authenticated
USING (
  user_org_access(auth.uid(), org_id, ARRAY['owner', 'superadmin', 'admin']::user_role[])
)
WITH CHECK (
  user_org_access(auth.uid(), org_id, ARRAY['owner', 'superadmin', 'admin']::user_role[])
);

CREATE POLICY "service_all_team_settings"
ON public.organization_team_settings FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- User Active Sessions RLS
ALTER TABLE public.user_active_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_sessions"
ON public.user_active_sessions FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "manage_own_sessions"
ON public.user_active_sessions FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "service_all_sessions"
ON public.user_active_sessions FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Security Audit Log RLS
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_audit_log"
ON public.security_audit_log FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR (org_id IS NOT NULL AND user_org_capability(auth.uid(), org_id, 'security.view_org_audit'))
);

CREATE POLICY "insert_audit_log"
ON public.security_audit_log FOR INSERT
TO authenticated
WITH CHECK (true); -- Anyone can write audit logs

CREATE POLICY "service_all_audit_log"
ON public.security_audit_log FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 11. TRIGGERS FOR AUTO-INITIALIZATION
-- ============================================================================

-- Auto-create notification preferences for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Create notification preferences
  INSERT INTO public.user_notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Create security settings
  INSERT INTO public.user_security_settings (user_id, password_changed_at)
  VALUES (NEW.id, now())
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_settings
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_settings();

-- Auto-create team settings for new organizations
CREATE OR REPLACE FUNCTION public.handle_new_org_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Create team settings
  INSERT INTO public.organization_team_settings (org_id)
  VALUES (NEW.id)
  ON CONFLICT (org_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_organization_created_settings
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_org_settings();

-- Update timestamps trigger (reuse existing function)
CREATE TRIGGER user_notification_prefs_updated_at
  BEFORE UPDATE ON public.user_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER user_security_settings_updated_at
  BEFORE UPDATE ON public.user_security_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER org_team_settings_updated_at
  BEFORE UPDATE ON public.organization_team_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER user_active_sessions_updated_at
  BEFORE UPDATE ON public.user_active_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 12. HELPER FUNCTIONS FOR SETTINGS
-- ============================================================================

-- Check if user has specific setting capability
CREATE OR REPLACE FUNCTION public.user_can_edit_org_settings(
  p_user_id UUID,
  p_org_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
BEGIN
  RETURN user_org_capability(p_user_id, p_org_id, 'org.settings.edit');
END;
$$;

-- Check if user can view security audit for org
CREATE OR REPLACE FUNCTION public.user_can_view_org_audit(
  p_user_id UUID,
  p_org_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
BEGIN
  RETURN user_org_capability(p_user_id, p_org_id, 'security.view_org_audit');
END;
$$;

-- Log security event
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_user_id UUID,
  p_org_id UUID,
  p_event_type TEXT,
  p_event_action TEXT,
  p_severity TEXT DEFAULT 'info',
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.security_audit_log (
    user_id, org_id, event_type, event_action, severity, event_metadata
  )
  VALUES (
    p_user_id, p_org_id, p_event_type, p_event_action, p_severity, p_metadata
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- ============================================================================
-- 13. USAGE TRACKING FOR SETTINGS FEATURES
-- ============================================================================

-- Track which settings features are being used for billing purposes
CREATE TABLE IF NOT EXISTS public.settings_usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Feature Usage
  feature_key TEXT NOT NULL,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_org_feature_usage UNIQUE (org_id, feature_key)
);

CREATE INDEX IF NOT EXISTS idx_settings_usage_org_id 
ON public.settings_usage_tracking(org_id);

-- RLS for usage tracking
ALTER TABLE public.settings_usage_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_usage_tracking"
ON public.settings_usage_tracking FOR SELECT
TO authenticated
USING (
  user_org_access(auth.uid(), org_id, ARRAY['owner', 'superadmin', 'admin']::user_role[])
);

CREATE POLICY "service_all_usage_tracking"
ON public.settings_usage_tracking FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- NOTES
-- ============================================================================
-- 
-- 1. All user settings (profile, security, notifications) are personal
-- 2. Organization settings require appropriate org-level capabilities
-- 3. Security audit log is accessible based on role capabilities
-- 4. Sessions are tracked for security monitoring
-- 5. Team settings control invitation and collaboration workflows
-- 6. Usage tracking enables subscription-based feature gating
-- 7. All tables have RLS enabled with appropriate policies
-- 8. Triggers auto-initialize settings for new users/orgs
-- 9. Helper functions simplify capability checks in application code
-- 10. Service role always has full access for backend operations
--
-- ============================================================================
