# Vercel Deployment Guide

This guide walks you through deploying both the **Marketing** and **Protected** apps to Vercel by importing from your GitHub repository.

## Prerequisites

- ✅ GitHub repository with your code pushed
- ✅ Vercel account (sign up at [vercel.com](https://vercel.com))
- ✅ Environment variables ready (from your local `.env` files or existing projects)

## Overview

You'll create **two separate Vercel projects** from the same GitHub repository:

1. **Marketing App** - Public marketing site (`apps/marketing`)
2. **Protected App** - Multi-tenant application with subdomain routing (`apps/protected`)

---

## Step 1: Import Marketing App Project

### 1.1 Navigate to Vercel Dashboard

1. Go to [vercel.com](https://vercel.com) and log in
2. Click **"Add New..."** → **"Project"**

### 1.2 Import from GitHub

1. Click **"Import Git Repository"**
2. Select your GitHub repository from the list
3. If you don't see your repo, click **"Adjust GitHub App Permissions"** and grant access
4. Click **"Import"** on your repository

### 1.3 Configure Marketing App

**Project Settings:**

- **Project Name**: `marketing` (or your preferred name)
- **Framework Preset**: Next.js (auto-detected)
- **Root Directory**: Click **"Edit"** and set to: `apps/marketing`
- **Build Command**: Leave default (Vercel auto-detects `next build`)
- **Output Directory**: Leave default (`.next`)
- **Install Command**: `pnpm install` (or `npm install` if not using pnpm)

**Environment Variables:**

1. Click **"Environment Variables"** section
2. Click **"Import"** button (if you have an existing project with env vars)
   - OR manually add each variable (see [Environment Variables Reference](#environment-variables-reference) below)
3. Add all required environment variables for the marketing app

### 1.4 Deploy Marketing App

1. Click **"Deploy"** button
2. Wait for the build to complete (usually 2-5 minutes)
3. Once deployed, note the deployment URL (e.g., `marketing-xyz.vercel.app`)

---

## Step 2: Import Protected App Project

### 2.1 Create Second Project

1. In Vercel dashboard, click **"Add New..."** → **"Project"** again
2. Click **"Import Git Repository"**
3. **Select the same GitHub repository** (yes, same repo, different project!)

### 2.2 Configure Protected App

**Project Settings:**

- **Project Name**: `protected` (or your preferred name)
- **Framework Preset**: Next.js (auto-detected)
- **Root Directory**: Click **"Edit"** and set to: `apps/protected`
- **Build Command**: Leave default (Vercel auto-detects `next build`)
- **Output Directory**: Leave default (`.next`)
- **Install Command**: `pnpm install` (or `npm install` if not using pnpm)

**Environment Variables:**

1. Click **"Environment Variables"** section
2. Click **"Import"** button
   - If you just set up the marketing app, you can import from it
   - OR manually add each variable
3. Add all required environment variables for the protected app
   - **Note**: Protected app needs additional variables (see below)

### 2.3 Deploy Protected App

1. Click **"Deploy"** button
2. Wait for the build to complete
3. Once deployed, note the deployment URL (e.g., `protected-xyz.vercel.app`)

---

## Step 3: Import Environment Variables

### Option A: Import from Existing Project

If you have an existing Vercel project with environment variables:

1. In your new project, go to **Settings** → **Environment Variables**
2. Click **"Import"** button
3. Select the source project from the dropdown
4. Review and select which variables to import
5. Click **"Import"** to add them

### Option B: Manual Entry

Add environment variables manually. See [Environment Variables Reference](#environment-variables-reference) below.

### Option C: Bulk Import via CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Link your project
cd apps/marketing  # or apps/protected
vercel link

# Pull environment variables from existing project
vercel env pull .env.local

# Push to new project (after linking)
vercel env add VARIABLE_NAME
```

---

## Step 4: Configure Custom Domains

### 4.1 Marketing App Domain

1. Go to your **Marketing** project in Vercel
2. Navigate to **Settings** → **Domains**
3. Click **"Add Domain"**
4. Enter your marketing domain (e.g., `bask-app.com`)
5. Follow DNS configuration instructions
6. Add DNS records to your domain provider

### 4.2 Protected App Domain

1. Go to your **Protected** project in Vercel
2. Navigate to **Settings** → **Domains**
3. Click **"Add Domain"**
4. Enter your protected domain (e.g., `ghostwrite.app`)
5. **Important**: Also add wildcard subdomain: `*.ghostwrite.app`
   - This allows tenant subdomains like `company.ghostwrite.app`
6. Follow DNS configuration instructions
7. Add DNS records to your domain provider

**DNS Records Example:**

```
Type    Name              Value
A       @                 <Vercel IP>
CNAME   *.ghostwrite.app  cname.vercel-dns.com
```

---

## Step 5: Update Environment Variables with Domains

After setting up domains, update these environment variables in both projects:

**Marketing App:**
- `NEXT_PUBLIC_MARKETING_DOMAIN=bask-app.com`

**Protected App:**
- `NEXT_PUBLIC_APP_DOMAIN=ghostwrite.app`
- `NEXT_PUBLIC_MARKETING_DOMAIN=bask-app.com`

Then **redeploy** both projects to pick up the new domain values.

---

## Environment Variables Reference

### Marketing App Required Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-anon-key
SUPABASE_SECRET_KEY=your-service-role-key
SUPABASE_URL=https://your-project.supabase.co

# Domains
NEXT_PUBLIC_MARKETING_DOMAIN=bask-app.com
NEXT_PUBLIC_APP_DOMAIN=ghostwrite.app

# App Info
APP_NAME=Ghost Write Ai
NEXT_PUBLIC_APP_NAME=Ghost Write Ai

# Email (Resend)
RESEND_API_KEY=your-resend-api-key
EMAIL_DOMAIN=auth.voltguardai.com
SENDER_EMAIL=support@auth.voltguardai.com
SUPPORT_EMAIL=support@auth.voltguardai.com
RESEND_ENABLE_INVITATION_EMAILS=true
RESEND_ENABLE_WELCOME_EMAILS=true
RESEND_VERIFY_EMAILS=true

# Sentry (Optional)
SENTRY_DSN=your-sentry-dsn
SENTRY_AUTH_TOKEN=your-sentry-token
SENTRY_ORG=your-sentry-org
SENTRY_PROJECT=your-sentry-project
```

### Protected App Required Variables

**All Marketing variables PLUS:**

```bash
# Stripe (if using billing)
STRIPE_SECRET_KEY=your-stripe-secret-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
STRIPE_FREE_MONTHLY_PRICE_ID=price_xxx
STRIPE_FREE_YEARLY_PRICE_ID=price_xxx
STRIPE_PRO_MONTHLY_PRICE_ID=price_xxx
STRIPE_PRO_YEARLY_PRICE_ID=price_xxx
STRIPE_ENTERPRISE_MONTHLY_PRICE_ID=price_xxx
STRIPE_ENTERPRISE_YEARLY_PRICE_ID=price_xxx

# Database (if needed)
POSTGRES_URL=your-postgres-url
POSTGRES_PRISMA_URL=your-prisma-url
POSTGRES_URL_NON_POOLING=your-non-pooling-url
POSTGRES_USER=your-postgres-user
POSTGRES_PASSWORD=your-postgres-password
POSTGRES_DATABASE=your-database-name
POSTGRES_HOST=your-postgres-host
SUPABASE_JWT_SECRET=your-jwt-secret
SUPABASE_SSL_CERT=your-ssl-cert
```

### Setting Environment Variables for All Environments

When adding environment variables in Vercel, you can set them for:

- **Production** - Live deployments
- **Preview** - Pull request previews
- **Development** - Local development (if using Vercel CLI)

**Best Practice**: Set variables for all three environments unless they're environment-specific.

---

## Turborepo-Specific Configuration

### Build Settings

Vercel automatically detects Next.js, but for Turborepo monorepos, ensure:

1. **Root Directory** is set correctly:
   - Marketing: `apps/marketing`
   - Protected: `apps/protected`

2. **Install Command**: `pnpm install` (or `npm install`)

3. **Build Command**: Vercel auto-detects `next build` - this is correct

4. **Node.js Version**: Set to `20.x` in **Settings** → **General**

### Monorepo Considerations

- Vercel will install dependencies at the **repository root** (correct for pnpm workspaces)
- Builds run from the **root directory** you specified
- Shared packages (`@workspace/ui`, `@workspace/supabase`) are automatically resolved

---

## Verification Checklist

After deployment, verify:

### Marketing App
- [ ] Marketing site loads at your custom domain
- [ ] Sign up/login forms work
- [ ] Supabase connection is working
- [ ] Email sending works (test signup)

### Protected App
- [ ] Protected app loads at your custom domain
- [ ] Subdomain routing works (e.g., `company.ghostwrite.app`)
- [ ] Authentication works
- [ ] Tenant isolation is working
- [ ] Database connections work

### Both Apps
- [ ] Environment variables are set correctly
- [ ] Builds complete successfully
- [ ] No console errors in browser
- [ ] Sentry error tracking works (if configured)

---

## Troubleshooting

### Build Fails: "Cannot find module"

**Issue**: Workspace packages not found

**Solution**:
1. Ensure **Root Directory** is set to `apps/marketing` or `apps/protected`
2. Verify **Install Command** is `pnpm install`
3. Check that `pnpm-workspace.yaml` is in the repo root

### Build Fails: Environment Variable Missing

**Issue**: Build fails with "undefined" environment variable

**Solution**:
1. Go to **Settings** → **Environment Variables**
2. Add missing variable
3. Redeploy the project

### Subdomains Not Working

**Issue**: `company.ghostwrite.app` doesn't load

**Solution**:
1. Verify wildcard domain `*.ghostwrite.app` is added in Vercel
2. Check DNS records include CNAME for `*.ghostwrite.app`
3. Wait for DNS propagation (can take up to 48 hours)
4. Verify `NEXT_PUBLIC_APP_DOMAIN` is set correctly

### Import Environment Variables Not Available

**Issue**: "Import" button is grayed out or no projects shown

**Solution**:
1. Ensure you have at least one other Vercel project in the same team
2. Projects must be in the same Vercel team/account
3. Try manual entry instead

---

## Quick Deploy Commands (Alternative)

If you prefer CLI deployment:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy Marketing App
cd apps/marketing
vercel --prod

# Deploy Protected App
cd ../protected
vercel --prod
```

**Note**: CLI deployment still requires configuring root directory and environment variables in the Vercel dashboard.

---

## Next Steps

After successful deployment:

1. **Set up DNS** for your custom domains
2. **Configure wildcard subdomain** for protected app
3. **Test authentication flows** on production
4. **Set up monitoring** (Sentry, Vercel Analytics)
5. **Configure CI/CD** (GitHub Actions can trigger Vercel deployments)

---

## Support

- [Vercel Documentation](https://vercel.com/docs)
- [Turborepo + Vercel](https://turbo.build/repo/docs/deploy/vercel)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
