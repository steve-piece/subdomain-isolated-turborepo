-- ============================================================================
-- Get Organization Logo by Subdomain Function
-- ============================================================================
-- This function retrieves the logo URL for an organization based on subdomain.
-- It can be called without authentication, making it perfect for favicon/icon
-- routes that need to work before users log in.
--
-- Usage:
--   SELECT * FROM get_org_logo_by_subdomain('acme');
--   -- Returns: { logo_url: 'https://...', company_name: 'ACME' }
--
-- Or via RPC:
--   supabase.rpc('get_org_logo_by_subdomain', { p_subdomain: 'acme' })
-- ============================================================================

BEGIN;

-- Drop function if exists (for clean redeployment)
DROP FUNCTION IF EXISTS public.get_org_logo_by_subdomain(text);

-- Create the function
CREATE OR REPLACE FUNCTION public.get_org_logo_by_subdomain(
  p_subdomain text
)
RETURNS TABLE (
  logo_url text,
  company_name text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate input
  IF p_subdomain IS NULL OR trim(p_subdomain) = '' THEN
    RAISE NOTICE 'get_org_logo_by_subdomain: subdomain parameter is required';
    RETURN QUERY SELECT 
      ''::text as logo_url,
      ''::text as company_name;
    RETURN;
  END IF;

  -- Log the request (helpful for debugging)
  RAISE NOTICE 'get_org_logo_by_subdomain: Fetching logo for subdomain: %', p_subdomain;

  -- Query the organizations table
  RETURN QUERY
  SELECT 
    COALESCE(o.logo_url, '')::text as logo_url,
    COALESCE(o.company_name, '')::text as company_name
  FROM public.organizations o
  WHERE o.subdomain = lower(trim(p_subdomain))
  LIMIT 1;

  -- If no rows found, return empty strings
  IF NOT FOUND THEN
    RAISE NOTICE 'get_org_logo_by_subdomain: No organization found for subdomain: %', p_subdomain;
    RETURN QUERY SELECT 
      ''::text as logo_url,
      ''::text as company_name;
  END IF;

  RETURN;

EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return empty result
    RAISE WARNING 'get_org_logo_by_subdomain: Error for subdomain %: %', p_subdomain, SQLERRM;
    RETURN QUERY SELECT 
      ''::text as logo_url,
      ''::text as company_name;
    RETURN;
END;
$$;

-- ============================================================================
-- Permissions
-- ============================================================================
-- This function needs to be callable without authentication for favicon routes
-- Grant to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.get_org_logo_by_subdomain(text) TO anon, authenticated;

-- ============================================================================
-- Documentation
-- ============================================================================
COMMENT ON FUNCTION public.get_org_logo_by_subdomain(text) IS 
'Retrieves organization logo URL and company name by subdomain. 
Returns empty strings if organization not found or has no logo.
Can be called without authentication, making it suitable for public favicon routes.

Example:
  SELECT * FROM get_org_logo_by_subdomain(''acme'');
  -- Returns: { logo_url: ''https://...'', company_name: ''ACME'' }

Returns:
  - logo_url: Organization logo URL or empty string
  - company_name: Organization name or empty string';

-- ============================================================================
-- Performance Verification
-- ============================================================================
-- Verify that the required index exists for optimal performance
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'organizations' 
    AND indexname = 'idx_organizations_subdomain'
  ) THEN
    RAISE NOTICE 'Creating index on organizations.subdomain for optimal performance';
    CREATE INDEX idx_organizations_subdomain ON public.organizations(subdomain);
  ELSE
    RAISE NOTICE 'Index idx_organizations_subdomain already exists';
  END IF;
END $$;

-- ============================================================================
-- Migration Completion
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Migration completed successfully: get_org_logo_by_subdomain function created';
  RAISE NOTICE 'Function can be called via: SELECT * FROM get_org_logo_by_subdomain(''subdomain'')';
  RAISE NOTICE 'Or via RPC: supabase.rpc(''get_org_logo_by_subdomain'', { p_subdomain: ''subdomain'' })';
END $$;

COMMIT;

-- ============================================================================
-- Rollback Script (keep for reference)
-- ============================================================================
-- To rollback this migration:
-- DROP FUNCTION IF EXISTS public.get_org_logo_by_subdomain(text);

