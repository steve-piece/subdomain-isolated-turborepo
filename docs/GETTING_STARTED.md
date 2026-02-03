# 🚀 Getting Started Guide

Complete setup guide for the Subdomain-Isolated Turborepo multi-tenant SaaS platform. Follow these steps to get your application running locally and deployed to production.

**Estimated Time**: 15-30 minutes

> **First time here?** Complete the [Quick Start in the README](../README.md#quick-start) to deploy both Vercel projects before continuing.

---

## Table of Contents

- [Initial Setup](#initial-setup)
- [Database Setup](#database-setup)
- [Domain Setup](#domain-setup)
- [Email Configuration](#email-configuration)
- [Local Development](#local-development)
- [First User Setup](#first-user-setup)
- [Next Steps](#next-steps)

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

### 3. Create Environment Files

```bash
cp apps/marketing/.env.example apps/marketing/.env.local
cp apps/protected/.env.example apps/protected/.env.local
```

### 4. Configure Environment Variables

> 💡 **Tip**: To make setup easier, configure all variables in `apps/marketing/.env.local` first, then copy/paste them into `apps/protected/.env.local`. Both apps use the same environment variables.

#### App Identity

Then set these environment variables:

```bash
# Marketing domain (public website)
NEXT_PUBLIC_MARKETING_DOMAIN='localhost:3002'  # or 'marketingdomain.com' for production

# Protected app domain (multi-tenant subdomains)
NEXT_PUBLIC_APP_DOMAIN='localhost:3003'  # or 'protecteddomain.app' for production

# Display name
NEXT_PUBLIC_APP_NAME='Your App'
```

Once you've set the env values, search and replace these placeholders across your codebase (match case, whole word):

| Placeholder | Replace With | Description |
|:------------|:-------------|:------------|
| `Your App` | Your actual app name | Display name shown across all apps |
| `marketingdomain.com` | Your marketing domain | Public website domain |
| `protecteddomain.com` | Your protected domain | Multi-tenant app domain |

#### Supabase Configuration

Get these from your Supabase project dashboard:

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Create a new project or select existing project
3. Open the project, and click 'Connect' in the top nav bar and go to the "App Frameworks" tab.
4. Copy and Paste the contents into your .env.local file.
5. Then navigate to **Project Settings** → **API Keys**, and copy the Secret API Key (SUPABASE_SECRET_KEY) towards the bottom. 

```bash
# Supabase project URL
NEXT_PUBLIC_SUPABASE_URL='https://your-project.supabase.co'

# Supabase anon/publishable key (public)
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY='sb_publishable_nbmm...'

# Supabase service role key (private - never expose to client)
SUPABASE_SECRET_KEY='sb_secret_zGk...'
```

#### Resend Configuration

1. Go to the [API Keys](https://resend.com/api-keys) page
2. Create a new API Key and add it to your `.env.local`
3. Decide on a domain for emails to be sent from. For best practices, make it a subdomain like 'mail' of your Marketing App domain. (e.g. `mail.marketingdomain.com`). **DO NOT** choose a subdomain of the protected domain as these are reserved for your tenants. 
4. Once decided, update the email domain and addresses to match your configuration
5. **Find & Replace** all `emaildomain.com` instances with the email domain you choose.

```bash
# Resend API key
RESEND_API_KEY='re_...'

# Email Domain Config
NEXT_PUBLIC_EMAIL_DOMAIN='mail.marketingdomain.com'
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

> **REMEMBER TO COPY THE CONTENTS OF YOUR `.env.local` FILE, AND PASTE TO THE OTHER APP'S `.env.local` FILE**

---

## Database Setup

### 1. Run Database Migrations

The schema files are located in the [Supabase Schemas](../supabase/schemas/README.md) directory. Run them in this exact order:

#### Option A: Using Supabase SQL Editor (Recommended)

1. Navigate to **SQL Editor** in Supabase Dashboard
2. Create a new query for each file
3. Copy and paste the content from each file
4. Run queries in this order:

Run these files in the exact order listed:

1. **00_extensions.sql** - PostgreSQL extensions (pg_cron, index_advisor, etc.)
2. **01_enums.sql** - Custom types and enums (invitation_status, user_role, etc.)
3. **02_tables.sql** - Core tables (organizations, tenants, users, subscriptions, etc.)
4. **03_functions.sql** - Database functions including JWT claims hook and utilities
5. **04_views.sql** - Database views for common queries
6. **05_rls_policies.sql** - Row Level Security policies for multi-tenant isolation
7. **06_cron_jobs.sql** - Scheduled jobs (renewal reminders, cleanup tasks)
8. **07_storage_buckets.sql** - S3 storage bucket configurations
9. **08_seed_data.sql** - Initial seed data (subscription tiers, etc.) - optional for development


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

### 2. Verify Schema

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

### 3. Verify Seed Data

Check that subscription tiers were seeded:

```sql
SELECT * FROM subscription_tiers ORDER BY created_at;
```

You should see four tiers: Free, Pro, Business, Enterprise.

---

## Domain Setup

You'll need two separate domains for the two applications.

### 1. Add Protected Domain to Vercel

1. Go to [vercel.com](https://vercel.com) and navigate to **Domains**
2. Click **Add existing domain** and enter your protected domain (e.g., `protecteddomain.com`)
3. On the DNS records page, copy the Vercel nameservers
4. Go to your domain registrar and change the nameservers to the Vercel nameservers
5. Back in Vercel, add a CNAME record with:
   - **Name**: `*`
   - **Value**: `protecteddomain.com` (your domain name)

### 2. Add Marketing Domain to Vercel

1. Go back to the Vercel **Domains** page
2. Click **Add existing domain** and enter your marketing domain (e.g., `marketingdomain.com`)
3. Copy the Vercel nameservers and update them at your domain registrar

### 3. Verify Domain in Resend

1. Go to [Resend Dashboard](https://resend.com/domains)
2. Click **Add Domain**
3. Enter your email domain (e.g., `emaildomain.com`)
4. Copy the DNS records provided by Resend
5. In Vercel, go to your marketing domain's DNS configuration and add the Resend DNS records
6. Wait for Resend to verify the records (usually a few minutes)

> **Optional**: At the bottom of the DNS records provided in Resend, you have the option to enable receiving emails from users, which will reveal one more MX record to add if toggled on.


### 4. Connect Domains to Projects

**Protected App Project**:
1. Navigate to your protected app project in Vercel
2. Go to **Settings** → **Domains**
3. Click **Add existing** and enter your protected domain (e.g., `protecteddomain.com`)
4. **Important**: Uncheck the "Redirect to www" setting
5. Click **Add existing** again and enter `*.protecteddomain.com`
6. **Important**: Uncheck the "Redirect to www" setting again
7. Go to **Settings** → **Environment Variables**, click **Import from .env** and select `apps/protected/.env.local` (or manually copy/paste the values)
8. Redeploy when prompted

**Marketing App Project**:
1. Navigate to your marketing app project in Vercel
2. Go to **Settings** → **Domains**
3. Click **Add existing** and enter your marketing domain (e.g., `marketingdomain.com`)
4. Go to **Settings** → **Environment Variables**, click **Import from .env** and select `apps/marketing/.env.local` (or manually copy/paste the values)
5. Redeploy when prompted

---

## Email Configuration

### 1. Deploy Edge Functions

The platform uses Supabase Edge Functions for sending emails. Deploy the `send-email` function:

#### Using Supabase CLI

```bash
# Login to Supabase (first time only)
npx supabase login

# Link your project (first time only)
# Find your project ref in: Supabase Dashboard → Project Settings → General → Reference ID
npx supabase link --project-ref abcdef...

# Deploy the send-email function
npx supabase functions deploy send-email
```

### 2. Configure URL Settings

1. Navigate to [Supabase Dashboard](https://app.supabase.com) and go to **Authentication** → **URL Configuration**

2. Set the **Site UR TO**: `https://marketingdomain.com`

3. Add **Redirect URLs** (one per line):

```
http://localhost:3002/**
http://localhost:3003/**
http://*.localhost:3003/**
https://marketingdomain.com/**
https://protecteddomain.com/**
https://*.protecteddomain.com/**
```

### 3. Enable Auth Hooks

1. Navigate to **Authentication** → **Auth Hooks**

2. Click **Add hook** and select **Customize Access Token (JWT) Claims hook**
   - In the **Postgres Function** dropdown, select `custom_claims_hook`
   - Click **Create hook**

3. Click **Add hook** again and select **Send Email hook**
   - Change **Hook type** to `HTTPS`
   - Set the **URL** to: `https://[YOUR_PROJECT_REF].supabase.co/functions/v1/send-email`
   - Click **Generate secret** and copy the generated secret
   - Click **Create hook**

### 4. Set Edge Function Secrets

1. Go to **Edge Functions** → **Settings** → **Secrets**
2. Add the following secrets:

```bash
SEND_EMAIL_HOOK_SECRET='{paste the secret copied from the Send Email auth hook}'
RESEND_API_KEY=re_...
NEXT_PUBLIC_APP_DOMAIN=localhost:3003  # or your production domain
NEXT_PUBLIC_MARKETING_DOMAIN=localhost:3002  # or your production domain
NEXT_PUBLIC_APP_NAME='Your App'
NEXT_PUBLIC_SENDER_EMAIL=noreply@marketingdomain.com
NEXT_PUBLIC_EMAIL_DOMAIN=marketingdomain.com
NEXT_PUBLIC_SUPPORT_EMAIL=support@marketingdomain.com
```

### 5. SMTP Settings

By default Supabase Rate Limits emails sent to 2/hr. To avoid this, we need to enable custom SMTP settings with Resend as our provider (Rate Limit: 100 emails/day in free accounts).

1. Open Resend's [SMTP Settings](https://resend.com/settings/smtp)
   - We will be copying these values into Supabase
   - Use the same API Key from your `.env.local` file as the passowrd or create a new API Key

2. Go to the [Supabase Dashboard](https://supabase.com/dashboard)
   - Navigate to **Authentication** -> **Email** -> **SMTP Settings**
   - Toggle to Enable Custom SMTP
   - Configure **Sender Details** using your `NEXT_PUBLIC_SENDER_EMAIL` and `NEXT_PUBLIC_APP_NAME` (Can Also add 'Support' or another word after your app name for the send name; this would appear in the users email inbox as '{Your App} Support')
   - Copy/Paste values from Resend into the SMTP Provider Details in the Supabase settings

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

To access the protected app, you first need to create an organization:

1. Go to http://localhost:3002/signup
2. Create a test organization using your actual email address
3. Check your email for a confirmation link
4. Click the confirmation link to verify your account
5. You'll be redirected to `{your-subdomain}.localhost:3003`

> **Note**: Accessing a subdomain directly (e.g., `http://acme.localhost:3003`) before signup will redirect to the marketing site.

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
- See [Troubleshooting](./TROUBLESHOOTING.md)

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

## Next Steps

Your multi-tenant SaaS platform is now running locally.

| Guide | Description |
|:------|:------------|
| [Architecture](./ARCHITECTURE.md) | How the platform works |
| [Database Schema](./DATABASE.md) | Complete database reference |
| [Stripe Setup](./STRIPE.md) | Enable billing and subscriptions |
| [Vercel Deployment](./VERCEL_DEPLOYMENT.md) | Deploy to production |
| [Troubleshooting](./TROUBLESHOOTING.md) | Common issues and solutions |
