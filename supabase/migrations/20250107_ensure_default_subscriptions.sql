-- ==========================================
-- Migration: Ensure Default Free Subscriptions
-- ==========================================
-- Name: 20250107_ensure_default_subscriptions
-- Version: 1.0.0
-- Author: System
-- Date: 2025-01-07
-- Description: Creates default Free tier subscriptions for all organizations without subscriptions
-- Dependencies: organizations, subscriptions, subscription_tiers tables
-- Impact: Inserts new subscription records for orgs without any
-- Risk Assessment: LOW - only creates missing subscriptions, doesn't modify existing data
-- Rollback Plan: Delete subscriptions created by this migration (see rollback section)
-- Post-Migration Actions: Verify ACME and other orgs have subscriptions
-- ==========================================

BEGIN;

SET statement_timeout = '60s';

RAISE NOTICE '========================================';
RAISE NOTICE 'Starting default subscription creation...';
RAISE NOTICE '========================================';

-- ==========================================
-- Phase 1: Create Default Free Subscriptions
-- ==========================================

DO $$
DECLARE
  v_free_tier_id UUID;
  v_orgs_without_subscription INTEGER;
  v_orgs_created INTEGER := 0;
  v_acme_org_id UUID := 'c999b342-b0ac-46a1-aa2c-d4cf72d19cac';
  v_acme_has_subscription BOOLEAN;
BEGIN
  RAISE NOTICE 'Phase 1: Creating default Free tier subscriptions...';

  -- Step 1: Get Free tier ID
  SELECT id INTO v_free_tier_id
  FROM subscription_tiers
  WHERE name = 'free'
  LIMIT 1;

  IF v_free_tier_id IS NULL THEN
    RAISE EXCEPTION 'Free tier not found in subscription_tiers table'
      USING HINT = 'Run seed data migration first to create subscription tiers';
  END IF;

  RAISE NOTICE '✅ Free tier ID: %', v_free_tier_id;

  -- Step 2: Count organizations without subscriptions
  SELECT COUNT(*)
  INTO v_orgs_without_subscription
  FROM organizations o
  WHERE NOT EXISTS (
    SELECT 1 FROM subscriptions s WHERE s.org_id = o.id
  );

  RAISE NOTICE 'Found % organizations without subscriptions', v_orgs_without_subscription;

  IF v_orgs_without_subscription = 0 THEN
    RAISE NOTICE '✅ All organizations already have subscriptions';
  ELSE
    -- Step 3: Create default Free tier subscriptions
    INSERT INTO subscriptions (
      org_id,
      tier_id,
      status,
      period_start,
      period_end,
      current_period_start,
      current_period_end,
      billing_cycle,
      created_at,
      updated_at
    )
    SELECT 
      o.id,
      v_free_tier_id,
      'active',
      NOW(),
      NOW() + INTERVAL '1 year',
      NOW(),
      NOW() + INTERVAL '1 year',
      'yearly',
      NOW(),
      NOW()
    FROM organizations o
    WHERE NOT EXISTS (
      SELECT 1 FROM subscriptions s WHERE s.org_id = o.id
    );

    GET DIAGNOSTICS v_orgs_created = ROW_COUNT;

    RAISE NOTICE '✅ Created % default Free tier subscriptions', v_orgs_created;
  END IF;

  -- Step 4: Verify ACME specifically
  RAISE NOTICE '';
  RAISE NOTICE 'Verifying ACME organization...';
  
  -- Check if ACME exists
  IF EXISTS (SELECT 1 FROM organizations WHERE id = v_acme_org_id) THEN
    RAISE NOTICE '✅ ACME organization found (id: %)', v_acme_org_id;

    -- Check if ACME has a subscription
    SELECT EXISTS (
      SELECT 1 FROM subscriptions WHERE org_id = v_acme_org_id
    ) INTO v_acme_has_subscription;

    IF v_acme_has_subscription THEN
      RAISE NOTICE '✅ ACME now has a subscription';
      
      -- Show ACME's subscription details
      DECLARE
        v_acme_tier TEXT;
        v_acme_status TEXT;
      BEGIN
        SELECT st.name, s.status
        INTO v_acme_tier, v_acme_status
        FROM subscriptions s
        JOIN subscription_tiers st ON st.id = s.tier_id
        WHERE s.org_id = v_acme_org_id
        ORDER BY s.created_at DESC
        LIMIT 1;
        
        RAISE NOTICE '   - Tier: %', v_acme_tier;
        RAISE NOTICE '   - Status: %', v_acme_status;
      END;
    ELSE
      RAISE WARNING '⚠️  ACME still has no subscription! This should not happen.';
    END IF;
  ELSE
    RAISE WARNING '⚠️  ACME organization not found in database';
  END IF;

END $$;

-- ==========================================
-- Phase 2: Validation Report
-- ==========================================

DO $$
DECLARE
  v_total_orgs INTEGER;
  v_orgs_with_subs INTEGER;
  v_orgs_without_subs INTEGER;
  v_free_tier_count INTEGER;
  v_paid_tier_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Validation Report';
  RAISE NOTICE '========================================';

  -- Count total organizations
  SELECT COUNT(*) INTO v_total_orgs FROM organizations;
  RAISE NOTICE 'Total organizations: %', v_total_orgs;

  -- Count organizations with subscriptions
  SELECT COUNT(DISTINCT org_id) INTO v_orgs_with_subs FROM subscriptions;
  RAISE NOTICE 'Organizations with subscriptions: %', v_orgs_with_subs;

  -- Count organizations without subscriptions
  SELECT COUNT(*)
  INTO v_orgs_without_subs
  FROM organizations o
  WHERE NOT EXISTS (
    SELECT 1 FROM subscriptions s WHERE s.org_id = o.id
  );
  RAISE NOTICE 'Organizations without subscriptions: %', v_orgs_without_subs;

  -- Count by tier
  SELECT COUNT(DISTINCT s.org_id)
  INTO v_free_tier_count
  FROM subscriptions s
  JOIN subscription_tiers st ON st.id = s.tier_id
  WHERE st.name = 'free';
  RAISE NOTICE 'Organizations on Free tier: %', v_free_tier_count;

  SELECT COUNT(DISTINCT s.org_id)
  INTO v_paid_tier_count
  FROM subscriptions s
  JOIN subscription_tiers st ON st.id = s.tier_id
  WHERE st.name IN ('pro', 'business', 'enterprise');
  RAISE NOTICE 'Organizations on paid tiers: %', v_paid_tier_count;

  -- Final validation
  IF v_orgs_without_subs = 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '✅ SUCCESS: All organizations now have subscriptions!';
  ELSE
    RAISE WARNING '';
    RAISE WARNING '⚠️  WARNING: % organizations still without subscriptions', v_orgs_without_subs;
  END IF;

  RAISE NOTICE '========================================';
END $$;

-- ==========================================
-- Rollback Instructions (commented out)
-- ==========================================

-- To rollback this migration, run:
-- DELETE FROM subscriptions 
-- WHERE billing_cycle = 'yearly' 
--   AND status = 'active'
--   AND tier_id = (SELECT id FROM subscription_tiers WHERE name = 'free')
--   AND created_at >= '2025-01-07'::date
--   AND created_at < '2025-01-08'::date;

COMMIT;

RAISE NOTICE '';
RAISE NOTICE '✅ Migration complete: Default subscriptions ensured';
