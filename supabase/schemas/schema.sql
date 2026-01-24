-- ============================================================================
-- Complete Database Schema
-- 
-- This file imports all schema components in the correct order
-- ============================================================================

\i 00_extensions.sql
\i 01_enums.sql
\i 02_tables.sql
\i 03_functions.sql
\i 04_views.sql
\i storage_buckets.sql
\i 05_rls_policies.sql
\i 06_cron_jobs.sql
\i seed_data.sql
