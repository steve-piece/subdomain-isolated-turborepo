-- ============================================================================
-- Row Level Security Policies
-- Generated: 2026-01-21T10:30:00.000Z
-- ============================================================================

-- Enable RLS on all tables that have policies
-- Note: RLS must be enabled before policies are created

-- ============================================================================
-- CAPABILITIES
-- ============================================================================
CREATE POLICY "manage_capabilities" ON public.capabilities FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "select_capabilities" ON public.capabilities FOR SELECT TO authenticated USING (true);
CREATE POLICY "service_all_capabilities" ON public.capabilities FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- CUSTOMER_BILLING_PROFILES
-- ============================================================================
DROP POLICY IF EXISTS "manage_customer_billing_profiles" ON public.customer_billing_profiles;
CREATE POLICY "manage_customer_billing_profiles" ON public.customer_billing_profiles FOR ALL TO authenticated USING (user_org_access((select auth.uid()), org_id, ARRAY['owner'::user_role, 'admin'::user_role])) WITH CHECK (user_org_access((select auth.uid()), org_id, ARRAY['owner'::user_role, 'admin'::user_role]));

DROP POLICY IF EXISTS "select_customer_billing_profiles" ON public.customer_billing_profiles;
CREATE POLICY "select_customer_billing_profiles" ON public.customer_billing_profiles FOR SELECT TO authenticated USING (user_org_access((select auth.uid()), org_id));

DROP POLICY IF EXISTS "service_all_customer_billing_profiles" ON public.customer_billing_profiles;
CREATE POLICY "service_all_customer_billing_profiles" ON public.customer_billing_profiles FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- FEATURE_LIMITS
-- ============================================================================
DROP POLICY IF EXISTS "select_feature_limits" ON public.feature_limits;
CREATE POLICY "select_feature_limits" ON public.feature_limits FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "service_all_feature_limits" ON public.feature_limits;
CREATE POLICY "service_all_feature_limits" ON public.feature_limits FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- INVOICES
-- ============================================================================
DROP POLICY IF EXISTS "select_invoices" ON public.invoices;
CREATE POLICY "select_invoices" ON public.invoices FOR SELECT TO authenticated USING (user_org_access((select auth.uid()), org_id, ARRAY['owner'::user_role, 'admin'::user_role]));

DROP POLICY IF EXISTS "service_all_invoices" ON public.invoices;
CREATE POLICY "service_all_invoices" ON public.invoices FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- ORG_ROLE_CAPABILITIES
-- ============================================================================
DROP POLICY IF EXISTS "manage_org_role_capabilities" ON public.org_role_capabilities;
CREATE POLICY "manage_org_role_capabilities" ON public.org_role_capabilities FOR ALL TO authenticated USING (user_org_access(( SELECT auth.uid() AS uid), org_id, ARRAY['owner'::user_role])) WITH CHECK (user_org_access(( SELECT auth.uid() AS uid), org_id, ARRAY['owner'::user_role]));

DROP POLICY IF EXISTS "select_org_role_capabilities" ON public.org_role_capabilities;
CREATE POLICY "select_org_role_capabilities" ON public.org_role_capabilities FOR SELECT TO authenticated USING (user_org_access(( SELECT auth.uid() AS uid), org_id));

DROP POLICY IF EXISTS "service_all_org_role_capabilities" ON public.org_role_capabilities;
CREATE POLICY "service_all_org_role_capabilities" ON public.org_role_capabilities FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- ORGANIZATION_TEAM_SETTINGS
-- ============================================================================
DROP POLICY IF EXISTS "manage_org_team_settings" ON public.organization_team_settings;
CREATE POLICY "manage_org_team_settings" ON public.organization_team_settings FOR ALL TO authenticated USING (user_org_access((select auth.uid()), org_id, ARRAY['owner'::user_role, 'superadmin'::user_role, 'admin'::user_role])) WITH CHECK (user_org_access((select auth.uid()), org_id, ARRAY['owner'::user_role, 'superadmin'::user_role, 'admin'::user_role]));

