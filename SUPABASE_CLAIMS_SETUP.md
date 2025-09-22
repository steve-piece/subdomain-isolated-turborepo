# Custom Claims Hook Configuration

## Issue: "output claims field is missing"

This error occurs when the `custom_access_token_hook` function exists and is configured in the hook, but **lacks proper permissions** for Supabase Auth to execute it, or the hook URL is incorrect.

## Required Configuration

### 1. Dashboard Hook Configuration ✅

Go to **Supabase Dashboard** → **Authentication** → **Hooks**:

- **Hook Type**: `Custom Access Token`
- **Hook URL**: `pg-functions://postgres/public/custom_access_token_hook`
- **Status**: `Enabled`

> **Important**: You need to update the hook URL from `get_user_claims` to `custom_access_token_hook` to match the official Supabase documentation.

### 2. Critical: Function Permissions

**Execute these SQL commands** in your Supabase SQL Editor:

```sql
-- Grant access to function to supabase_auth_admin (required for custom claims hook)
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- Grant access to schema to supabase_auth_admin
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;

-- Revoke function permissions from authenticated, anon and public (security)
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;
```

> **Note**: These permissions are already included in the `database-setup.sql` script for new installations.

## What the Function Should Return

The `custom_access_token_hook` function must return a valid JSON object. Our function returns:

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

## Testing Steps

1. **Verify function works**: Test `custom_access_token_hook` directly in SQL Editor
2. **Configure hook**: Set up in Dashboard → Authentication → Hooks
3. **Test login**: Try authentication with the hook enabled
4. **Check logs**: Monitor for any additional errors

## Troubleshooting

### Current Status ✅

- **Function exists and works** → `custom_access_token_hook` returns comprehensive claims
- **Hook is configured** → Visible in Dashboard as enabled
- **Permissions granted** → `supabase_auth_admin` has execute access
- **Database relationships fixed** → User accounts properly linked

### If Login Still Returns 500 Error

**Temporary Solution**: Disable the custom claims hook to test basic login:

1. Go to **Supabase Dashboard** → **Authentication** → **Hooks**
2. **Disable** the "Customize Access Token (JWT) Claims hook"
3. **Test login** without custom claims
4. **Verify basic authentication works**
5. **Re-enable hook** once confirmed

**Alternative**: The hook configuration might need to be refreshed:

1. **Edit the hook** in Dashboard
2. **Save changes** to refresh the configuration
3. **Test login again**

## Next Steps

1. **Ensure the Hook URL in your Supabase Dashboard is `pg-functions://postgres/public/custom_access_token_hook`**
2. **Try disabling the hook temporarily** to isolate the issue
3. **Test basic login** without custom claims
4. **Re-enable hook** once basic auth is confirmed working
5. **Contact Supabase support** if issue persists
