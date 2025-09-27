<!-- docs/EMAIL_VERIFICATION_SETUP.md -->
# Email Verification Setup - Supabase Dashboard Configuration

This guide covers the **manual configuration steps** required in your Supabase Dashboard to enable email verification for our subdomain multi-tenant architecture.

> **Note:** All application code for email verification is already implemented. This document only covers the Supabase Dashboard settings that must be configured manually.

## Required Supabase Dashboard Configuration

### 1. Site URL Configuration

Navigate to **Authentication → URL Configuration** in your Supabase Dashboard.

**Site URL**: Set to your app domain

```
https://yourapp.com
```

### 2. Redirect URLs Configuration

In **Authentication → URL Configuration → Redirect URLs**, add these URLs:

```
https://yourapp.com/signup/success
https://*.yourapp.com/auth/confirm
https://*.yourapp.com/auth/error
https://*.yourapp.com/auth/resend-verification
https://*.yourapp.com/auth/login
https://*.yourapp.com/auth/forgot-password
https://*.yourapp.com/auth/update-password
https://*.yourapp.com/auth/accept-invitation
```

> **Important:** Replace `yourapp.com` with your actual `NEXT_PUBLIC_APP_DOMAIN` value.

### 3. Email Templates

#### Signup Confirmation Email Template

Navigate to **Authentication → Email Templates → Confirm signup** and replace the template with:

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

#### Password Recovery Email Template

Navigate to **Authentication → Email Templates → Reset password** and replace the template with:

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

#### Reauthentication Email Template

Navigate to **Authentication → Email Templates → Reauthenticate** and replace the template with:

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

#### Invite User Email Template

Navigate to **Authentication → Email Templates → Invite user** and replace the template with:

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

## Environment Variables

Ensure these are set in your environment:

```env
NEXT_PUBLIC_APP_DOMAIN=yourapp.com
NEXT_PUBLIC_MARKETING_DOMAIN=yourapp.com
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=your-anon-key
```

## Verification

After completing the configuration:

1. **Test signup** from the marketing site
2. **Check email delivery** for verification link
3. **Verify subdomain routing** works correctly
4. **Test expired token handling** with the resend verification flow
5. **Test invite flow** by inviting a user from the dashboard

The application code will handle all token validation, routing, and user feedback automatically.

## User Invitation System

The application includes a complete user invitation system:

### Invitation Flow

1. **Admin/Superadmin** clicks "Invite Team Members" on dashboard
2. **Fill out form** with email and role (view-only, member, admin)
3. **Email sent** using Supabase's invitation system
4. **User clicks link** and lands on `company.yourapp.com/auth/accept-invitation`
5. **Account created** with proper role and tenant assignment

### Permission Levels

- **Superadmin**: Can invite users and manage all settings
- **Admin**: Can invite users and manage organization
- **Member**: Regular user with edit permissions
- **View-only**: Read-only access

### Routes

- `/invite-user` - Invitation form (admin+ only)
- `/auth/accept-invitation` - Invitation acceptance page

## Password Reset System

The application includes a complete password reset flow:

### Password Reset Flow

1. **User clicks** "Forgot your password?" on login page
2. **Fill out form** with email address on `/auth/forgot-password`
3. **Email sent** using Supabase's password reset system
4. **User clicks link** and lands on `company.yourapp.com/auth/update-password`
5. **Token validated** - if expired, user can request new link
6. **Password updated** with confirmation and strength validation
7. **Redirect to login** with success message

### Security Features

- **Token expiration** handling with clear error messages
- **Password strength** validation (6+ characters)
- **Password confirmation** matching
- **Visual password toggle** for better UX
- **Expired token recovery** - easy link to request new reset

### Routes

- `/auth/forgot-password` - Request password reset
- `/auth/update-password` - Update password with token validation