DROP POLICY IF EXISTS "select_org_team_settings" ON public.organization_team_settings;
CREATE POLICY "select_org_team_settings" ON public.organization_team_settings FOR SELECT TO authenticated USING (user_org_access((select auth.uid()), org_id));

DROP POLICY IF EXISTS "service_all_team_settings" ON public.organization_team_settings;
CREATE POLICY "service_all_team_settings" ON public.organization_team_settings FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- ORGANIZATIONS
-- ============================================================================
DROP POLICY IF EXISTS "delete_organizations" ON public.organizations;
CREATE POLICY "delete_organizations" ON public.organizations FOR DELETE TO authenticated USING ((owner_id = ( SELECT auth.uid() AS uid)));

DROP POLICY IF EXISTS "insert_organizations" ON public.organizations;
CREATE POLICY "insert_organizations" ON public.organizations FOR INSERT TO authenticated WITH CHECK ((owner_id = ( SELECT auth.uid() AS uid)));

DROP POLICY IF EXISTS "select_organizations" ON public.organizations;
CREATE POLICY "select_organizations" ON public.organizations FOR SELECT TO authenticated USING (user_org_access(( SELECT auth.uid() AS uid), id));

DROP POLICY IF EXISTS "service_all_organizations" ON public.organizations;
CREATE POLICY "service_all_organizations" ON public.organizations FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "update_organizations" ON public.organizations;
CREATE POLICY "update_organizations" ON public.organizations FOR UPDATE TO authenticated USING (user_org_access(( SELECT auth.uid() AS uid), id, ARRAY['owner'::user_role, 'superadmin'::user_role, 'admin'::user_role])) WITH CHECK (user_org_access(( SELECT auth.uid() AS uid), id, ARRAY['owner'::user_role, 'superadmin'::user_role, 'admin'::user_role]));

-- ============================================================================
-- PAYMENT_METHODS
-- ============================================================================
DROP POLICY IF EXISTS "select_payment_methods" ON public.payment_methods;
CREATE POLICY "select_payment_methods" ON public.payment_methods FOR SELECT TO authenticated USING (user_org_access((select auth.uid()), org_id, ARRAY['owner'::user_role, 'admin'::user_role]));

DROP POLICY IF EXISTS "service_all_payment_methods" ON public.payment_methods;
CREATE POLICY "service_all_payment_methods" ON public.payment_methods FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- PENDING_INVITATIONS
-- ============================================================================
ALTER TABLE public.pending_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage pending invitations" ON public.pending_invitations;
CREATE POLICY "Admins can manage pending invitations" ON public.pending_invitations FOR UPDATE TO public USING ((org_id IN ( SELECT user_profiles.org_id
   FROM user_profiles
  WHERE ((user_profiles.user_id = (select auth.uid())) AND (user_profiles.role = ANY (ARRAY['owner'::user_role, 'admin'::user_role, 'superadmin'::user_role]))))));

DROP POLICY IF EXISTS "Users can create invitations" ON public.pending_invitations;
CREATE POLICY "Users can create invitations" ON public.pending_invitations FOR INSERT TO public WITH CHECK ((org_id IN ( SELECT user_profiles.org_id
   FROM user_profiles
  WHERE (user_profiles.user_id = (select auth.uid())))));

DROP POLICY IF EXISTS "Users can view org pending invitations" ON public.pending_invitations;
CREATE POLICY "Users can view org pending invitations" ON public.pending_invitations FOR SELECT TO public USING ((org_id IN ( SELECT user_profiles.org_id
   FROM user_profiles
  WHERE ((user_profiles.user_id = (select auth.uid())) AND (user_profiles.role = ANY (ARRAY['owner'::user_role, 'admin'::user_role, 'superadmin'::user_role]))))));

