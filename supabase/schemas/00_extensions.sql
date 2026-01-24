-- ============================================================================
-- Database Extensions
-- Generated: 2026-01-21T10:30:00.000Z
-- Source: https://qnbqrlpvokzgtfevnuzv.supabase.co
-- ============================================================================

-- Extensions installed in the database
CREATE EXTENSION IF NOT EXISTS "address_standardizer" WITH SCHEMA "extensions" VERSION "3.3.7";
CREATE EXTENSION IF NOT EXISTS "hypopg" WITH SCHEMA "extensions" VERSION "1.4.1";
CREATE EXTENSION IF NOT EXISTS "index_advisor" WITH SCHEMA "extensions" VERSION "0.2.0";
CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql" VERSION "1.5.11";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions" VERSION "1.11";
CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "extensions" VERSION "1.6";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions" VERSION "1.3";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault" VERSION "0.3.1";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions" VERSION "1.1";
CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "extensions" VERSION "0.8.0";
