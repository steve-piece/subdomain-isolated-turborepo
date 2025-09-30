# Database Migration Guide

## 🚀 Quick Start

### Step 1: Get Your Supabase Connection String

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **Database**
3. Copy the **Connection string** (Transaction mode recommended)
4. Replace `[YOUR-PASSWORD]` with your database password

### Step 2: Run Migrations

```bash
cd /Users/splmbp3/projects/subdomain-isolated-turborepo

# Apply schema
psql "postgresql://postgres:[PASSWORD]@db.qnbqrlpvokzgtfevnuzv.supabase.co:5432/postgres" \
  -f docs/rbac-settings/SETTINGS_DATABASE_SCHEMA.sql

# Seed data
psql "postgresql://postgres:[PASSWORD]@db.qnbqrlpvokzgtfevnuzv.supabase.co:5432/postgres" \
  -f docs/rbac-settings/SEED_CAPABILITIES.sql
```

### Step 3: Verify

```bash
psql "postgresql://postgres:[PASSWORD]@..." \
  -c "SELECT COUNT(*) FROM public.capabilities;"  # Should return 32
```

## 🧪 Testing

1. Start dev server: `pnpm run dev`
2. Create Business tier test org (see SQL below)
3. Navigate to `http://testbiz.localhost:3003/org-settings/roles`
4. Toggle capabilities and verify they save

## 📋 Create Test Organization

```sql
-- Get Business tier ID
SELECT id FROM public.subscription_tiers WHERE name = 'business';

-- Create test org
INSERT INTO public.organizations (id, company_name, subdomain)
VALUES (gen_random_uuid(), 'Test Business', 'testbiz')
RETURNING id;

-- Create subscription (replace IDs)
INSERT INTO public.subscriptions (org_id, tier_id, status)
VALUES ('<org_id>', '<tier_id>', 'active');

-- Add yourself as owner (replace with your auth.users.id)
INSERT INTO public.user_profiles (user_id, org_id, role, email)
VALUES ('<user_id>', '<org_id>', 'owner', 'your@email.com');
```

## ✅ Success Criteria

- [ ] 32 capabilities seeded
- [ ] 120+ role mappings created  
- [ ] Can access `/org-settings/roles` as owner
- [ ] Can toggle capabilities
- [ ] Custom overrides save to database
- [ ] Sidebar updates based on permissions
- [ ] Non-Business tier shows upgrade prompt

See `docs/rbac-settings/` for complete documentation.
