# Supabase Custom Access Token Hook & Claims Guide

This guide consolidates the setup, configuration, and troubleshooting steps for Supabase's Custom Access Token (JWT) Claims hook used in this project.

## Required Dashboard Configuration

Go to Supabase Dashboard → Authentication → Hooks and configure:

- Hook Type: `Custom Access Token`
- Hook URL: `pg-functions://postgres/public/custom_access_token_hook`
- Status: `Enabled`

## Database Permissions (Critical)

Run these SQL commands in the Supabase SQL Editor to ensure the auth system can execute the hook function securely:

```sql
-- Grant access to function to supabase_auth_admin (required for custom claims hook)
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- Grant access to schema to supabase_auth_admin
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;

-- Revoke function permissions from authenticated, anon and public (security)
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;
```

Note: These permissions are already included in `database-setup.sql` for new installations.

## Function Contract & Expected Output

- Per Supabase docs, a Postgres function-based hook uses the signature `function_name(event jsonb) RETURNS jsonb` and receives an `event` object (e.g., `user_id`, `claims`, `authentication_method`). See the official documentation: [Supabase Custom Access Token Hook](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook).
- Our implementation returns a JSON object of claims to be merged into the JWT. Example returned claims:

```json
{
  "user_id": "uuid",
  "email": "user@example.com",
  "role": "admin",
  "subdomain": "company",
  "tenant_id": "uuid",
  "org_id": "uuid"
}
```

### Expected Result in JWT

After correct configuration, the issued JWT should include custom tenant data, for example:

```json
{
  "user_role": "owner",
  "subdomain": "your-company",
  "tenant_id": "uuid-tenant-id",
  "org_id": "uuid-org-id",
  "company_name": "Your Company Inc"
}
```

## Testing Steps

1. Verify the Postgres function works: execute `select public.custom_access_token_hook('{"user_id":"..."}'::jsonb);` in SQL Editor (adjust input as needed).
2. Configure the hook in the Dashboard as described above and ensure it is Enabled.
3. Test login via your tenant subdomain (clean URL), e.g., `https://company.${NEXT_PUBLIC_APP_DOMAIN}/auth/login`.
4. Inspect the JWT (browser dev tools or `jwt.io`) to confirm your custom claims are present, including `company_name`.
5. Monitor logs if any errors persist.

## End-to-End Auth Flow Test

1. Create a test organization via the marketing site signup.
   - Organization name: e.g., "Test Company"
   - Subdomain: e.g., "test-company"
   - Provide your email and password
2. Confirm the email using the verification link sent by Supabase.
3. Ensure the hook URL is set to `pg-functions://postgres/public/custom_access_token_hook`.
4. Log in at `https://test-company.${NEXT_PUBLIC_APP_DOMAIN}/auth/login`.
5. Verify successful redirect and that JWT contains the custom tenant claims.

## Troubleshooting

Current status checklist when things work:

- Function exists and returns claims (now also `company_name`)
- Hook is enabled in Dashboard
- Permissions are correctly granted to `supabase_auth_admin`
- Database relationships are correctly configured (user ↔ profile ↔ tenant)

If login returns a 500 error even after the above:

1. Temporarily disable the custom claims hook in Dashboard and test basic login.
2. If basic auth works, re-enable the hook.
3. Optionally, edit and re-save the hook in Dashboard to refresh configuration.
4. If issues persist, contact Supabase support with logs and function details.

## Next Steps / Checklist

1. Ensure the Dashboard hook URL is `pg-functions://postgres/public/custom_access_token_hook`.
2. Confirm database permissions are applied (or re-run the SQL block above).
3. Test basic login without the hook (to isolate issues), then re-enable the hook.
4. Validate JWT contains the expected custom claims.
