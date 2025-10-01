-- ============================================================================
-- Usage Metrics Table - Complete Documentation
-- ============================================================================
-- Migration: 20250103000001_usage_metrics_documentation
-- Purpose: Add comprehensive comments to usage_metrics table for API documentation
-- Dependencies:
--   - usage_metrics table exists
-- Impact: Adds COMMENT ON statements for Supabase auto-generated API documentation
-- Rollback: Comments are documentation only - no functional rollback needed
-- ============================================================================

BEGIN;

-- ============================================================================
-- USAGE_METRICS TABLE
-- ============================================================================

COMMENT ON TABLE public.usage_metrics IS 
'Real-time usage tracking for organizations across billing periods. Monitors current usage against tier limits for features like API calls, storage, team members. Used for quota enforcement and billing calculations.';

COMMENT ON COLUMN public.usage_metrics.id IS 
'Unique identifier for usage metric record';

COMMENT ON COLUMN public.usage_metrics.org_id IS 
'Organization this usage metric belongs to - references organizations.id';

COMMENT ON COLUMN public.usage_metrics.metric_name IS 
'Feature or resource being tracked (e.g., api_calls, storage_gb, team_members, projects_count)';

COMMENT ON COLUMN public.usage_metrics.current_value IS 
'Current usage count/value for this metric in the current period';

COMMENT ON COLUMN public.usage_metrics.limit_value IS 
'Maximum allowed value for this metric based on subscription tier - NULL means unlimited';

COMMENT ON COLUMN public.usage_metrics.period_start IS 
'Start of tracking period - typically aligns with subscription billing cycle start';

COMMENT ON COLUMN public.usage_metrics.period_end IS 
'End of tracking period - NULL means ongoing/until subscription period ends';

COMMENT ON COLUMN public.usage_metrics.created_at IS 
'Timestamp when metric tracking was initialized for this period';

COMMENT ON COLUMN public.usage_metrics.updated_at IS 
'Timestamp when metric value was last incremented/updated';

-- ============================================================================
-- Migration Completion
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Migration 20250103000001_usage_metrics_documentation completed successfully';
    RAISE NOTICE 'Added comprehensive documentation to usage_metrics table';
    RAISE NOTICE 'Table and all 9 columns now documented per @sql-testing standards';
END $$;

COMMIT;

-- ============================================================================
-- @sql-testing Compliance Checklist
-- ============================================================================
/*
✅ Transaction Management
  - Wrapped in BEGIN/COMMIT
  - Idempotent (comments can be re-applied)
  - Safe to run multiple times

✅ Documentation (REQUIRED)
  - Table has COMMENT ON TABLE
  - All 9 columns have COMMENT ON COLUMN
  - Comments describe purpose, format, and usage
  - Explains relationship to billing and quotas

✅ Security
  - Comments-only migration (no security impact)
  - No RLS policies changed
  - No permissions modified

✅ Performance
  - Zero performance impact
  - No indexes added/modified
  - Documentation only

✅ Integration
  - Completes billing/subscription documentation suite
  - Enables Supabase auto-generated API docs
  - Improves developer experience
*/