-- ============================================================================
-- PROJECT_PERMISSIONS
-- ============================================================================
DROP POLICY IF EXISTS "manage_project_permissions" ON public.project_permissions;
CREATE POLICY "manage_project_permissions" ON public.project_permissions FOR ALL TO authenticated USING (((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_permissions.project_id) AND (p.owner_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM (projects p
     JOIN user_profiles up ON ((up.org_id = p.org_id)))
  WHERE ((p.id = project_permissions.project_id) AND (up.user_id = ( SELECT auth.uid() AS uid)) AND (up.role = ANY (ARRAY['owner'::user_role, 'admin'::user_role, 'superadmin'::user_role]))))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM projects p
  WHERE ((p.id = project_permissions.project_id) AND (p.owner_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM (projects p
     JOIN user_profiles up ON ((up.org_id = p.org_id)))
  WHERE ((p.id = project_permissions.project_id) AND (up.user_id = ( SELECT auth.uid() AS uid)) AND (up.role = ANY (ARRAY['owner'::user_role, 'admin'::user_role, 'superadmin'::user_role])))))));

DROP POLICY IF EXISTS "select_project_permissions" ON public.project_permissions;
CREATE POLICY "select_project_permissions" ON public.project_permissions FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (projects p
     JOIN user_profiles up ON ((up.org_id = p.org_id)))
  WHERE ((p.id = project_permissions.project_id) AND (up.user_id = ( SELECT auth.uid() AS uid))))));

DROP POLICY IF EXISTS "service_all_project_permissions" ON public.project_permissions;
CREATE POLICY "service_all_project_permissions" ON public.project_permissions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- PROJECTS
-- ============================================================================
DROP POLICY IF EXISTS "delete_projects" ON public.projects;
CREATE POLICY "delete_projects" ON public.projects FOR DELETE TO authenticated USING (((owner_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.user_id = ( SELECT auth.uid() AS uid)) AND (up.org_id = projects.org_id) AND (up.role = ANY (ARRAY['owner'::user_role, 'admin'::user_role, 'superadmin'::user_role])))))));

DROP POLICY IF EXISTS "insert_projects" ON public.projects;
CREATE POLICY "insert_projects" ON public.projects FOR INSERT TO authenticated WITH CHECK (((org_id IN ( SELECT up.org_id
   FROM user_profiles up
  WHERE (up.user_id = ( SELECT auth.uid() AS uid)))) AND (owner_id = ( SELECT auth.uid() AS uid))));

DROP POLICY IF EXISTS "select_projects" ON public.projects;
CREATE POLICY "select_projects" ON public.projects FOR SELECT TO authenticated USING ((org_id IN ( SELECT up.org_id
   FROM user_profiles up
  WHERE (up.user_id = ( SELECT auth.uid() AS uid)))));

DROP POLICY IF EXISTS "service_all_projects" ON public.projects;
CREATE POLICY "service_all_projects" ON public.projects FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "update_projects" ON public.projects;
CREATE POLICY "update_projects" ON public.projects FOR UPDATE TO authenticated USING (((owner_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.user_id = ( SELECT auth.uid() AS uid)) AND (up.org_id = projects.org_id) AND (up.role = ANY (ARRAY['owner'::user_role, 'admin'::user_role, 'superadmin'::user_role]))))))) WITH CHECK (((owner_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM user_profiles up
  WHERE ((up.user_id = ( SELECT auth.uid() AS uid)) AND (up.org_id = projects.org_id) AND (up.role = ANY (ARRAY['owner'::user_role, 'admin'::user_role, 'superadmin'::user_role])))))));

-- ============================================================================
-- SECURITY_AUDIT_LOG
-- ============================================================================
-- Drop old policy name if exists
DROP POLICY IF EXISTS "insert_audit_log" ON public.security_audit_log;

DROP POLICY IF EXISTS "insert_audit_log_authenticated" ON public.security_audit_log;
CREATE POLICY "insert_audit_log_authenticated" ON public.security_audit_log FOR INSERT TO authenticated WITH CHECK ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "insert_audit_log_anon" ON public.security_audit_log;
CREATE POLICY "insert_audit_log_anon" ON public.security_audit_log FOR INSERT TO anon WITH CHECK (user_id IS NULL);

DROP POLICY IF EXISTS "select_own_audit_log" ON public.security_audit_log;
CREATE POLICY "select_own_audit_log" ON public.security_audit_log FOR SELECT TO authenticated USING (((user_id = (select auth.uid())) OR ((org_id IS NOT NULL) AND user_org_capability((select auth.uid()), org_id, 'security.view_org_audit'::text))));

