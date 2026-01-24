-- ============================================================================
-- Views
-- Generated: 2026-01-21T10:30:00.000Z
-- Source: https://qnbqrlpvokzgtfevnuzv.supabase.co
-- ============================================================================

-- View: org_entitlements
CREATE OR REPLACE VIEW public.org_entitlements
WITH (security_invoker = on) AS
SELECT s.org_id,
       fl.feature_key,
       fl.limit_per_period
FROM subscriptions s
JOIN feature_limits fl ON fl.tier_id = s.tier_id
WHERE s.status = ANY (ARRAY['active'::text, 'trialing'::text])
  AND now() >= s.period_start
  AND now() < s.period_end;

-- View: tenants_public
-- IMPORTANT: Do NOT ADD SECURITY_INVOKER = ON TO THIS VIEW or CUSTOMERS WONT BE ABLE TO BE FOUND IN THE `{MARKETING_APP_DOMAIN}/login` PAGE
CREATE OR REPLACE VIEW public.tenants_public as 
    SELECT company_name,
        subdomain,
        logo_url
    FROM organizations;
