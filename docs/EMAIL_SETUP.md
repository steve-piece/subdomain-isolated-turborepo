# Email Setup Guide

Complete guide for configuring email delivery using Resend and Supabase for transactional emails and authentication flows.

## Overview

This system provides:

- **Auth emails** via Supabase Auth Hook (signup, password reset, invitations)
- **Custom emails** via Edge Function (notifications, announcements)
- **React templates** in `packages/ui` for consistent branding

## 1. Environment Variables

Set these variables in your `.env` files and Supabase project secrets:

```bash
# Supabase
SUPABASE_URL={{Your Supabase Project URL}}
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY={{Your Supabase Project Publishable Key}}
SUPABASE_SECRET_KEY={{Your Supabase Project Secret Key}}
SUPABASE_SERVICE_ROLE_KEY={{Your Supabase Project Service Role Key}}  # Only for Edge Functions

# Email (Resend)
RESEND_API_KEY=...
EMAIL_DOMAIN={{Your Email Domain}}
SENDER_EMAIL={{Your Sender Email}}
SUPPORT_EMAIL={{Your Support Email}}

# Email toggles (optional - for testing)
RESEND_ENABLE_INVITATION_EMAILS=true
RESEND_ENABLE_WELCOME_EMAILS=true
RESEND_VERIFY_EMAILS=true

# Auth hook secret
SEND_EMAIL_HOOK_SECRET=v1,whsec_<secret>
```

Upload secrets to Supabase:

```bash
pnpm dlx supabase secrets set --env-file supabase/functions/.env
```

## 2. Deploy Edge Functions

Deploy both email functions:

```bash
# Auth webhook handler
pnpm dlx supabase functions deploy send-email --no-verify-jwt

# Custom notification sender
pnpm dlx supabase functions deploy send-custom-email --no-verify-jwt
```

## 3. Supabase Dashboard Configuration

### 3.1 Auth Hooks

Navigate to **Authentication → Hooks → Send Email**:

- **Type:** HTTPS endpoint
- **Endpoint:** `https://<project-ref>.supabase.co/functions/v1/send-email`
- **Secret:** Value from `SEND_EMAIL_HOOK_SECRET`

### 3.2 URL Configuration

Navigate to **Authentication → URL Configuration**:

**Site URL:**

```
https://{{Your_App_Domain}}
```

**Redirect URLs:**

```
https://{{Your_App_Domain}}/signup/success
https://*.{{Your_App_Domain}}/auth/confirm
https://*.{{Your_App_Domain}}/auth/error
https://*.{{Your_App_Domain}}/auth/resend-verification
https://*.{{Your_App_Domain}}/auth/login
https://*.{{Your_App_Domain}}/auth/forgot-password
https://*.{{Your_App_Domain}}/auth/update-password
https://*.{{Your_App_Domain}}/auth/accept-invitation
```

> Replace `{{Your_App_Domain}}` with your `NEXT_PUBLIC_APP_DOMAIN`

### 3.3 Email Templates

#### Signup Confirmation

Navigate to **Authentication → Email Templates → Confirm signup**:

```html
<style>
  body {
    font-family: Arial, sans-serif;
  }
</style>

<h2>Welcome to {{ .Data.organization_name }}!</h2>

<p>
  Thank you for creating your organization account. Please click the link below
  to verify your email address and complete your setup:
</p>

<p>
  <a
    href="{{ .ConfirmationURL }}"
    style="background-color: #f2f2f2; border: 1px solid #2a2a2a; color: black; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: semi-bold;"
  >
    Verify Email Address
  </a>
</p>

<p><strong>Organization:</strong> {{ .Data.organization_name }}</p>
<p><strong>Subdomain:</strong> {{ .Data.subdomain }}</p>
<p><strong>Your Role:</strong> Owner</p>

<p>
  Once verified, you can access your organization workspace at your subdomain
  URL.
</p>

<hr />
<p>
  <small
    >This link will expire in 24 hours. If you didn't create this account, you
    can safely ignore this email.</small
  >
</p>
```

#### Password Reset

Navigate to **Authentication → Email Templates → Reset password**:

