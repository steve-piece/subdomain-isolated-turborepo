# Stripe Billing Integration

Complete Stripe integration for subscription billing, payment processing, and usage tracking.

## 🚀 Quick Start

### 1. Environment Variables

Add these to your `.env.local` file:

```bash
# Stripe API Keys (Required)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs (Replace with your actual Price IDs from Stripe Dashboard)
STRIPE_FREE_MONTHLY_PRICE_ID=price_...
STRIPE_FREE_YEARLY_PRICE_ID=price_...
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_YEARLY_PRICE_ID=price_...
STRIPE_ENTERPRISE_MONTHLY_PRICE_ID=price_...
STRIPE_ENTERPRISE_YEARLY_PRICE_ID=price_...

# Required for Supabase Service Role (for webhooks)
SUPABASE_SECRET_KEY=your_supabase_service_role_key
```

### 2. Run Database Migration

```bash
# Apply the Stripe billing migration
supabase migration up
```

### 3. Set Up Stripe Products and Prices

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/products)
2. Create three products: **Free**, **Pro**, and **Enterprise**
3. For each product, create monthly and yearly prices
4. Copy the Price IDs and add them to your environment variables

### 4. Configure Stripe Webhook

#### Local Development (with Stripe CLI)

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the webhook signing secret (starts with `whsec_`) and add it to your `.env.local` as `STRIPE_WEBHOOK_SECRET`.

#### Production

1. Go to [Stripe Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter your webhook URL: `https://your-domain.com/api/webhooks/stripe`
4. Select events to listen to:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `payment_method.attached`
   - `payment_method.detached`
5. Copy the webhook signing secret and add it to your production environment variables

## 📋 Features

### ✅ Subscription Management

- Create and manage subscriptions
- Upgrade/downgrade plans
- Cancel subscriptions
- View subscription status

### ✅ Payment Processing

- Stripe Checkout for new subscriptions
- Stripe Billing Portal for managing existing subscriptions
- Payment method management
- Invoice generation and tracking

### ✅ Usage Tracking

- Track team members, projects, storage, and API calls
- Enforce usage limits based on subscription tier
- Display real-time usage metrics

### ✅ Webhooks

- Automatic database sync via Stripe webhooks
- Event logging and error tracking
- Idempotent webhook processing

## 🏗️ Architecture

### Database Schema

The integration uses the following tables:

- `customer_billing_profiles` - Stripe customer information
- `subscriptions` - Active subscriptions
- `payment_methods` - Saved payment methods
- `invoices` - Billing history
- `usage_metrics` - Usage tracking per organization
- `stripe_webhook_events` - Webhook event log

### Server Actions

Located in `apps/protected/app/actions/billing/`:

- `stripe-customer.ts` - Customer management
- `checkout.ts` - Checkout and billing portal sessions
- `get-billing-data.ts` - Fetch billing information

### API Routes

- `apps/protected/app/api/webhooks/stripe/route.ts` - Webhook handler

## 🔧 Usage Examples

### Upgrade to Pro Plan

```tsx
import { createCheckoutSession } from "@/app/actions/billing/checkout";

// In a client component
const handleUpgrade = async () => {
  const result = await createCheckoutSession(
    orgId,
    process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID!,
    subdomain
  );

  if (result.success && result.url) {
    window.location.href = result.url;
  }
};
```

### Access Billing Portal

```tsx
import { createBillingPortalSession } from "@/app/actions/billing/checkout";

const handleManageBilling = async () => {
  const result = await createBillingPortalSession(orgId, subdomain);

  if (result.success && result.url) {
    window.location.href = result.url;
  }
};
```

### Check Usage Limits

```tsx
import { createClient } from "@/lib/supabase/server";

const supabase = await createClient();

// Check if organization can add more team members
const { data } = await supabase.rpc("check_usage_limit", {
  p_org_id: orgId,
  p_metric_name: "team_members",
});

if (!data) {
  // Show upgrade prompt
}
```

## 🧪 Testing

### Test Cards

Use these test card numbers in Stripe Checkout:

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires Authentication**: `4000 0025 0000 3155`

Use any future expiry date and any 3-digit CVC.

### Test Webhooks

```bash
# Trigger a test event
stripe trigger customer.subscription.created
```

## 🔒 Security

- All Stripe API calls use server-side SDK
- Webhook signatures are verified
- Row Level Security (RLS) enforced on all billing tables
- Only owners and admins can access billing settings
- Service role key isolated to webhook handler

## 📊 Monitoring

### Webhook Event Log

Query webhook events:

```sql
SELECT * FROM stripe_webhook_events
WHERE processed = false
ORDER BY created_at DESC;
```

### Failed Payments

```sql
SELECT * FROM invoices
WHERE status = 'uncollectible'
ORDER BY created_at DESC;
```

### Usage Metrics

```sql
SELECT * FROM usage_metrics
WHERE org_id = 'your-org-id'
ORDER BY updated_at DESC;
```

## 🚨 Troubleshooting

### Webhook not receiving events

1. Check webhook URL is correct
2. Verify `STRIPE_WEBHOOK_SECRET` is set
3. Check webhook logs in Stripe Dashboard
4. Ensure endpoint is publicly accessible (use ngrok for local testing)

### Subscription not syncing

1. Check webhook events table for errors
2. Verify metadata includes `org_id`
3. Check Supabase service role key is correct
4. Review webhook handler logs

### Payment method not appearing

1. Ensure `payment_method.attached` webhook is configured
2. Check customer metadata includes `org_id`
3. Verify RLS policies allow access

## 📚 Resources

- [Stripe API Documentation](https://stripe.com/docs/api)
- [Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Stripe Billing Portal](https://stripe.com/docs/billing/subscriptions/integrating-customer-portal)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Testing](https://stripe.com/docs/testing)

## 🔄 Migration Guide

If you're migrating from another billing system:

1. Export existing customer and subscription data
2. Import customers to Stripe via API or dashboard
3. Create subscriptions in Stripe
4. Run the database migration
5. Sync data using the webhook handler
6. Test thoroughly before going live

## 📝 License

This integration is part of the Subdomain Isolated Turborepo project.
