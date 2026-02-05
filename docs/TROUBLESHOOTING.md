# docs/TROUBLESHOOTING.md
# Common issues and solutions for the multi-tenant SaaS platform.

# Troubleshooting Guide

This guide covers common issues you may encounter during setup and development.

---

## Subdomain Not Found

**Symptom**: Accessing `http://[company].localhost:3003` redirects to marketing site

**Solutions**:
- Verify the organization was created: Check `organizations` table in Supabase
- Check if organization is active: `is_active` should be `true`
- Verify subdomain exists in `tenants` table
- Check browser console for errors

---

## Email Not Sending

**Symptom**: No verification email received

**Solutions**:
- **Check Resend API key**: Verify it's set in both apps' `.env.local` files and Edge Function secrets
- **Check Edge Function logs**: Go to Supabase Dashboard → Edge Functions → Logs
- **Verify domain**: Ensure domain is verified in Resend (or use `onboarding@resend.dev` for testing)
- **Check spam folder**: Email might be filtered
- **Test Edge Function**: Use the Invoke button in Supabase Dashboard
- **Verify Auth Hook is enabled**: Go to Authentication → Auth Hooks and confirm the Send Email hook is configured

**Manual Email Verification** (workaround):

```sql
-- In Supabase SQL Editor
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email = 'your@email.com';

-- Bootstrap the organization manually
SELECT bootstrap_organization(
  (SELECT id FROM auth.users WHERE email = 'your@email.com'),
  'your-subdomain'
);
```

---

## Too Many Reset Requests

**Symptom**: "Too many reset requests. Please wait an hour and try again."

**Cause**: Supabase enforces a **2 emails/hour rate limit** on auth endpoints (`/auth/v1/signup`, `/auth/v1/recover`, `/auth/v1/user`). This limit applies even when using the Send Email Auth Hook.

**Why the Auth Hook doesn't bypass this limit**: The rate limit is checked by Supabase *before* your hook is invoked. The hook only handles the actual email delivery, not the rate limiting.

**According to Supabase docs**: "You can only change this with your own custom SMTP setup." However, enabling Custom SMTP disables your Auth Hook (and your custom React Email templates).

**Solutions for Development**:

1. **Use email variations** (recommended): Gmail and many providers treat `+` addresses as the same inbox but Supabase sees them as different users:
   ```
   yourname+test1@gmail.com
   yourname+test2@gmail.com
   yourname+test3@gmail.com
   ```

2. **Wait for the cooldown**: The rate limit resets after approximately 1 hour

3. **Use different email addresses**: Test with completely different email addresses

4. **Manual verification workaround**: Skip email verification during testing:
   ```sql
   -- In Supabase SQL Editor
   UPDATE auth.users 
   SET email_confirmed_at = NOW() 
   WHERE email = 'your@email.com';
   ```

**Why this is acceptable for production**:
- Real users don't request 3+ password resets in an hour
- The limit prevents abuse (someone spamming reset emails to a victim)
- If a legitimate user hits this limit, they're likely frustrated but safe

**If you absolutely need higher limits**, you must enable Custom SMTP (losing custom templates) or implement a fully custom auth flow. For most SaaS applications, the Auth Hook approach with its 2/hr limit is the right trade-off

---

## Authentication Errors

**Symptom**: "Invalid credentials" or session errors

**Solutions**:
- **Clear browser cookies**: Stale cookies can cause issues
- **Check Supabase URL**: Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- **Verify JWT hook**: Ensure custom claims hook is enabled
- **Check user exists**: Query `auth.users` table in Supabase

---

## Middleware/Routing Issues

**Symptom**: Pages not loading, 404 errors, or incorrect redirects

**Solutions**:
- **Restart dev server**: Stop (`Ctrl+C`) and restart (`pnpm dev`)
- **Clear `.next` cache**: Delete `.next` folders and rebuild
  ```bash
  rm -rf apps/marketing/.next apps/protected/.next
  pnpm dev
  ```
- **Check middleware**: Review `apps/protected/proxy.ts` for errors

---

## Database Migration Errors

**Symptom**: SQL errors when running migrations

**Solutions**:
- **Check order**: Migrations must run in order (00 → 08)
- **Check dependencies**: Some tables depend on others
- **Reset database**: In Supabase Dashboard → Database → Reset database (⚠️ loses all data)
- **Check syntax**: Ensure no syntax errors in SQL files

---

## RLS Policy Errors

**Symptom**: "Row level security policy violation" errors

**Solutions**:
- **Check user session**: Ensure user is authenticated
- **Verify claims**: User should have `org_id` and `subdomain` in JWT claims
- **Check RLS policies**: Review policies in `05_rls_policies.sql`
- **Use service role**: For admin operations, use `SUPABASE_SECRET_KEY`

---

## Build Errors

**Symptom**: TypeScript or build errors during development

**Solutions**:
- **Update dependencies**: `pnpm install`
- **Clear cache**: `rm -rf node_modules .next && pnpm install`
- **Check TypeScript**: `pnpm type-check`
- **Fix lint errors**: `pnpm lint --fix`

---

## Port Already in Use

**Symptom**: "Port 3002 (or 3003) is already in use"

**Solutions**:
- **Kill existing process**:
  ```bash
  # macOS/Linux
  lsof -ti:3002 | xargs kill -9
  lsof -ti:3003 | xargs kill -9
  ```
- **Use different ports**: Edit `package.json` port configurations
