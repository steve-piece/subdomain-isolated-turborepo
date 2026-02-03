# 🚀 Getting Started Guide

Complete setup guide for the Subdomain-Isolated Turborepo multi-tenant SaaS platform. Follow these steps to get your application running locally and deployed to production.

**Estimated Time**: 15-30 minutes

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Email Configuration](#email-configuration)
- [Supabase Auth Hooks](#supabase-auth-hooks)
- [Local Development](#local-development)
- [First User Setup](#first-user-setup)
- [Troubleshooting](#troubleshooting)
- [Next Steps](#next-steps)

---

## Prerequisites

Before you begin, ensure you have the following:

### Required Software

- **Node.js 20+** - [Download](https://nodejs.org/)
- **pnpm** - Fast, disk-space efficient package manager
  ```bash
  npm install -g pnpm
  ```

### Required Accounts

- **Supabase Account** - [Sign up](https://supabase.com) (free tier available)
  - For authentication, database, and edge functions
- **Resend Account** - [Sign up](https://resend.com) (free tier: 100 emails/day)
  - For transactional emails
- **Stripe Account** - [Sign up](https://stripe.com) (optional for billing)
  - Test mode for development, production mode for live billing

### Optional (for production)

- **Vercel Account** - [Sign up](https://vercel.com) (free tier available)
  - For deployment (see [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md))
- **Two Domain Names**
  - Marketing domain (e.g., `marketingdomain.com`)
  - Protected/app domain (e.g., `protecteddomain.com`)
  - For local development, you can use `localhost`

---

## Initial Setup

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd subdomain-isolated-turborepo
```

### 2. Install Dependencies

```bash
pnpm install
```

This will install all dependencies for both apps and packages.

### 3. Replace Placeholder Values

Search and replace these placeholders across your codebase (match case, whole word):

| Placeholder | Replace With | Description |
|:------------|:-------------|:------------|
| `Your App` | Your actual app name | Display name shown across all apps |
| `marketingdomain.com` | Your marketing domain | Public website domain |
| `protecteddomain.com` | Your protected domain | Multi-tenant app domain |
| `emaildomain.com` | Your email domain | Domain for sending emails |

> 💡 **Tip**: In VS Code, use `Cmd+Shift+H` (Mac) or `Ctrl+Shift+H` (Windows) for Find & Replace.

---

## Environment Configuration

### 1. Copy Environment Template

```bash
cp .env.example .env.local
```

### 2. Configure Required Variables

Edit `.env.local` and set the following variables:

#### App Identity

```bash
# Marketing domain (public website)
NEXT_PUBLIC_MARKETING_DOMAIN='localhost:3002'  # or 'marketingdomain.com' for production

# Protected app domain (multi-tenant subdomains)
NEXT_PUBLIC_APP_DOMAIN='localhost:3003'  # or 'protecteddomain.app' for production

# Display name
NEXT_PUBLIC_APP_NAME='Your App'
```

#### Supabase Configuration

Get these from your Supabase project dashboard:

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Create a new project or select existing project
3. Navigate to **Settings** → **API**

```bash
# Supabase project URL
NEXT_PUBLIC_SUPABASE_URL='https://your-project.supabase.co'

# Supabase anon/publishable key (public)
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'

# Supabase service role key (private - never expose to client)
SUPABASE_SECRET_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

#### Resend Configuration

Get your API key from [Resend Dashboard](https://resend.com/api-keys):

```bash
# Resend API key
RESEND_API_KEY='re_...'

# Email configuration
NEXT_PUBLIC_SENDER_EMAIL='noreply@marketingdomain.com'
NEXT_PUBLIC_EMAIL_DOMAIN='marketingdomain.com'
NEXT_PUBLIC_SUPPORT_EMAIL='support@marketingdomain.com'

# Email toggles (optional)
RESEND_ENABLE_INVITATION_EMAILS='true'
RESEND_ENABLE_WELCOME_EMAILS='true'
RESEND_VERIFY_EMAILS='true'
```

#### Stripe Configuration (Optional)

For billing features, configure Stripe:

```bash
# Stripe API Keys
STRIPE_SECRET_KEY='sk_test_...'
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY='pk_test_...'
STRIPE_WEBHOOK_SECRET='whsec_...'  # Get from webhook setup

# Stripe Price IDs (create products first - see STRIPE.md)
STRIPE_FREE_MONTHLY_PRICE_ID='price_...'
STRIPE_FREE_YEARLY_PRICE_ID='price_...'
STRIPE_PRO_MONTHLY_PRICE_ID='price_...'
STRIPE_PRO_YEARLY_PRICE_ID='price_...'
STRIPE_BUSINESS_MONTHLY_PRICE_ID='price_...'
STRIPE_BUSINESS_YEARLY_PRICE_ID='price_...'
STRIPE_ENTERPRISE_MONTHLY_PRICE_ID='price_...'
STRIPE_ENTERPRISE_YEARLY_PRICE_ID='price_...'
```

See [STRIPE.md](./STRIPE.md) for detailed Stripe setup instructions.

---

## Database Setup

### 1. Create Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click **New Project**
3. Choose organization and set project details
4. Wait for project to be provisioned (~2 minutes)

### 2. Run Database Migrations

The schema files are located in `supabase/schemas/` directory. Run them in this exact order:

#### Option A: Using Supabase SQL Editor (Recommended)

1. Navigate to **SQL Editor** in Supabase Dashboard
2. Create a new query for each file
3. Copy and paste the content from each file
4. Run queries in this order:

```
1. 00_extensions.sql      # PostgreSQL extensions
2. 01_enums.sql           # Custom types and enums
3. 02_tables.sql          # Core tables
4. 03_functions.sql       # Database functions (including JWT claims hook)
5. 04_views.sql           # Database views
6. 05_rls_policies.sql    # Row Level Security policies
7. seed_data.sql          # Initial seed data (optional for development)
```

#### Option B: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

### 3. Verify Schema

Check that tables were created successfully:

1. Go to **Table Editor** in Supabase Dashboard
2. Verify these core tables exist:
   - `organizations`
   - `tenants`
   - `user_profiles`
   - `subscriptions`
   - `subscription_tiers`
   - `capabilities`
   - `projects`
   - Plus many others (see [DATABASE.md](./DATABASE.md) for complete list)

### 4. Verify Seed Data

Check that subscription tiers were seeded:

```sql
SELECT * FROM subscription_tiers ORDER BY created_at;
```

You should see four tiers: Free, Pro, Business, Enterprise.

---

## Email Configuration

### 1. Verify Domain in Resend

1. Go to [Resend Dashboard](https://resend.com/domains)
2. Click **Add Domain**
3. Enter your domain (e.g., `marketingdomain.com`)
4. Add the DNS records provided by Resend
5. Wait for verification (usually a few minutes)

For local development, you can skip domain verification and use the default `onboarding@resend.dev` sender.

### 2. Deploy Edge Functions

The platform uses Supabase Edge Functions for sending emails. Deploy the `send-email` function:

#### Using Supabase CLI

```bash
# Login to Supabase (first time only)
supabase login

# Link your project (first time only)
supabase link --project-ref your-project-ref

# Deploy the send-email function
supabase functions deploy send-email

# Deploy the send-custom-email function
supabase functions deploy send-custom-email
```

### 3. Set Edge Function Secrets

Edge functions need access to environment variables. Set them in Supabase Dashboard:

1. Go to **Edge Functions** → **Settings** → **Secrets**
2. Add the following secrets:

```bash
RESEND_API_KEY=re_...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SEND_EMAIL_HOOK_SECRET=your-random-secret-string
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_APP_DOMAIN=localhost:3003  # or your production domain
NEXT_PUBLIC_MARKETING_DOMAIN=localhost:3002  # or your production domain
NEXT_PUBLIC_APP_NAME='Your App'
NEXT_PUBLIC_SENDER_EMAIL=noreply@marketingdomain.com
NEXT_PUBLIC_EMAIL_DOMAIN=marketingdomain.com
NEXT_PUBLIC_SUPPORT_EMAIL=support@marketingdomain.com
```

**Generate a secure webhook secret**:

```bash
openssl rand -hex 32
```

---

## Supabase Auth Hooks

The platform uses a custom JWT claims hook to add organization and role information to user tokens.

### 1. Enable Custom Access Token Hook

1. Go to **Authentication** → **Hooks** in Supabase Dashboard
2. Select **Custom Access Token Hook**
3. Enable the hook
4. Set the function to: `custom_claims_hook`

This hook is defined in `supabase/schemas/03_functions.sql` and adds the following claims to JWT tokens:

- `user_role`: User's role in the organization
- `subdomain`: Organization's subdomain
- `org_id`: Organization UUID
- `company_name`: Organization name
- `capabilities`: Array of user capabilities
- `organization_logo_url`: Organization logo URL

### 2. Configure JWT Expiry (Optional)

By default, JWT tokens expire after 1 hour. To adjust:

1. Go to **Authentication** → **Settings** → **JWT Settings**
2. Set **JWT Expiry** (recommended: 3600 seconds = 1 hour)

---

## Local Development

### 1. Start Development Servers

```bash
pnpm dev
```

This starts both applications:
- **Marketing App**: http://localhost:3002
- **Protected App**: http://localhost:3003

### 2. Access Your Applications

#### Marketing Site
Navigate to: http://localhost:3002

This is your public-facing site where users can:
- View landing page
- Sign up for an account
- Look up their organization's subdomain

#### Protected App (Main Domain)
Navigate to: http://localhost:3003

This redirects to the marketing site (expected behavior).

#### Protected App (With Subdomain)
Navigate to: http://[company].localhost:3003

Replace `[company]` with any subdomain. Before signup, this will redirect to the marketing site.

### 3. Testing Subdomains Locally

Modern browsers support `localhost` subdomains natively:

✅ **Works in Chrome, Firefox, Safari**:
- `http://acme.localhost:3003`
- `http://mycompany.localhost:3003`

If you need more control, you can edit your `/etc/hosts` file:

```bash
# Add to /etc/hosts (requires sudo)
127.0.0.1 acme.localhost
127.0.0.1 mycompany.localhost
```

---

## First User Setup

### 1. Create Your First Organization

1. Navigate to http://localhost:3002
2. Click **Get Started** or **Sign Up**
3. Fill in the organization signup form:
   - **Organization Name**: Your company name
   - **Subdomain**: Choose a unique subdomain (e.g., `acme`)
   - **Email**: Your email address
   - **Password**: Secure password
   - **Full Name**: Your name

4. Click **Create Account**

### 2. Email Verification Flow

After signup, the system will:

1. Create an inactive organization
2. Reserve your chosen subdomain
3. Send a verification email to your address
4. Redirect you to the tenant subdomain (e.g., `http://acme.localhost:3003`)

**Check your email** for the verification link.

⚠️ **Email Not Received?**
- Check spam folder
- Verify Resend API key is set
- Check Edge Function logs in Supabase Dashboard
- See [Troubleshooting](#troubleshooting) section

### 3. Verify Email and Bootstrap Organization

1. Click the verification link in your email
2. This will:
   - Confirm your email address
   - Activate your organization
   - Bootstrap initial data
   - Log you in automatically

3. You'll be redirected to your organization dashboard at `http://[subdomain].localhost:3003/dashboard`

### 4. Explore Your Workspace

As the organization owner, you have full access to:

- **Dashboard**: Overview of your workspace
- **Settings**: Organization and user settings
- **Team**: Invite and manage team members
- **Projects**: Create and manage projects
- **Billing**: Manage subscription and billing (if Stripe is configured)
- **Security**: 2FA, session management, audit logs

---

## Troubleshooting

### Common Issues and Solutions

#### 1. Subdomain Not Found

**Symptom**: Accessing `http://[company].localhost:3003` redirects to marketing site

**Solutions**:
- Verify the organization was created: Check `organizations` table in Supabase
- Check if organization is active: `is_active` should be `true`
- Verify subdomain exists in `tenants` table
- Check browser console for errors

#### 2. Email Not Sending

**Symptom**: No verification email received

**Solutions**:
- **Check Resend API key**: Verify it's set in `.env.local` and Edge Function secrets
- **Check Edge Function logs**: Go to Supabase Dashboard → Edge Functions → Logs
- **Verify domain**: Ensure domain is verified in Resend (or use `onboarding@resend.dev` for testing)
- **Check spam folder**: Email might be filtered
- **Test Edge Function**: Use the Invoke button in Supabase Dashboard

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

#### 3. Authentication Errors

**Symptom**: "Invalid credentials" or session errors

**Solutions**:
- **Clear browser cookies**: Stale cookies can cause issues
- **Check Supabase URL**: Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- **Verify JWT hook**: Ensure custom claims hook is enabled
- **Check user exists**: Query `auth.users` table in Supabase

#### 4. Middleware/Routing Issues

**Symptom**: Pages not loading, 404 errors, or incorrect redirects

**Solutions**:
- **Restart dev server**: Stop (`Ctrl+C`) and restart (`pnpm dev`)
- **Clear `.next` cache**: Delete `.next` folders and rebuild
  ```bash
  rm -rf apps/marketing/.next apps/protected/.next
  pnpm dev
  ```
- **Check middleware**: Review `apps/protected/proxy.ts` for errors

#### 5. Database Migration Errors

**Symptom**: SQL errors when running migrations

**Solutions**:
- **Check order**: Migrations must run in order (00 → 05)
- **Check dependencies**: Some tables depend on others
- **Reset database**: In Supabase Dashboard → Database → Reset database (⚠️ loses all data)
- **Check syntax**: Ensure no syntax errors in SQL files

#### 6. RLS Policy Errors

**Symptom**: "Row level security policy violation" errors

**Solutions**:
- **Check user session**: Ensure user is authenticated
- **Verify claims**: User should have `org_id` and `subdomain` in JWT claims
- **Check RLS policies**: Review policies in `05_rls_policies.sql`
- **Use service role**: For admin operations, use `SUPABASE_SECRET_KEY`

#### 7. Build Errors

**Symptom**: TypeScript or build errors during development

**Solutions**:
- **Update dependencies**: `pnpm install`
- **Clear cache**: `rm -rf node_modules .next && pnpm install`
- **Check TypeScript**: `pnpm type-check`
- **Fix lint errors**: `pnpm lint --fix`

#### 8. Port Already in Use

**Symptom**: "Port 3002 (or 3003) is already in use"

**Solutions**:
- **Kill existing process**:
  ```bash
  # macOS/Linux
  lsof -ti:3002 | xargs kill -9
  lsof -ti:3003 | xargs kill -9
  ```
- **Use different ports**: Edit `package.json` port configurations

---

## Next Steps

Congratulations! Your multi-tenant SaaS platform is now running locally. 🎉

### Learn More

| Guide | Description |
|:------|:------------|
| [Architecture](./ARCHITECTURE.md) | How the platform works |
| [Database Schema](./DATABASE.md) | Complete database reference |
| [Stripe Setup](./STRIPE.md) | Enable billing and subscriptions |
| [Vercel Deployment](./VERCEL_DEPLOYMENT.md) | Deploy to production |

### Key Features to Explore

| Feature | What to Test |
|:--------|:-------------|
| Multi-Tenant Isolation | Create multiple test orgs with different subdomains |
| RBAC System | Test different user roles (owner, admin, member, view-only) |
| Team Management | Invite users and manage team members |
| Projects | Create projects and assign permissions |
| Security | Enable 2FA, review audit logs |

### Development Tips

| Tip | Details |
|:----|:--------|
| Hot Reload | Changes auto-reflect (no restart needed) |
| Error Logging | Check browser console and terminal |
| Database Changes | Use Supabase SQL Editor for quick queries |
| Email Testing | Use [MailTrap](https://mailtrap.io) to avoid real sends |

### Production Deployment

1. **Deploy to Vercel** — Click the deploy button in [README.md](../README.md) to clone the repo and create both projects (apps will show "Server Error" until Supabase is configured)
2. **Set up Supabase** — Create project, run migrations, copy credentials
3. **Add env vars** — Add Supabase, Resend, and other credentials to both Vercel projects
4. **Redeploy** — Trigger redeploy for both apps
5. **Configure domains** — Set up custom domains (required for protected app wildcard subdomains)
6. **Configure Stripe** — Set up webhooks for production (see [STRIPE.md](./STRIPE.md))
7. **Set up monitoring** (optional) — Sentry, Checkly (see [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md#optional-monitoring--analytics))

---

## Need Help?

| Resource | Link |
|:---------|:-----|
| Documentation | Other docs in the `docs/` folder |
| Contributing | [CONTRIBUTING.md](../CONTRIBUTING.md) |

---

<p align="center"><strong>Happy Building! 🚀</strong></p>
