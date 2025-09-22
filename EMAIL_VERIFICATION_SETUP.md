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
```

> **Important:** Replace `yourapp.com` with your actual `NEXT_PUBLIC_APP_DOMAIN` value.

### 3. Email Templates

#### Signup Confirmation Email Template

Navigate to **Authentication → Email Templates → Confirm signup** and replace the template with:

```html
<h2>Welcome to {{ .Data.organization_name }}!</h2>

<p>
  Thank you for creating your organization account. Please click the link below
  to verify your email address and complete your setup:
</p>

<p>
  <a
    href="{{ .ConfirmationURL }}"
    style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;"
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
<h2>Reset Your Password</h2>

<p>
  You requested to reset your password. Click the link below to create a new
  password:
</p>

<p>
  <a
    href="{{ .ConfirmationURL }}"
    style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;"
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

The application code will handle all token validation, routing, and user feedback automatically.
