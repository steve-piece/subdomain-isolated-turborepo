# 💳 Stripe Integration Guide

Complete guide to setting up Stripe billing and subscription management for your multi-tenant SaaS platform.

---

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Stripe Account Setup](#stripe-account-setup)
- [Product & Price Configuration](#product--price-configuration)
- [Environment Configuration](#environment-configuration)
- [Database Integration](#database-integration)
- [Webhook Setup](#webhook-setup)
- [Local Development](#local-development)
- [Testing](#testing)
- [Production Deployment](#production-deployment)
- [Usage Examples](#usage-examples)
- [Integration Points](#integration-points-optional)
- [Troubleshooting](#troubleshooting)

---

## Overview

The platform integrates Stripe for complete subscription management:

### Features

✅ **Subscription Management**
- Create and manage subscriptions
- Upgrade/downgrade plans
- Cancel subscriptions
- View subscription status

✅ **Payment Processing**
- Stripe Checkout for new subscriptions
- Stripe Billing Portal for managing existing subscriptions
- Payment method management
- Invoice generation and tracking

✅ **Usage Tracking**
- Track team members, projects, storage, and API calls
- Enforce usage limits based on subscription tier
- Display real-time usage metrics

✅ **Webhooks**
- Automatic database sync via Stripe webhooks
- Event logging and error tracking
- Idempotent webhook processing

### Architecture

The integration uses:
- **Server Actions** for Stripe API calls (`apps/protected/app/actions/billing/`)
- **Webhook Handler** for event processing (`apps/protected/app/api/webhooks/stripe/route.ts`)
- **Database Tables** for subscription data (see [DATABASE.md](./DATABASE.md))
- **RLS Policies** for secure data access

---

## Prerequisites

### Required Accounts

- **Stripe Account** - [Sign up](https://stripe.com)
  - Use **test mode** for development
  - Use **live mode** for production

### Existing Setup

Ensure you've completed:
- ✅ [Getting Started Guide](./GETTING_STARTED.md)
- ✅ Database migrations (subscription tables)
- ✅ Supabase configuration
- ✅ Local development working

---

## Stripe Account Setup

### Step 1: Create Stripe Account

1. Go to [Stripe Signup](https://dashboard.stripe.com/register)
2. Complete registration
3. Verify email address
4. Complete business profile (can skip for testing)

### Step 2: Get API Keys

#### For Development (Test Mode)

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Ensure **Test mode** is enabled (toggle in top right)
3. Navigate to **Developers** → **API keys**
4. Copy these keys:
   - **Publishable key**: `pk_test_...`
   - **Secret key**: `sk_test_...` (click "Reveal test key")

⚠️ **Never commit secret keys to version control**

#### For Production (Live Mode)

1. Toggle to **Live mode** in Stripe dashboard
2. Navigate to **Developers** → **API keys**
3. Copy live keys:
   - **Publishable key**: `pk_live_...`
   - **Secret key**: `sk_live_...`

---

## Product & Price Configuration

Create four subscription tiers matching your database seed data.

### Step 1: Create Products

Navigate to **Products** in Stripe Dashboard and create:

#### Free Tier

1. Click **Add product**
2. **Name**: `Free`
3. **Description**: `For individuals and small teams getting started`
4. **Pricing model**: `Flat rate`
5. Create two prices:

**Monthly Price**:
- Amount: `$0.00`
- Billing period: `Monthly`
- Copy the Price ID: `price_...` → Use for `STRIPE_FREE_MONTHLY_PRICE_ID`

**Yearly Price**:
- Amount: `$0.00`
- Billing period: `Yearly`
- Copy the Price ID: `price_...` → Use for `STRIPE_FREE_YEARLY_PRICE_ID`

#### Pro Tier

1. Create product: `Pro`
2. **Description**: `For growing teams with advanced needs`
3. Create two prices:

**Monthly Price**:
- Amount: `$29.00`
- Billing period: `Monthly`
- Copy Price ID → `STRIPE_PRO_MONTHLY_PRICE_ID`

**Yearly Price**:
- Amount: `$290.00` (2 months free)
- Billing period: `Yearly`
- Copy Price ID → `STRIPE_PRO_YEARLY_PRICE_ID`

#### Business Tier

1. Create product: `Business`
2. **Description**: `For large teams requiring custom permissions`
3. Create two prices:

**Monthly Price**:
- Amount: `$99.00`
- Billing period: `Monthly`
- Copy Price ID → `STRIPE_BUSINESS_MONTHLY_PRICE_ID`

**Yearly Price**:
- Amount: `$990.00` (2 months free)
- Billing period: `Yearly`
- Copy Price ID → `STRIPE_BUSINESS_YEARLY_PRICE_ID`

#### Enterprise Tier

1. Create product: `Enterprise`
2. **Description**: `For large organizations with advanced requirements`
3. Create two prices:

**Monthly Price**:
- Amount: `$299.00`
- Billing period: `Monthly`
- Copy Price ID → `STRIPE_ENTERPRISE_MONTHLY_PRICE_ID`

**Yearly Price**:
- Amount: `$2990.00` (2 months free)
- Billing period: `Yearly`
- Copy Price ID → `STRIPE_ENTERPRISE_YEARLY_PRICE_ID`

### Step 2: Configure Product Metadata (Optional)

Add metadata to products for additional context:

1. Edit each product
2. Go to **Metadata** section
3. Add key-value pairs:
   ```
   tier_name: free|pro|business|enterprise
   max_projects: 3|25|100|unlimited
   max_team_members: 5|25|100|unlimited
   allows_custom_permissions: false|false|true|true
   ```

---

## Environment Configuration

### Step 1: Add to Protected App .env.local

Add these variables to `apps/protected/.env.local` (Stripe is only used in the protected app):

```bash
# Stripe API Keys (Test Mode)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...  # Will get this after webhook setup

# Stripe Price IDs
STRIPE_FREE_MONTHLY_PRICE_ID=price_...
STRIPE_FREE_YEARLY_PRICE_ID=price_...
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_YEARLY_PRICE_ID=price_...
STRIPE_BUSINESS_MONTHLY_PRICE_ID=price_...
STRIPE_BUSINESS_YEARLY_PRICE_ID=price_...
STRIPE_ENTERPRISE_MONTHLY_PRICE_ID=price_...
STRIPE_ENTERPRISE_YEARLY_PRICE_ID=price_...

# Required for webhook handler
SUPABASE_SECRET_KEY=your_supabase_service_role_key
```

### Step 2: Update Price IDs in Database (Optional)

Optionally sync Stripe price IDs to your `subscription_tiers` table:

```sql
-- Update subscription_tiers with Stripe IDs
UPDATE subscription_tiers 
SET stripe_price_id = 'price_...' -- your monthly price ID
WHERE name = 'free' AND stripe_price_id IS NULL;

-- Repeat for all tiers
```

---

## Database Integration

The Stripe integration uses these tables (already created if you ran migrations):

### Key Tables

- **`subscription_tiers`** - Defines Free, Pro, Business, Enterprise
- **`subscriptions`** - Active subscriptions per organization
- **`customer_billing_profiles`** - Stripe customer information
- **`payment_methods`** - Saved payment methods
- **`invoices`** - Billing history
- **`feature_limits`** - Tier-based feature limits
- **`usage_metrics`** - Organization usage tracking
- **`stripe_webhook_events`** - Webhook event log

See [DATABASE.md](./DATABASE.md) for complete schema reference.

### Verify Seed Data

Check that subscription tiers exist:

```sql
SELECT id, name, max_projects, max_team_members, allows_custom_permissions
FROM subscription_tiers
ORDER BY created_at;
```

You should see four tiers: Free, Pro, Business, Enterprise.

---

## Webhook Setup

Webhooks keep your database in sync with Stripe events.

### Local Development Webhooks

#### Step 1: Install Stripe CLI

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Windows (via Scoop)
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe

# Linux
# Download from https://github.com/stripe/stripe-cli/releases
```

#### Step 2: Login to Stripe CLI

```bash
stripe login
```

This opens a browser to authenticate.

#### Step 3: Forward Webhooks

```bash
# Start webhook forwarding
stripe listen --forward-to localhost:3003/api/webhooks/stripe
```

**Output**:
```
> Ready! Your webhook signing secret is whsec_... (^C to quit)
```

Copy the webhook signing secret and add to `apps/protected/.env.local`:

```bash
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### Step 4: Restart Dev Server

```bash
# Restart to load new env variable
pnpm dev
```

Keep the Stripe CLI running in a separate terminal while developing.

### Production Webhooks

See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md#stripe-production-setup) for production webhook configuration.

---

## Local Development

### Start Development Environment

```bash
# Terminal 1: Start dev servers
pnpm dev

# Terminal 2: Forward webhooks
stripe listen --forward-to localhost:3003/api/webhooks/stripe
```

### Test Checkout Flow

1. Navigate to `http://[company].localhost:3003`
2. Go to **Settings** → **Billing**
3. Click **Upgrade Plan**
4. Select a plan (Pro, Business, or Enterprise)
5. Click **Subscribe**
6. Redirects to Stripe Checkout
7. Use test card: `4242 4242 4242 4242`
8. Complete checkout
9. Webhook updates database automatically
10. Verify subscription in database:

```sql
SELECT * FROM subscriptions WHERE org_id = 'your-org-id';
```

---

## Testing

### Test Cards

Use these test card numbers in Stripe Checkout:

| Card Number | Scenario |
|:------------|:---------|
| `4242 4242 4242 4242` | Payment succeeds |
| `4000 0000 0000 0002` | Payment declined |
| `4000 0025 0000 3155` | Requires 3D Secure authentication |
| `4000 0000 0000 9995` | Insufficient funds |

> **Test card details**: Expiry = any future date, CVC = any 3 digits, ZIP = any 5 digits

### Trigger Test Events

Use Stripe CLI to trigger events:

```bash
# Test subscription created
stripe trigger customer.subscription.created

# Test subscription updated
stripe trigger customer.subscription.updated

# Test invoice paid
stripe trigger invoice.paid

# Test payment failed
stripe trigger invoice.payment_failed
```

### Verify Webhook Processing

Check that webhooks are processed:

```sql
-- View webhook events
SELECT 
  event_type,
  processed,
  error,
  created_at
FROM stripe_webhook_events
ORDER BY created_at DESC
LIMIT 10;
```

### Test Subscription Upgrade

1. Create organization with Free tier (default)
2. Upgrade to Pro tier
3. Verify:
   - Database updated: `subscriptions` table
   - Invoice created: `invoices` table
   - Payment method saved: `payment_methods` table
   - Stripe customer created: `customer_billing_profiles` table

### Test Subscription Cancellation

```typescript
// In component or server action
const result = await cancelSubscriptionAtPeriodEnd(orgId);
```

Verify:
- `subscriptions.cancel_at_period_end` = `true`
- Subscription remains active until period end
- Webhook updates database

---

## Production Deployment

### Step 1: Switch to Live Mode

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Toggle from **Test mode** to **Live mode**
3. Create products and prices (same as test mode)
4. Copy live API keys

### Step 2: Update Environment Variables

In Vercel (or your deployment platform):

```bash
# Live API keys
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Live Price IDs
STRIPE_FREE_MONTHLY_PRICE_ID=price_...  # Live price IDs
STRIPE_FREE_YEARLY_PRICE_ID=price_...
# ... (update all 8 price IDs)
```

### Step 3: Create Production Webhook

1. Go to **Developers** → **Webhooks** → **Add endpoint**
2. Endpoint URL: `https://protecteddomain.com/api/webhooks/stripe`
3. Select events:
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
4. Click **Add endpoint**
5. Copy webhook signing secret: `whsec_...`
6. Add to Vercel environment variables: `STRIPE_WEBHOOK_SECRET=whsec_...`

### Step 4: Test Production Webhook

1. In Stripe Dashboard → Webhooks → Your endpoint
2. Click **Send test webhook**
3. Select `customer.subscription.created`
4. Verify webhook received (check logs)

See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for complete deployment guide.

---

## Usage Examples

### Create Checkout Session

```typescript
// In a server action or API route
import { createCheckoutSession } from '@/app/actions/billing/checkout';

export async function handleUpgrade() {
  const result = await createCheckoutSession(
    orgId,
    process.env.STRIPE_PRO_MONTHLY_PRICE_ID!,
    subdomain
  );

  if (result.success && result.url) {
    // Redirect to Stripe Checkout
    window.location.href = result.url;
  } else {
    // Handle error
    console.error(result.message);
  }
}
```

### Access Billing Portal

```typescript
import { createBillingPortalSession } from '@/app/actions/billing/checkout';

export async function handleManageBilling() {
  const result = await createBillingPortalSession(orgId, subdomain);

  if (result.success && result.url) {
    // Open Stripe Billing Portal
    window.location.href = result.url;
  }
}
```

### Check Usage Limits

```typescript
import { createClient } from '@workspace/supabase/server';

export async function canAddTeamMember(orgId: string): Promise<boolean> {
  const supabase = await createClient();
  
  const { data } = await supabase.rpc('check_usage_limit', {
    p_org_id: orgId,
    p_metric_name: 'team_members',
  });

  return data === true;
}
```

### Enforce Feature Gates

```typescript
import { RequireUsageAuth } from '@/components/shared/require-usage-auth';

export function CreateProjectButton() {
  return (
    <RequireUsageAuth
      featureKey="projects"
      incrementOnRender={false}
      fallback={<UpgradePrompt />}
    >
      <Button>Create Project</Button>
    </RequireUsageAuth>
  );
}
```

### Get Subscription Info

```typescript
import { getBillingData } from '@/app/actions/billing/get-billing-data';

export async function BillingPage() {
  const billing = await getBillingData(orgId);

  return (
    <div>
      <h1>Current Plan: {billing.subscription?.tier?.name}</h1>
      <p>Status: {billing.subscription?.status}</p>
      <p>Projects: {billing.usage?.projects} / {billing.tier?.max_projects}</p>
    </div>
  );
}
```

---

## Integration Points (Optional)

### RBAC Integration

Subscription tiers affect permissions:

**Custom Permissions** (Business+ only):
```typescript
// Check if org can customize roles
const { data } = await supabase.rpc('get_org_tier', { p_org_id: orgId });

if (data.allows_custom_permissions) {
  // Show custom permission UI
  return <CustomPermissionsEditor />;
}
```

**Tier-Based Capabilities**:
```sql
-- Some capabilities require specific tiers
SELECT * FROM capabilities
WHERE requires_tier_id = (SELECT id FROM subscription_tiers WHERE name = 'business');
```

### Usage Enforcement

Feature limits are enforced via database functions:

```typescript
// Atomic increment with limit check
const { data } = await supabase.rpc('feature_increment_if_within_limit', {
  p_org_id: orgId,
  p_feature_key: 'api_calls',
});

if (!data.allowed) {
  throw new Error('Usage limit exceeded');
}
```

### Tier-Based Feature Gating

```typescript
import { RequireTierAccess } from '@/components/shared/require-tier-access';

export function AdvancedAnalytics() {
  return (
    <RequireTierAccess
      requiredTiers={['business', 'enterprise']}
      fallback={<UpgradePrompt feature="Advanced Analytics" />}
    >
      <AnalyticsDashboard />
    </RequireTierAccess>
  );
}
```

---

## Troubleshooting

### Common Issues

#### Webhook Not Receiving Events

**Symptom**: Subscriptions not syncing to database

**Solutions**:
- Verify webhook URL is correct
- Check webhook secret is set in environment variables
- Review webhook logs in Stripe Dashboard
- Test webhook delivery: Stripe Dashboard → Webhooks → Send test event
- Verify endpoint is publicly accessible (use ngrok for local testing)
- Check Vercel function logs for errors

#### Subscription Not Syncing

**Symptom**: Database shows old subscription data

**Solutions**:
- Check `stripe_webhook_events` table for errors:
  ```sql
  SELECT * FROM stripe_webhook_events 
  WHERE processed = false OR error IS NOT NULL
  ORDER BY created_at DESC;
  ```
- Verify metadata includes `org_id` in Stripe customer/subscription
- Check Supabase service role key is correct
- Review webhook handler logs in Vercel

#### Payment Method Not Appearing

**Symptom**: Saved cards don't show in billing portal

**Solutions**:
- Ensure `payment_method.attached` webhook is configured
- Check customer metadata includes `org_id`
- Verify RLS policies allow access:
  ```sql
  SELECT * FROM payment_methods WHERE org_id = 'your-org-id';
  ```
- Check Stripe customer ID matches database

#### Checkout Session Errors

**Symptom**: "Unable to create checkout session" error

**Solutions**:
- Verify Stripe secret key is set
- Check price IDs are valid and in correct mode (test/live)
- Ensure organization exists in database
- Verify success/cancel URLs are correct
- Check Stripe API logs for detailed error

#### Invoice Not Syncing

**Symptom**: Invoices don't appear in billing history

**Solutions**:
- Verify `invoice.*` webhook events are configured
- Check webhook event log for processing errors
- Ensure subscription is linked to organization
- Review Stripe invoice metadata

---

## Security Considerations

### Best Practices

✅ **Server-Side API Calls**
- All Stripe API calls use server-side SDK
- Never expose secret key to client

✅ **Webhook Signature Verification**
- All webhooks verify signature before processing
- Prevents unauthorized webhook calls

✅ **RLS on Billing Tables**
- Row Level Security enforced on all billing tables
- Users can only see their organization's data

✅ **Role-Based Access**
- Only owners and admins can access billing settings
- Enforced via RBAC system

✅ **Service Role Isolation**
- Service role key only used in webhook handler
- Never exposed to client or regular server actions

---

## Monitoring

### View Webhook Events

```sql
-- Recent webhook events
SELECT 
  event_type,
  processed,
  error,
  created_at
FROM stripe_webhook_events
ORDER BY created_at DESC
LIMIT 20;
```

### Check Failed Payments

```sql
-- Failed invoices
SELECT * FROM invoices
WHERE status = 'uncollectible'
ORDER BY created_at DESC;
```

### Monitor Usage

```sql
-- Organization usage metrics
SELECT 
  metric_name,
  current_value,
  limit_value,
  updated_at
FROM usage_metrics
WHERE org_id = 'your-org-id'
ORDER BY metric_name;
```

---

## Additional Resources

| Resource | Link |
|:---------|:-----|
| Stripe Documentation | [stripe.com/docs](https://stripe.com/docs) |
| Stripe Checkout | [Checkout integration](https://stripe.com/docs/payments/checkout) |
| Stripe Billing Portal | [Billing portal setup](https://stripe.com/docs/billing/subscriptions/integrating-customer-portal) |
| Stripe Webhooks | [Webhook guide](https://stripe.com/docs/webhooks) |
| Stripe Testing | [Testing guide](https://stripe.com/docs/testing) |

---

## Next Steps

| Step | Action |
|:-----|:-------|
| 1 | Test billing flow — create test subscriptions |
| 2 | Configure usage limits for each tier |
| 3 | Deploy to production — see [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) |
| 4 | Set up monitoring — track failed payments and webhook errors |
| 5 | Plan pricing — adjust based on market research |

---

**Need Help?** Check the [troubleshooting guide](./GETTING_STARTED.md#troubleshooting).