```html
<style>
  body {
    font-family: Arial, sans-serif;
  }
</style>

<h2>Reset Your Password</h2>

<p>
  You requested to reset your password. Click the link below to create a new
  password:
</p>

<p>
  <a
    href="{{ .ConfirmationURL }}"
    style="background-color: #f2f2f2; border: 1px solid #2a2a2a; color: black; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: semi-bold;"
  >
    Reset Password
  </a>
</p>

<p>This link will expire in 1 hour for security reasons.</p>

<hr />
<p>
  <small
    >If you didn't request this password reset, you can safely ignore this
    email. Your password will not be changed.</small
  >
</p>
```

#### Reauthentication

Navigate to **Authentication → Email Templates → Reauthenticate**:

```html
<style>
  body {
    font-family: Arial, sans-serif;
  }
</style>

<h2>Confirm Your Identity</h2>

<p>
  For your security, we need to verify your identity before proceeding. Please
  click the link below to reauthenticate:
</p>

<p>
  <a
    href="{{ .ConfirmationURL }}"
    style="background-color: #f2f2f2; border: 1px solid #2a2a2a; color: black; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: semi-bold;"
  >
    Confirm Identity
  </a>
</p>

<p>This security check helps protect your account and organization data.</p>

<hr />
<p>
  <small
    >This link will expire in 5 minutes for security reasons. If you didn't
    request this action, please contact your administrator immediately.</small
  >
</p>
```

#### User Invitation

Navigate to **Authentication → Email Templates → Invite user**:

```html
<style>
  body {
    font-family: Arial, sans-serif;
  }
</style>

<h2>You're Invited to Join {{ .Data.organization_name }}!</h2>

<p>
  You've been invited to join <strong>{{ .Data.organization_name }}</strong> as
  a team member. Click the link below to accept your invitation and set up your
  account:
</p>

<p>
  <a
    href="{{ .ConfirmationURL }}"
    style="background-color: #f2f2f2; border: 1px solid #2a2a2a; color: black; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: semi-bold;"
  >
    Accept Invitation
  </a>
</p>

<p><strong>Organization:</strong> {{ .Data.organization_name }}</p>
<p><strong>Your Role:</strong> {{ .Data.user_role }}</p>
<p><strong>Invited by:</strong> {{ .Data.invited_by_email }}</p>

<p>
  Once you accept, you'll be able to access the organization workspace and
  collaborate with your team.
</p>

<hr />
<p>
  <small
    >This invitation will expire in 7 days. If you don't recognize this
    organization or didn't expect this invitation, you can safely ignore this
    email.</small
  >
</p>
```

## 4. Application Integration

### Auth Email Flow

The signup form attaches metadata to the Supabase auth session:

```tsx
// apps/marketing/components/organization-signup-form.tsx
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      organization_name: formData.companyName,
      subdomain: formData.subdomain,
      full_name: formData.fullName,
    },
  },
});
```

The `send-email` Edge Function receives this metadata and renders React templates from `packages/ui`.

### Custom Email Service

Use the hook for custom notifications:

```tsx
// apps/protected/lib/hooks/use-email-service.ts
const { sendEmail } = useEmailService();

await sendEmail({
  userId: user.id,
  templateType: "notification",
  templateData: {
    title: "Important Update",
    message: "New features are live!",
    actionUrl: "https://{{Your_App_Domain}}/dashboard",
    actionText: "View Dashboard",
  },
});
```

Component example:

```tsx
// apps/protected/components/email-composer.tsx
import { useEmailService } from "@/lib/hooks/use-email-service";

export function EmailComposer() {
  const { sendEmail, isLoading } = useEmailService();

  const handleSend = async () => {
    await sendEmail({
      userId: currentUserId,
      templateType: "notification",
      templateData: {
        /* ... */
      },
    });
  };

  return (
    <button onClick={handleSend} disabled={isLoading}>
      Send
    </button>
  );
}
```

## 5. Testing

### Test Auth Emails

1. Sign up through marketing site
2. Check inbox for verification email
3. Click verification link
4. Verify organization bootstrap completes

### Test with CLI

**Auth Hook:**

