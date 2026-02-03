# supabase/schemas/README.md
Database schema files for the multi-tenant SaaS platform. Run these SQL files in order to set up the complete database structure.

## Schema Files

Run these files in the exact order listed:

1. **00_extensions.sql** - PostgreSQL extensions (pg_cron, index_advisor, etc.)
2. **01_enums.sql** - Custom types and enums (invitation_status, user_role, etc.)
3. **02_tables.sql** - Core tables (organizations, tenants, users, subscriptions, etc.)
4. **03_functions.sql** - Database functions including JWT claims hook and utilities
5. **04_views.sql** - Database views for common queries
6. **05_rls_policies.sql** - Row Level Security policies for multi-tenant isolation
7. **06_cron_jobs.sql** - Scheduled jobs (renewal reminders, cleanup tasks)
8. **07_storage_buckets.sql** - S3 storage bucket configurations
9. **08_seed_data.sql** - Initial seed data (subscription tiers, etc.) - optional for development

## Setup Instructions

### Option A: Using Supabase SQL Editor (Recommended)

1. Navigate to **SQL Editor** in [Supabase Dashboard](https://app.supabase.com)
2. Create a new query for each file
3. Copy and paste the content from each file in order
4. Execute each query

### Option B: Using Supabase CLI

```bash
# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

## Key Schema Components

- **Multi-tenant isolation**: Organizations, tenants, and RLS policies ensure data separation
- **Authentication**: User profiles linked to Supabase Auth with JWT claims
- **Subscriptions**: Tiered subscription system (Free, Pro, Business, Enterprise)
- **Capabilities**: Role-based access control with granular permissions
- **Storage**: S3 buckets for files, avatars, and organization resources
- **Automation**: Cron jobs for subscription renewals and data cleanup