DROP POLICY IF EXISTS "service_all_audit_log" ON public.security_audit_log;
CREATE POLICY "service_all_audit_log" ON public.security_audit_log FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- STRIPE_WEBHOOK_EVENTS
-- ============================================================================
DROP POLICY IF EXISTS "service_all_stripe_webhook_events" ON public.stripe_webhook_events;
CREATE POLICY "service_all_stripe_webhook_events" ON public.stripe_webhook_events FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- SUBSCRIPTION_TIERS
-- ============================================================================
DROP POLICY IF EXISTS "select_subscription_tiers" ON public.subscription_tiers;
CREATE POLICY "select_subscription_tiers" ON public.subscription_tiers FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "service_all_subscription_tiers" ON public.subscription_tiers;
CREATE POLICY "service_all_subscription_tiers" ON public.subscription_tiers FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- SUBSCRIPTIONS
-- ============================================================================
DROP POLICY IF EXISTS "manage_subscriptions" ON public.subscriptions;
CREATE POLICY "manage_subscriptions" ON public.subscriptions FOR ALL TO authenticated USING (user_org_access(( SELECT auth.uid() AS uid), org_id, ARRAY['owner'::user_role, 'superadmin'::user_role, 'admin'::user_role])) WITH CHECK (user_org_access(( SELECT auth.uid() AS uid), org_id, ARRAY['owner'::user_role, 'superadmin'::user_role, 'admin'::user_role]));

DROP POLICY IF EXISTS "select_subscriptions" ON public.subscriptions;
CREATE POLICY "select_subscriptions" ON public.subscriptions FOR SELECT TO authenticated USING (user_org_access(( SELECT auth.uid() AS uid), org_id));

DROP POLICY IF EXISTS "service_all_subscriptions" ON public.subscriptions;
CREATE POLICY "service_all_subscriptions" ON public.subscriptions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- TENANTS
-- ============================================================================
DROP POLICY IF EXISTS "delete_tenants" ON public.tenants;
CREATE POLICY "delete_tenants" ON public.tenants FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM organizations o
  WHERE ((o.id = tenants.id) AND (o.owner_id = ( SELECT auth.uid() AS uid))))));

DROP POLICY IF EXISTS "insert_tenants" ON public.tenants;
CREATE POLICY "insert_tenants" ON public.tenants FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM organizations o
  WHERE ((o.id = tenants.id) AND (o.owner_id = ( SELECT auth.uid() AS uid))))));

DROP POLICY IF EXISTS "select_tenants" ON public.tenants;
CREATE POLICY "select_tenants" ON public.tenants FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "service_all_tenants" ON public.tenants;
CREATE POLICY "service_all_tenants" ON public.tenants FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "update_tenants" ON public.tenants;
CREATE POLICY "update_tenants" ON public.tenants FOR UPDATE TO authenticated USING (user_org_access(( SELECT auth.uid() AS uid), id, ARRAY['owner'::user_role, 'superadmin'::user_role, 'admin'::user_role])) WITH CHECK (user_org_access(( SELECT auth.uid() AS uid), id, ARRAY['owner'::user_role, 'superadmin'::user_role, 'admin'::user_role]));

-- ============================================================================
-- USAGE_COUNTERS
-- ============================================================================
DROP POLICY IF EXISTS "manage_usage_counters" ON public.usage_counters;
CREATE POLICY "manage_usage_counters" ON public.usage_counters FOR ALL TO authenticated USING (user_org_access(( SELECT auth.uid() AS uid), org_id, ARRAY['owner'::user_role, 'superadmin'::user_role, 'admin'::user_role])) WITH CHECK (user_org_access(( SELECT auth.uid() AS uid), org_id, ARRAY['owner'::user_role, 'superadmin'::user_role, 'admin'::user_role]));

DROP POLICY IF EXISTS "select_usage_counters" ON public.usage_counters;
CREATE POLICY "select_usage_counters" ON public.usage_counters FOR SELECT TO authenticated USING (user_org_access(( SELECT auth.uid() AS uid), org_id));

