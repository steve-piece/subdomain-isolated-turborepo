# Critical: Update Custom Access Token Hook

## ⚠️ Required Dashboard Change

You need to update your Supabase Dashboard hook configuration to use the correct function name.

### Current Issue

Your hook is configured to use: `pg-functions://postgres/public/get_user_claims`
**This is incorrect** and causes the "output claims field is missing" error.

### ✅ Fix: Update Hook URL

1. Go to **Supabase Dashboard** → **Authentication** → **Hooks**
2. **Edit** the "Customize Access Token (JWT) Claims hook"
3. **Change URL** from:
   ```
   pg-functions://postgres/public/get_user_claims
   ```
   To:
   ```
   pg-functions://postgres/public/custom_access_token_hook
   ```
4. **Save** the changes

### Why This Fixes The Issue

According to [Supabase's official documentation](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook):

- **Function Signature**: Must be `function_name(event jsonb) RETURNS jsonb`
- **Event Format**: Contains `user_id`, `claims`, `authentication_method`
- **Return Format**: Must return the entire modified event object

### Expected Result

After updating the hook URL, user login should work and JWT will contain:

```json
{
  "user_role": "superadmin",
  "subdomain": "your-company",
  "tenant_id": "uuid-tenant-id",
  "org_id": "uuid-org-id"
}
```

### Testing the Auth Flow

#### 1. Create Test User

1. **Visit marketing site** signup page
2. **Create organization** with:
   - Organization name: "Test Company"
   - Subdomain: "test-company"
   - Your email and password
3. **Check email** for verification link
4. **Click verification link** to confirm email

#### 2. Test Login Flow

1. **Update hook URL** in Dashboard (critical step above)
2. **Test login** at `https://test-company.yourapp.com/auth/login`
3. **Verify success** - should redirect to dashboard
4. **Check JWT claims** contain the custom tenant data (use browser dev tools or jwt.io)

### Troubleshooting

If login still fails after updating the hook URL:

1. **Disable the hook temporarily** in Dashboard
2. **Test basic login** without custom claims
3. **Re-enable hook** once basic auth works
4. **Contact Supabase support** if issue persists

This should resolve the authentication issue completely!
