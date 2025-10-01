# Authentication Setup

Complete guide for configuring authentication with Supabase UI components and custom claims.

## Supabase UI Components

This project leverages the **Supabase UI component library** - a flexible, open-source, React-based UI component library built on shadcn/ui, designed to simplify Supabase-powered projects with pre-built Auth, Storage, and Realtime features.

### Authentication Foundation

The authentication system is built using Supabase's password-based auth registry:

```bash
npx shadcn@latest add https://supabase.com/ui/r/password-based-auth-nextjs.json
```

This provides:

- 🔐 **Pre-built Auth Components**: Login, signup, password reset forms
- 🎨 **Consistent Design**: Built on shadcn/ui design system
- 🔧 **Extensible**: Modify and extend components as needed
- 🏗️ **Composable**: Modular structure for easy integration
- 🚀 **Production Ready**: Scaffolding for complex auth flows

Learn more about the Supabase UI component library at [supabase.com/ui](https://supabase.com/ui/docs/getting-started/introduction).

## Email Verification Setup

For email verification with subdomain routing to work properly, you need to configure your Supabase Dashboard.

### Step 1: Configure Email Templates

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Email Templates**
3. Configure the following templates:

**Confirm Signup Template:**

```html
<h2>Confirm your signup</h2>
<p>
  Follow this link to confirm your user:
  <a href="{{ .ConfirmationURL }}">Confirm your email</a>
</p>
```

**Magic Link Template:**

```html
<h2>Magic Link</h2>
<p>Follow this link to login: <a href="{{ .ConfirmationURL }}">Log In</a></p>
```

### Step 2: Configure Site URL

1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL** to your production domain
3. Add **Redirect URLs** for each environment:
   - Development: `http://localhost:3002`, `http://localhost:3003`
   - Production: `https://yourdomain.com`, `https://app.yourdomain.com`

### Step 3: Configure Email Settings

1. Go to **Authentication** → **Settings**
2. Enable **Enable email confirmations**
3. Configure your email provider (SMTP or use Supabase's default)

## Custom Claims Configuration

For multi-tenant JWT claims to work properly, you need to configure custom claims in your Supabase Dashboard.

### Step 1: Create Custom Claims Hook

1. Go to **Database** → **Functions**
2. Create a new function called `custom_access_token_hook`
3. Add the following SQL:

```sql
CREATE OR REPLACE FUNCTION custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  claims jsonb;
  user_profile record;
BEGIN
  -- Get user profile with organization info
  SELECT
    up.id,
    up.role,
    up.tenant_id,
    t.subdomain,
    o.id as org_id,
    o.name as org_name
  INTO user_profile
  FROM user_profiles up
  JOIN tenants t ON up.tenant_id = t.id
  JOIN organizations o ON t.org_id = o.id
  WHERE up.user_id = (event->>'user_id')::uuid;

  -- Build custom claims
  claims := jsonb_build_object(
    'subdomain', user_profile.subdomain,
    'role', user_profile.role,
    'org_id', user_profile.org_id,
    'org_name', user_profile.org_name,
    'tenant_id', user_profile.tenant_id
  );

  -- Add claims to the event
  event := jsonb_set(event, '{claims}', claims);

  RETURN event;
END;
$$;
```

### Step 2: Configure Auth Hook

1. Go to **Authentication** → **Hooks**
2. Create a new hook:
   - **Hook Type**: `access_token`
   - **Function**: `custom_access_token_hook`
   - **Enable**: `true`

### Step 3: Test Custom Claims

```typescript
// In your application
const {
  data: { session },
} = await supabase.auth.getSession();
const claims = session?.user?.user_metadata;

console.log("Custom claims:", {
  subdomain: claims.subdomain,
  role: claims.role,
  orgId: claims.org_id,
  orgName: claims.org_name,
});
```

## Multi-Tenant Authentication Flow

### Authentication Patterns

- Prefer `supabase.auth.getClaims()` for tenant checks; `getUser()` is deprecated.
- Validate `claims.claims.subdomain === params.subdomain`; otherwise redirect to `/auth/login`.

### Session Management

```typescript
// Check if user has access to current subdomain
export async function validateSubdomainAccess(subdomain: string) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/auth/login");
  }

  const claims = session.user.user_metadata;

  if (claims.subdomain !== subdomain) {
    redirect("/auth/login");
  }

  return claims;
}
```

### Role-Based Access Control

```typescript
// Check user role and capabilities
export async function checkUserPermission(
  subdomain: string,
  requiredCapability: string
) {
  const claims = await validateSubdomainAccess(subdomain);

  // Check role hierarchy
  const roleHierarchy = ["view-only", "member", "admin", "owner", "superadmin"];
  const userRoleIndex = roleHierarchy.indexOf(claims.role);

  // Implement capability checking logic
  // This would typically query the database for user capabilities

  return true; // or false based on capability check
}
```

## Security Considerations

### Row Level Security (RLS)

Ensure all database tables have proper RLS policies:

```sql
-- Example RLS policy for user_profiles
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);
```

### Session Security

- Implement session timeout
- Use secure cookies
- Validate sessions on each request
- Log security events

### Multi-Factor Authentication (MFA)

```typescript
// Enable MFA for users
export async function enableMFA(userId: string) {
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
  });

  if (error) throw error;

  return data;
}
```

## Testing Authentication

### Unit Tests

```typescript
describe("Authentication", () => {
  test("should validate subdomain access", async () => {
    const result = await validateSubdomainAccess("test-company");
    expect(result.subdomain).toBe("test-company");
  });

  test("should redirect on invalid subdomain", async () => {
    await expect(validateSubdomainAccess("wrong-company")).rejects.toThrow();
  });
});
```

### Integration Tests

```typescript
describe("Auth Flow", () => {
  test("should complete login flow", async () => {
    // Test complete authentication flow
    const user = await signInUser("test@example.com", "password");
    expect(user.session).toBeDefined();
    expect(user.user.user_metadata.subdomain).toBeDefined();
  });
});
```

## Troubleshooting

### Common Issues

1. **Custom claims not appearing**: Check hook configuration
2. **Subdomain validation failing**: Verify claims structure
3. **Session not persisting**: Check cookie settings
4. **MFA not working**: Verify TOTP setup

### Debug Mode

```typescript
// Enable debug logging
const supabase = createClient(url, key, {
  auth: {
    debug: true
  }
  }
});
```

## Next Steps

1. **Configure Email Templates**: Set up custom email templates
2. **Set up MFA**: Enable multi-factor authentication
3. **Configure RLS**: Set up row-level security policies
4. **Test Authentication**: Run authentication tests
