-- ============================================================================
-- Initialize Organization Capabilities System
-- ============================================================================
-- This migration:
-- 1. Creates a function to initialize org capabilities from role defaults
-- 2. Initializes capabilities for existing organizations
-- 3. Adds a trigger to auto-initialize capabilities for new organizations
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. CREATE FUNCTION: Initialize organization capabilities from defaults
-- ============================================================================

CREATE OR REPLACE FUNCTION public.initialize_org_capabilities(p_org_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Validate input
  IF p_org_id IS NULL THEN
    RAISE EXCEPTION 'Organization ID cannot be NULL';
  END IF;

  -- Check if organization exists
  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = p_org_id) THEN
    RAISE EXCEPTION 'Organization % does not exist', p_org_id;
  END IF;

  -- Check if already initialized (don't duplicate)
  SELECT COUNT(*) INTO v_count
  FROM public.org_role_capabilities
  WHERE org_id = p_org_id;

  IF v_count > 0 THEN
    RAISE NOTICE 'Organization % already has % capabilities initialized', p_org_id, v_count;
    RETURN;
  END IF;

  -- Copy default role capabilities to org_role_capabilities
  INSERT INTO public.org_role_capabilities (
    org_id,
    role,
    capability_id,
    granted,
    requires_min_tier_id
  )
  SELECT
    p_org_id,
    rc.role,
    rc.capability_id,
    rc.is_default, -- Copy default granted status
    c.requires_tier_id
  FROM public.role_capabilities rc
  INNER JOIN public.capabilities c ON c.id = rc.capability_id
  WHERE rc.is_default = true; -- Only copy defaults

  -- Get count of initialized capabilities
  SELECT COUNT(*) INTO v_count
  FROM public.org_role_capabilities
  WHERE org_id = p_org_id;

  RAISE NOTICE 'Initialized % capabilities for organization %', v_count, p_org_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to initialize capabilities for org %: %', p_org_id, SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.initialize_org_capabilities(UUID) IS 
'Initializes organization-specific role capabilities from system defaults. Called when creating new organizations.';

-- ============================================================================
-- 2. CREATE TRIGGER: Auto-initialize capabilities for new organizations
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trigger_initialize_org_capabilities()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Initialize capabilities for the new organization
  PERFORM public.initialize_org_capabilities(NEW.id);
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block organization creation
    RAISE WARNING 'Failed to auto-initialize capabilities for org %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_initialize_org_capabilities ON public.organizations;

CREATE TRIGGER trigger_auto_initialize_org_capabilities
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_initialize_org_capabilities();

COMMENT ON TRIGGER trigger_auto_initialize_org_capabilities ON public.organizations IS
'Automatically initializes role capabilities for new organizations from system defaults';

-- ============================================================================
-- 3. INITIALIZE CAPABILITIES FOR EXISTING ORGANIZATIONS
-- ============================================================================

DO $$
DECLARE
  org_record RECORD;
  total_orgs INTEGER := 0;
  initialized_orgs INTEGER := 0;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Initializing capabilities for existing organizations...';
  RAISE NOTICE '========================================';

  -- Count total organizations
  SELECT COUNT(*) INTO total_orgs FROM public.organizations;
  RAISE NOTICE 'Found % organizations', total_orgs;

  -- Initialize capabilities for each organization
  FOR org_record IN 
    SELECT id, company_name 
    FROM public.organizations
    ORDER BY created_at
  LOOP
    BEGIN
      PERFORM public.initialize_org_capabilities(org_record.id);
      initialized_orgs := initialized_orgs + 1;
      RAISE NOTICE '✓ Initialized: % (%)', org_record.company_name, org_record.id;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING '✗ Failed for % (%): %', org_record.company_name, org_record.id, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Initialization complete: %/% organizations', initialized_orgs, total_orgs;
  RAISE NOTICE '========================================';
END;
$$;

-- ============================================================================
-- 4. VERIFICATION QUERY
-- ============================================================================

DO $$
DECLARE
  v_orgs INTEGER;
  v_capabilities INTEGER;
  v_org_caps INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_orgs FROM public.organizations;
  SELECT COUNT(*) INTO v_capabilities FROM public.capabilities;
  SELECT COUNT(*) INTO v_org_caps FROM public.org_role_capabilities;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICATION SUMMARY';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total Organizations: %', v_orgs;
  RAISE NOTICE 'Total Capabilities: %', v_capabilities;
  RAISE NOTICE 'Org-Role Mappings: %', v_org_caps;
  RAISE NOTICE '========================================';
END;
$$;

COMMIT;

-- ============================================================================
-- ROLLBACK SCRIPT (for reference, run separately if needed)
-- ============================================================================
/*
BEGIN;

-- Remove trigger
DROP TRIGGER IF EXISTS trigger_auto_initialize_org_capabilities ON public.organizations;
DROP FUNCTION IF EXISTS public.trigger_initialize_org_capabilities();

-- Remove function
DROP FUNCTION IF EXISTS public.initialize_org_capabilities(UUID);

-- Optionally clear org_role_capabilities (WARNING: This removes all org-specific capability settings)
-- DELETE FROM public.org_role_capabilities;

COMMIT;
*/

