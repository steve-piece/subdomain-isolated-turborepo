# 🚀 Vercel Deployment Guide

Complete guide to deploying both applications (marketing and protected) to Vercel for production.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Domain Configuration](#domain-configuration)
- [Deploy Marketing App](#deploy-marketing-app)
- [Deploy Protected App](#deploy-protected-app)
- [Supabase Production Setup](#supabase-production-setup)
- [Stripe Production Setup](#stripe-production-setup)
- [DNS & SSL Configuration](#dns--ssl-configuration)
- [Post-Deployment Testing](#post-deployment-testing)
- [Optional: Monitoring & Analytics](#optional-monitoring--analytics)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before deploying, ensure you have:

### Required Accounts

- ✅ **Vercel Account** - [Sign up](https://vercel.com/signup) (free tier available)
- ✅ **GitHub Account** - Code must be in a GitHub repository
- ✅ **Supabase Production Project** - Separate from development
- ✅ **Resend Account** - With verified domain
- ✅ **Domain Names** - Two domains configured:
  - Marketing domain (e.g., `yourdomain.com`)
  - Protected domain (e.g., `yourdomain.app` or `app.yourdomain.com`)

### Optional (for full features)

- 🔄 **Stripe Production Account** - For billing features
- 📊 **Sentry Account** - For error tracking
- 🔍 **Checkly Account** - For uptime monitoring

### Local Setup Complete

Ensure your application runs correctly locally before deploying:

```bash
pnpm dev
# Both apps should start without errors
```

---

## Domain Configuration

You'll need two separate domains or subdomains for the two applications.

### Recommended Domain Structure

**Option 1: Separate TLDs (Recommended)**
- Marketing: `yourdomain.com`
- Protected: `yourdomain.app` (with wildcard `*.yourdomain.app`)

**Option 2: Subdomain Approach**
- Marketing: `yourdomain.com`
- Protected: `app.yourdomain.com` (with wildcard `*.app.yourdomain.com`)

### Why Two Domains?

- **Clear separation** between marketing and application
- **Better SEO** for marketing site
- **Cookie isolation** between sites
- **Easier SSL management**

### Wildcard DNS Requirements

The protected app requires **wildcard subdomain** support:
- `acme.yourdomain.app` → Protected app
- `startup.yourdomain.app` → Protected app
- `company.yourdomain.app` → Protected app

Vercel handles wildcard routing automatically once configured.

---

## Deploy Marketing App

The marketing app is your public-facing site for user acquisition and tenant discovery.

### Step 1: Import from GitHub

1. Log in to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New** → **Project**
3. Select your GitHub repository
4. Click **Import**

### Step 2: Configure Build Settings

Configure the project settings:

**Framework Preset**: `Next.js`

**Root Directory**: `apps/marketing`

**Build Command**:
```bash
cd ../.. && pnpm install && pnpm build --filter=marketing
```

**Output Directory**: `.next` (default)

**Install Command**:
```bash
pnpm install
```

**Development Command**: 
```bash
pnpm dev
```

### Step 3: Set Environment Variables

Add the following environment variables in Vercel project settings:

#### Required Variables

```bash
# App Identity
NEXT_PUBLIC_MARKETING_DOMAIN=yourdomain.com
NEXT_PUBLIC_APP_DOMAIN=yourdomain.app
NEXT_PUBLIC_APP_NAME=Your App
APP_NAME=Your App

# Supabase (Production)
NEXT_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=eyJhbG...
SUPABASE_SECRET_KEY=eyJhbG...

# Resend (Production)
RESEND_API_KEY=re_...
SENDER_EMAIL=noreply@yourdomain.com
EMAIL_DOMAIN=yourdomain.com
NEXT_PUBLIC_SUPPORT_EMAIL=support@yourdomain.com
RESEND_ENABLE_INVITATION_EMAILS=true
RESEND_ENABLE_WELCOME_EMAILS=true
RESEND_VERIFY_EMAILS=true
```

#### Optional Variables

```bash
# Sentry (if using error tracking)
SENTRY_DSN=https://...
SENTRY_ORG=your-org
SENTRY_PROJECT=marketing-app
SENTRY_AUTH_TOKEN=...

# Environment tracking
APP_ENV=production
NEXT_PUBLIC_APP_ENV=production
```

### Step 4: Deploy

1. Click **Deploy**
2. Wait for build to complete (~2-3 minutes)
3. Vercel will provide a deployment URL (e.g., `marketing-app.vercel.app`)

### Step 5: Add Custom Domain

1. Go to **Settings** → **Domains**
2. Add your marketing domain: `yourdomain.com`
3. Configure DNS records (see [DNS Configuration](#dns--ssl-configuration))
4. Wait for SSL certificate provisioning (~5 minutes)

---

## Deploy Protected App

The protected app serves multi-tenant workspaces with subdomain routing.

### Step 1: Import from GitHub

1. In [Vercel Dashboard](https://vercel.com/dashboard), click **Add New** → **Project**
2. Select the **same GitHub repository**
3. Click **Import**

### Step 2: Configure Build Settings

**Framework Preset**: `Next.js`

**Root Directory**: `apps/protected`

**Build Command**:
```bash
cd ../.. && pnpm install && pnpm build --filter=protected
```

**Output Directory**: `.next` (default)

**Install Command**:
```bash
pnpm install
```

**Development Command**: 
```bash
pnpm dev
```

### Step 3: Set Environment Variables

Add all environment variables from marketing app, **plus**:

#### Stripe Variables (Required for Billing)

```bash
# Stripe Production Keys
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...  # Will set this after webhook creation

# Stripe Price IDs (from your Stripe dashboard)
STRIPE_FREE_MONTHLY_PRICE_ID=price_...
STRIPE_FREE_YEARLY_PRICE_ID=price_...
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_YEARLY_PRICE_ID=price_...
STRIPE_BUSINESS_MONTHLY_PRICE_ID=price_...
STRIPE_BUSINESS_YEARLY_PRICE_ID=price_...
STRIPE_ENTERPRISE_MONTHLY_PRICE_ID=price_...
STRIPE_ENTERPRISE_YEARLY_PRICE_ID=price_...
```

⚠️ **Important**: Use Stripe **live mode** keys for production, not test mode.

### Step 4: Deploy

1. Click **Deploy**
2. Wait for build to complete
3. Vercel will provide a deployment URL

### Step 5: Add Custom Domain with Wildcard

1. Go to **Settings** → **Domains**
2. Add your protected domain: `yourdomain.app`
3. Add wildcard domain: `*.yourdomain.app`
4. Configure DNS records (see below)
5. Wait for SSL certificate provisioning

⚠️ **Important**: Both `yourdomain.app` and `*.yourdomain.app` must be added.

---

## Supabase Production Setup

Set up your production Supabase project separately from development.

### Step 1: Create Production Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Create a new project
3. Choose a strong database password
4. Select region closest to your users
5. Wait for provisioning (~2 minutes)

### Step 2: Run Database Migrations

Run all schema files in the production database:

1. Navigate to **SQL Editor** in Supabase Dashboard
2. Run migrations in order:

```
00_extensions.sql      → PostgreSQL extensions
01_enums.sql           → Custom types
02_tables.sql          → All tables
03_functions.sql       → Functions (including JWT hook)
04_views.sql           → Views
05_rls_policies.sql    → RLS policies
seed_data.sql          → Seed data (subscription tiers)
```

3. Verify all tables were created successfully

### Step 3: Configure Auth Settings

#### Set Redirect URLs

1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL**: `https://yourdomain.app`
3. Add **Redirect URLs**:
   - `https://yourdomain.com/auth/callback`
   - `https://yourdomain.app/auth/callback`
   - `https://*.yourdomain.app/auth/callback` (wildcard)

#### Enable Custom Access Token Hook

1. Go to **Authentication** → **Hooks**
2. Enable **Custom Access Token Hook**
3. Set function: `custom_claims_hook`
4. Save changes

#### Configure JWT Settings (Optional)

1. Go to **Authentication** → **Settings** → **JWT Settings**
2. Set **JWT Expiry**: `3600` (1 hour recommended)
3. Save changes

### Step 4: Deploy Edge Functions

Deploy email-sending edge functions:

```bash
# Login to Supabase (if not already)
supabase login

# Link to production project
supabase link --project-ref your-production-project-ref

# Deploy functions
supabase functions deploy send-email
supabase functions deploy send-custom-email
```

### Step 5: Set Edge Function Secrets

Set environment variables for edge functions:

1. Go to **Edge Functions** → **Settings** → **Secrets**
2. Add these secrets:

```bash
RESEND_API_KEY=re_...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...  # Service role key
SEND_EMAIL_HOOK_SECRET=your-webhook-secret
NEXT_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co
NEXT_PUBLIC_APP_DOMAIN=yourdomain.app
NEXT_PUBLIC_MARKETING_DOMAIN=yourdomain.com
APP_NAME=Your App
SENDER_EMAIL=noreply@yourdomain.com
EMAIL_DOMAIN=yourdomain.com
NEXT_PUBLIC_SUPPORT_EMAIL=support@yourdomain.com
RESEND_ENABLE_INVITATION_EMAILS=true
RESEND_ENABLE_WELCOME_EMAILS=true
RESEND_VERIFY_EMAILS=true
```

### Step 6: Create Storage Buckets

Create storage buckets for file uploads:

#### Organization Logos

1. Go to **Storage** → **New bucket**
2. Name: `organization-logos`
3. Public bucket: **Yes**
4. File size limit: `5242880` (5MB)
5. Allowed MIME types: `image/jpeg, image/png, image/svg+xml, image/webp`

#### Profile Avatars

1. Create another bucket: `profile-avatars`
2. Public bucket: **Yes**
3. File size limit: `2097152` (2MB)
4. Allowed MIME types: `image/jpeg, image/png, image/webp`

---

## Stripe Production Setup

Configure Stripe for production billing.

### Step 1: Switch to Live Mode

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Toggle from **Test mode** to **Live mode** (top right)

### Step 2: Create Products & Prices

Create four products with monthly and yearly pricing:

#### Free Tier
- Product name: `Free`
- Monthly price: `$0`
- Yearly price: `$0`
- Copy Price IDs

#### Pro Tier
- Product name: `Pro`
- Monthly price: `$29/month`
- Yearly price: `$290/year` (2 months free)
- Copy Price IDs

#### Business Tier
- Product name: `Business`
- Monthly price: `$99/month`
- Yearly price: `$990/year`
- Copy Price IDs

#### Enterprise Tier
- Product name: `Enterprise`
- Monthly price: `$299/month`
- Yearly price: `$2990/year`
- Copy Price IDs

See [STRIPE.md](./STRIPE.md) for detailed setup instructions.

### Step 3: Create Webhook Endpoint

1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Endpoint URL: `https://yourdomain.app/api/webhooks/stripe`
4. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `checkout.session.completed`
   - `customer.updated`
   - `customer.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `invoice.finalized`
   - `payment_method.attached`
   - `payment_method.detached`
   - `payment_method.updated`
5. Click **Add endpoint**

### Step 4: Add Webhook Secret to Vercel

1. Copy the webhook signing secret (starts with `whsec_`)
2. Go to Vercel → Protected App → **Settings** → **Environment Variables**
3. Add/Update: `STRIPE_WEBHOOK_SECRET=whsec_...`
4. Redeploy the app

### Step 5: Update Price IDs

Update all 8 Stripe price ID environment variables in Vercel with your production price IDs.

---

## DNS & SSL Configuration

Configure DNS records to point your domains to Vercel.

### Marketing App DNS

Add these DNS records for `yourdomain.com`:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | `76.76.21.21` | 3600 |
| CNAME | www | `cname.vercel-dns.com` | 3600 |

**Or** if using CNAME for apex:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| CNAME | @ | `cname.vercel-dns.com` | 3600 |
| CNAME | www | `cname.vercel-dns.com` | 3600 |

### Protected App DNS (with Wildcard)

Add these DNS records for `yourdomain.app`:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | `76.76.21.21` | 3600 |
| CNAME | * | `cname.vercel-dns.com` | 3600 |

The wildcard `*` CNAME enables subdomain routing (e.g., `acme.yourdomain.app`).

### SSL Certificate Provisioning

After DNS configuration:

1. Vercel automatically provisions SSL certificates via Let's Encrypt
2. This usually takes 5-10 minutes
3. Check **Settings** → **Domains** for SSL status
4. Green checkmark = SSL active

⚠️ **Wildcard SSL**: Vercel handles wildcard SSL automatically. No additional configuration needed.

---

## Post-Deployment Testing

Verify everything works correctly.

### Step 1: Test Marketing Site

1. Visit `https://yourdomain.com`
2. Verify landing page loads
3. Check that signup form appears
4. Verify links work

### Step 2: Create Test Organization

1. Go to signup page
2. Create a test organization with subdomain `test`
3. Check email for verification link
4. Click verification link
5. Should redirect to `https://test.yourdomain.app`

### Step 3: Test Protected App

1. Verify redirect to `https://test.yourdomain.app/dashboard`
2. Check that dashboard loads
3. Navigate to Settings → verify all pages load
4. Test team invitations
5. Test project creation

### Step 4: Test Subdomain Isolation

1. Create another organization with subdomain `demo`
2. Log in as different user
3. Verify cannot access `test.yourdomain.app` with `demo` user's session
4. Verify RLS policies are working

### Step 5: Test Billing (if configured)

1. Go to Settings → Billing
2. Click **Upgrade Plan**
3. Use test card: `4242 4242 4242 4242`
4. Complete checkout
5. Verify webhook synced subscription to database
6. Check Stripe dashboard for subscription

### Step 6: Test Email Sending

1. Invite a team member
2. Verify invitation email is received
3. Check Resend dashboard for email delivery
4. Test password reset email

---

## Optional: Monitoring & Analytics

### Sentry Error Tracking

#### Setup Sentry Projects

1. Go to [Sentry Dashboard](https://sentry.io)
2. Create two projects:
   - `marketing-app`
   - `protected-app`
3. Copy DSN for each project

#### Add to Environment Variables

```bash
# Marketing App
SENTRY_DSN=https://...@sentry.io/marketing-app
SENTRY_ORG=your-org
SENTRY_PROJECT=marketing-app
SENTRY_AUTH_TOKEN=...  # For source maps

# Protected App
SENTRY_DSN=https://...@sentry.io/protected-app
SENTRY_ORG=your-org
SENTRY_PROJECT=protected-app
SENTRY_AUTH_TOKEN=...
```

#### Enable Source Maps Upload

Both apps are already configured for Sentry. Set the auth token to enable source map uploads.

### Checkly Uptime Monitoring

1. Go to [Checkly Dashboard](https://app.checklyhq.com)
2. Create checks for:
   - Marketing site: `https://yourdomain.com`
   - Protected app: `https://test.yourdomain.app` (use test org)
3. Set check frequency (e.g., 5 minutes)
4. Configure alerts (email, Slack, etc.)

### Vercel Analytics

Enable Vercel Analytics for both projects:

1. Go to project **Settings** → **Analytics**
2. Enable **Web Analytics**
3. View analytics at **Analytics** tab

---

## Troubleshooting

### Common Deployment Issues

#### Build Failures

**Symptom**: Deployment fails during build

**Solutions**:
- Check build logs in Vercel dashboard
- Verify `pnpm-lock.yaml` is committed
- Ensure all dependencies are in `package.json`
- Check for TypeScript errors locally: `pnpm type-check`
- Verify build command includes root install: `cd ../.. && pnpm install`

#### Environment Variable Issues

**Symptom**: App crashes or shows errors about missing env vars

**Solutions**:
- Verify all required variables are set in Vercel
- Check variable names match exactly (case-sensitive)
- Redeploy after adding variables
- Use `NEXT_PUBLIC_` prefix for client-accessible variables

#### Domain Not Resolving

**Symptom**: Domain shows 404 or doesn't load

**Solutions**:
- Wait 24-48 hours for DNS propagation
- Use `nslookup yourdomain.com` to check DNS
- Verify DNS records are correct
- Check Vercel domain status (green checkmark)
- Clear browser DNS cache: `chrome://net-internals/#dns`

#### SSL Certificate Not Provisioning

**Symptom**: SSL status shows error or pending

**Solutions**:
- Wait 15-30 minutes for initial provisioning
- Verify DNS is correctly configured
- Remove and re-add domain in Vercel
- Check domain ownership is verified
- Contact Vercel support if persists

#### Wildcard Subdomain Not Working

**Symptom**: `acme.yourdomain.app` returns 404

**Solutions**:
- Verify `*.yourdomain.app` is added in Vercel domains
- Check wildcard CNAME record exists in DNS
- Wait for DNS propagation
- Test with `dig *.yourdomain.app` to verify DNS
- Clear browser cache

#### Auth Callback Errors

**Symptom**: "Auth callback error" or redirect failures

**Solutions**:
- Verify redirect URLs in Supabase Auth settings
- Add wildcard redirect: `https://*.yourdomain.app/auth/callback`
- Check site URL is correct: `https://yourdomain.app`
- Clear browser cookies and retry
- Check Supabase Auth logs

#### Stripe Webhook Not Working

**Symptom**: Subscriptions not syncing to database

**Solutions**:
- Verify webhook URL: `https://yourdomain.app/api/webhooks/stripe`
- Check webhook secret is set in Vercel env vars
- View webhook logs in Stripe Dashboard
- Test webhook delivery: Stripe Dashboard → Webhooks → Test
- Verify webhook events are selected
- Check Vercel function logs

#### Database Connection Issues

**Symptom**: "Could not connect to database" errors

**Solutions**:
- Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- Check `SUPABASE_SECRET_KEY` is set
- Verify Supabase project is active (not paused)
- Check database connection pooler settings
- Review Supabase logs for connection errors

#### Email Not Sending

**Symptom**: Verification or invitation emails not received

**Solutions**:
- Verify Resend API key is valid
- Check domain is verified in Resend
- Review Resend logs for delivery status
- Verify edge function secrets are set
- Check sender email is allowed by Resend
- Test edge function manually in Supabase dashboard

---

## Production Checklist

Before going live, verify:

- [ ] Both apps deployed successfully
- [ ] Custom domains configured and SSL active
- [ ] All environment variables set correctly
- [ ] Database migrations ran successfully
- [ ] Auth redirect URLs configured
- [ ] JWT custom claims hook enabled
- [ ] Edge functions deployed and secrets set
- [ ] Stripe webhook configured (if using billing)
- [ ] Email sending tested and working
- [ ] Subdomain routing working
- [ ] RLS policies tested for data isolation
- [ ] Error tracking enabled (Sentry)
- [ ] Uptime monitoring configured (optional)
- [ ] Backup strategy in place (Supabase auto-backups)
- [ ] Domain ownership verified
- [ ] SSL certificates provisioned for all domains

---

## Next Steps

After successful deployment:

1. **Monitor Performance**: Use Vercel Analytics and Sentry
2. **Set Up Backups**: Configure Supabase backup schedule
3. **Create Runbook**: Document incident response procedures
4. **Configure Alerts**: Set up alerts for downtime and errors
5. **Plan Scaling**: Monitor usage and plan for scaling needs

---

## Additional Resources

- **[Getting Started](./GETTING_STARTED.md)** - Local development setup
- **[Architecture](./ARCHITECTURE.md)** - Platform architecture overview
- **[Database](./DATABASE.md)** - Database schema reference
- **[Stripe Setup](./STRIPE.md)** - Billing integration guide
- **[Vercel Documentation](https://vercel.com/docs)** - Official Vercel docs
- **[Supabase Documentation](https://supabase.com/docs)** - Official Supabase docs

---

**Need Help?** Check [GitHub Discussions](https://github.com/your-repo/discussions) or contact support.