```bash
pnpm dlx supabase functions invoke send-email \
  --project-ref <project-ref> \
  --body '{"user":{"email":"test@example.com"},"email_data":{"email_action_type":"signup","token":"123456","token_hash":"fakehash","redirect_to":"https://app.example.com"}}' \
  --header sendemailhooksecret="v1,whsec_<secret>"
```

**Custom Email:**

```bash
pnpm dlx supabase functions invoke send-custom-email \
  --project-ref <project-ref> \
  --body '{"userId":"<uuid>","templateType":"notification","templateData":{"title":"Update","message":"Test"}}' \
  --header authorization="Bearer <service-role-jwt>"
```

### Test Invitation Flow

1. Admin clicks "Invite Team Members"
2. Fill form with email and role
3. User receives email
4. Click link → lands on `subdomain.{{Your_App_Domain}}/auth/accept-invitation`
5. Account created with proper role

### Test Password Reset

1. User clicks "Forgot your password?"
2. Fill form with email
3. User receives reset email
4. Click link → lands on `subdomain.{{Your_App_Domain}}/auth/update-password`
5. Set new password with validation

## 6. Permission Levels

| Role           | Capabilities                        |
| -------------- | ----------------------------------- |
| **Owner**      | Full control, billing, invite users |
| **Superadmin** | Manage all settings, invite users   |
| **Admin**      | Invite users, manage organization   |
| **Member**     | Regular user with edit permissions  |
| **View-only**  | Read-only access                    |

## 7. Key Routes

| Route                       | Purpose                   |
| --------------------------- | ------------------------- |
| `/auth/confirm`             | Email verification        |
| `/auth/forgot-password`     | Request password reset    |
| `/auth/update-password`     | Set new password          |
| `/auth/accept-invitation`   | Accept team invitation    |
| `/auth/resend-verification` | Resend verification email |

## 8. Monitoring

### Supabase Logs

- **Auth events:** Dashboard → Authentication → Logs
- **Function logs:** Dashboard → Edge Functions → Logs
- **Webhook errors:** Check hook delivery status

### Resend Dashboard

- Verify email rendering
- Check delivery status
- View bounce/spam reports
- Monitor API usage

### Sentry

- Runtime errors in Edge Functions
- Client-side email service errors
- Failed email deliveries

## 9. Security Features

### Token Handling

**Important:** Recovery credentials are appended to URL hash fragments:

```
https://acme.{{Your_App_Domain}}/auth/update-password#access_token=...&refresh_token=...&type=recovery&token_hash=...
```

The hash is not part of the redirect allow-list, but the base path must be present for Supabase to append the fragment safely.

### Security Measures

- **Token expiration:** Password reset links expire in 1 hour
- **Email confirmation:** Signup links expire in 24 hours
- **Invitation expiry:** Invitation links expire in 7 days
- **Reauthentication:** Security checks expire in 5 minutes
- **Password validation:** Minimum 6 characters, strength checking

## 10. Troubleshooting

| Issue                 | Solution                                                      |
| --------------------- | ------------------------------------------------------------- |
| Emails not sending    | Check `RESEND_API_KEY` and Edge Function logs                 |
| Wrong email template  | Verify Supabase email templates configured                    |
| Token expired         | Use "Request new link" flow on error pages                    |
| Subdomain mismatch    | Verify wildcard redirect URLs include `*.{{Your_App_Domain}}` |
| Hook not triggered    | Check hook secret matches and endpoint is correct             |
| Custom emails failing | Verify user has valid session token                           |

## 11. Package Dependencies

The UI package uses Resend for email delivery:

```bash
# Install in UI package
pnpm add resend --filter @workspace/ui
```

Email utility:

```typescript
// packages/ui/src/lib/email.ts
import { Resend } from "resend";

export async function sendEmail(options: SendEmailOptions) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  // Send email with React templates
}
```

## References

- [Auth Flow](/docs/auth-flow.md) - Complete authentication flow
- [Supabase Auth Hooks](https://supabase.com/docs/guides/auth/auth-hooks) - Official docs
- [Resend Documentation](https://resend.com/docs) - Email API docs
