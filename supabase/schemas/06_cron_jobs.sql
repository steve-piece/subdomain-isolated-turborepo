-- ============================================================================
-- Cron Jobs Configuration
-- Generated: 2026-01-23
-- ============================================================================
-- This file contains pg_cron job definitions for scheduled tasks
-- 
-- Requirements:
-- - pg_cron extension must be enabled (see 00_extensions.sql)
-- - Jobs run with the postgres role by default
-- ============================================================================

-- Grant usage on cron schema to postgres (if needed)
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- ============================================================================
-- Cleanup Expired Subdomain Reservations
-- ============================================================================
-- This job runs daily at 2:00 AM UTC to clean up expired subdomain reservations
-- that were never confirmed. This prevents the reservations table from growing
-- indefinitely and ensures expired subdomains become available again.
--
-- Schedule: Daily at 2:00 AM UTC (cron: '0 2 * * *')
-- Function: cleanup_expired_reservations()
-- Expected Impact: Deletes reservations where expires_at < now() AND confirmed_at IS NULL
-- ============================================================================

-- Remove existing job if it exists (idempotent)
SELECT cron.unschedule('cleanup-expired-reservations')
WHERE EXISTS (
  SELECT 1
  FROM cron.job
  WHERE jobname = 'cleanup-expired-reservations'
);

-- Schedule the cleanup job to run daily at 2:00 AM UTC
SELECT cron.schedule(
  'cleanup-expired-reservations',          -- Job name
  '0 2 * * *',                             -- Cron schedule: Daily at 2:00 AM UTC
  $$SELECT public.cleanup_expired_reservations()$$  -- SQL command to execute
);

-- ============================================================================
-- Cron Job Monitoring
-- ============================================================================
-- To view scheduled jobs:
--   SELECT * FROM cron.job;
--
-- To view job run history:
--   SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
--
-- To manually run the cleanup job:
--   SELECT public.cleanup_expired_reservations();
--
-- To unschedule a job:
--   SELECT cron.unschedule('cleanup-expired-reservations');
--
-- To reschedule a job:
--   SELECT cron.unschedule('cleanup-expired-reservations');
--   SELECT cron.schedule('cleanup-expired-reservations', '0 2 * * *', $$...$$);
-- ============================================================================