DROP POLICY IF EXISTS "service_all_usage_counters" ON public.usage_counters;
CREATE POLICY "service_all_usage_counters" ON public.usage_counters FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- USAGE_METRICS
-- ============================================================================
DROP POLICY IF EXISTS "select_usage_metrics" ON public.usage_metrics;
CREATE POLICY "select_usage_metrics" ON public.usage_metrics FOR SELECT TO authenticated USING (user_org_access((select auth.uid()), org_id));

DROP POLICY IF EXISTS "service_all_usage_metrics" ON public.usage_metrics;
CREATE POLICY "service_all_usage_metrics" ON public.usage_metrics FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- USER_NOTIFICATION_PREFERENCES
-- ============================================================================
DROP POLICY IF EXISTS "insert_own_notification_prefs" ON public.user_notification_preferences;
CREATE POLICY "insert_own_notification_prefs" ON public.user_notification_preferences FOR INSERT TO authenticated WITH CHECK ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "select_own_notification_prefs" ON public.user_notification_preferences;
CREATE POLICY "select_own_notification_prefs" ON public.user_notification_preferences FOR SELECT TO authenticated USING ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "service_all_notification_prefs" ON public.user_notification_preferences;
CREATE POLICY "service_all_notification_prefs" ON public.user_notification_preferences FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "update_own_notification_prefs" ON public.user_notification_preferences;
CREATE POLICY "update_own_notification_prefs" ON public.user_notification_preferences FOR UPDATE TO authenticated USING ((user_id = (select auth.uid()))) WITH CHECK ((user_id = (select auth.uid())));

-- ============================================================================
-- USER_PROFILES
-- ============================================================================
DROP POLICY IF EXISTS "delete_user_profiles" ON public.user_profiles;
CREATE POLICY "delete_user_profiles" ON public.user_profiles FOR DELETE TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) OR ((org_id IS NOT NULL) AND user_org_access(( SELECT auth.uid() AS uid), org_id, ARRAY['owner'::user_role, 'superadmin'::user_role, 'admin'::user_role]))));

DROP POLICY IF EXISTS "insert_user_profiles" ON public.user_profiles;
CREATE POLICY "insert_user_profiles" ON public.user_profiles FOR INSERT TO authenticated WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

DROP POLICY IF EXISTS "select_user_profiles" ON public.user_profiles;
CREATE POLICY "select_user_profiles" ON public.user_profiles FOR SELECT TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) OR ((org_id IS NOT NULL) AND user_org_access(( SELECT auth.uid() AS uid), org_id))));

DROP POLICY IF EXISTS "service_all_user_profiles" ON public.user_profiles;
CREATE POLICY "service_all_user_profiles" ON public.user_profiles FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "update_user_profiles" ON public.user_profiles;
CREATE POLICY "update_user_profiles" ON public.user_profiles FOR UPDATE TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) OR ((org_id IS NOT NULL) AND user_org_access(( SELECT auth.uid() AS uid), org_id, ARRAY['owner'::user_role, 'superadmin'::user_role, 'admin'::user_role])))) WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) OR ((org_id IS NOT NULL) AND user_org_access(( SELECT auth.uid() AS uid), org_id, ARRAY['owner'::user_role, 'superadmin'::user_role, 'admin'::user_role]))));

-- ============================================================================
-- USER_SECURITY_SETTINGS
-- ============================================================================
DROP POLICY IF EXISTS "insert_own_security_settings" ON public.user_security_settings;
CREATE POLICY "insert_own_security_settings" ON public.user_security_settings FOR INSERT TO authenticated WITH CHECK ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "select_own_security_settings" ON public.user_security_settings;
CREATE POLICY "select_own_security_settings" ON public.user_security_settings FOR SELECT TO authenticated USING ((user_id = (select auth.uid())));

DROP POLICY IF EXISTS "service_all_security_settings" ON public.user_security_settings;
CREATE POLICY "service_all_security_settings" ON public.user_security_settings FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "update_own_security_settings" ON public.user_security_settings;
CREATE POLICY "update_own_security_settings" ON public.user_security_settings FOR UPDATE TO authenticated USING ((user_id = (select auth.uid()))) WITH CHECK ((user_id = (select auth.uid())));
