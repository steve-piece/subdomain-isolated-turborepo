<!-- docs/CUSTOM_EMAIL_SETUP.md -->

# Custom Email Delivery Setup

This guide documents how to configure Supabase so that transactional emails
are delivered through our Resend-powered Edge Functions, plus how to trigger
and test both the built-in auth hook and the new custom email function.

## 1. Required Environment Variables

Ensure the following variables (from `@ENV-VARIABLES.mdc`) are set for the
marketing and protected apps **and** in Supabase project secrets:

- `SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY`
- `RESEND_API_KEY`
- `SUPPORT_EMAIL` (defaults to `support@auth.voltguardai.com` if unset)
- `SENDER_EMAIL` (defaults to `support@auth.voltguardai.com` if unset)
- `SUPABASE_SERVICE_ROLE_KEY` (uploaded as Supabase secret for Edge Functions)
- Hook secret: `SEND_EMAIL_HOOK_SECRET` (format `v1,whsec_<secret>`)

The Supabase CLI command below uploads the `.env` used by the Edge Functions:

```bash
pnpm dlx supabase secrets set --env-file supabase/functions/.env
```

## 2. Deploy Edge Functions

Both functions live under `supabase/functions/` and must be deployed to
Supabase:

```bash
# Auth webhook handler (send-email)
pnpm dlx supabase functions deploy send-email --no-verify-jwt

# Custom notification sender (send-custom-email)
pnpm dlx supabase functions deploy send-custom-email --no-verify-jwt
```

> `pnpm dlx supabase` ensures we use the workspace CLI version without a
> global install.

## 3. Configure Supabase Dashboard

1. **Auth → Hooks → Send Email**
   - Type: `HTTPS endpoint`
   - Endpoint: `https://<project-ref>.supabase.co/functions/v1/send-email`
   - Secret: paste the value stored in `SEND_EMAIL_HOOK_SECRET`

2. **Authentication → URL Configuration**
   - Review `Site URL` and redirect URLs to ensure they match
     `NEXT_PUBLIC_APP_DOMAIN` and the wildcard tenant routes.

3. **Project Settings → API → Project Configuration**
   - Confirm `SUPABASE_SECRET_KEY`, `RESEND_API_KEY`, `SUPPORT_EMAIL`, and
     `SEND_EMAIL_HOOK_SECRET` are present in **Config → Secrets**.

## 4. Testing

### Auth Email Flow

1. Sign up through the marketing app.
2. Check the inbox for the verification email rendered via the new hook.
3. Redeem the link and verify the organization bootstrap completes.

CLI smoke test (requires a valid hook secret and payload):

```bash
pnpm dlx supabase functions invoke send-email \
  --project-ref <project-ref> \
  --body '{"user":{"email":"test@example.com"},"email_data":{"email_action_type":"signup","token":"123456","token_hash":"fakehash","redirect_to":"https://app.example.com"}}' \
  --header sendemailhooksecret="v1,whsec_<secret>"
```

### Custom Email Endpoint

The `send-custom-email` function expects an authenticated JWT. From a logged-in
session you can call the helper exposed through `useEmailService`, or trigger it
with the CLI by providing a service-role token:

```bash
pnpm dlx supabase functions invoke send-custom-email \
  --project-ref <project-ref> \
  --body '{"userId":"<uuid>","templateType":"notification","templateData":{"title":"Important Update","message":"New features are live!","actionUrl":"https://yourapp.com/dashboard","actionText":"View Dashboard"}}' \
  --header authorization="Bearer <service-role-jwt>"
```

Combine the invocation with Supabase Auth logs or the Resend dashboard to
confirm delivery.

## 5. Frontend Integration Overview

- `apps/marketing/components/organization-signup-form.tsx` attaches the metadata
  (`organization_name`, `subdomain`, etc.) required by the hook.
- `apps/protected/lib/hooks/use-email-service.ts` wraps fetch calls to the
  custom function, reusing the authenticated session.
- `apps/protected/components/email-composer.tsx` demonstrates invoking the
  custom notification email from the UI.

## 6. Monitoring

- **Supabase Auth Logs**: Use Supabase MCP (or the dashboard) to inspect recent
  authentication events and webhook delivery errors.
- **Resend Dashboard**: Validate email rendering and delivery status.
- **Sentry**: Watch for runtime errors in Edge Functions by instrumenting
  additional logging if necessary.

With the above steps completed, the project now ships both auth-triggered and
custom transactional emails using the shared React templates in `packages/ui`.

**Why the hash matters:** our custom email hook appends Supabase recovery credentials to the URL hash fragment (e.g. `https://acme.yourapp.com/auth/update-password#access_token=…&refresh_token=…&type=recovery&token_hash=…`). Even though the hash is not part of the redirect allow-list, the base path must still be present so Supabase can append the fragment safely. This mirrors how the confirm-email flow works and prevents email providers from stripping the recovery tokens.
