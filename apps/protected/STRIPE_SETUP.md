# Stripe Billing Setup Guide

Complete setup guide for Stripe billing integration.

## 📋 Prerequisites

1. Stripe account (sign up at https://stripe.com)
2. Supabase project configured
3. Local development environment running

## 🚀 Step-by-Step Setup

### Step 1: Get Stripe API Keys

1. Go to [Stripe Dashboard API Keys](https://dashboard.stripe.com/test/apikeys)
2. Copy your **Publishable key** (starts with `pk_test_`)
3. Reveal and copy your **Secret key** (starts with `sk_test_`)
4. Add to your `.env.local`:

```bash
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY
```

### Step 2: Create Products and Prices

1. Go to [Stripe Products](https://dashboard.stripe.com/test/products)
2. Click **+ Add product**

#### Free Plan

- Name: **Free**
- Description: Basic features for small teams
- Recurring: Monthly
- Price: **$0.00**
- Click **Save product**
- Copy the **Price ID** (starts with `price_`)
- Repeat for Yearly pricing

#### Pro Plan

- Name: **Pro**
- Description: Advanced features for growing teams
- Recurring: Monthly
- Price: **$29.00**
- Click **Save product**
- Copy the **Price ID**
- Repeat for Yearly pricing (e.g., $290/year)

#### Enterprise Plan

- Name: **Enterprise**
- Description: Custom solutions for large organizations
- Note: Can be contact-only (no price ID needed)

3. Add all Price IDs to your `.env.local`:

```bash
STRIPE_FREE_MONTHLY_PRICE_ID=price_...
STRIPE_FREE_YEARLY_PRICE_ID=price_...
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_YEARLY_PRICE_ID=price_...
STRIPE_ENTERPRISE_MONTHLY_PRICE_ID=price_...
STRIPE_ENTERPRISE_YEARLY_PRICE_ID=price_...
```

### Step 3: Update Database with Price IDs

1. Open your Supabase SQL Editor
2. Run this query to update your subscription tiers:

```sql
-- Update Free tier
UPDATE subscription_tiers
SET
  stripe_product_id = 'prod_YOUR_FREE_PRODUCT_ID',
  stripe_price_id = 'price_YOUR_FREE_MONTHLY_PRICE_ID',
  price_monthly = 0,
  price_yearly = 0
WHERE name = 'Free';

-- Update Pro tier
UPDATE subscription_tiers
SET
  stripe_product_id = 'prod_YOUR_PRO_PRODUCT_ID',
  stripe_price_id = 'price_YOUR_PRO_MONTHLY_PRICE_ID',
  price_monthly = 2900,  -- $29.00 in cents
  price_yearly = 29000   -- $290.00 in cents
WHERE name = 'Pro';

-- Update Enterprise tier
UPDATE subscription_tiers
SET
  stripe_product_id = 'prod_YOUR_ENTERPRISE_PRODUCT_ID',
  stripe_price_id = NULL,  -- Contact sales
  price_monthly = NULL,
  price_yearly = NULL
WHERE name = 'Enterprise';
```

### Step 4: Set Up Webhooks (Local Development)

1. Install Stripe CLI:

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Windows (with Scoop)
scoop install stripe

# Linux
# Download from https://github.com/stripe/stripe-cli/releases/latest
```

2. Login to Stripe CLI:

```bash
stripe login
```

3. Forward webhooks to your local server:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

4. Copy the **webhook signing secret** from the output (starts with `whsec_`)
5. Add to `.env.local`:

```bash
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
```

### Step 5: Set Up Webhooks (Production)

1. Go to [Stripe Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Click **+ Add endpoint**
3. Enter endpoint URL: `https://your-domain.com/api/webhooks/stripe`
4. Select events to listen for:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `payment_method.attached`
   - `payment_method.detached`
5. Click **Add endpoint**
6. Copy the **Signing secret**
7. Add to your production environment variables

### Step 6: Run Database Migration

```bash
# In your project root
cd supabase
supabase migration up

# Or if using Supabase CLI
supabase db reset
```

### Step 7: Configure Supabase Service Role Key

The webhook handler needs the service role key to update the database.

Add to `.env.local`:

```bash
SUPABASE_SECRET_KEY=your_service_role_key_here
```

Find this in your [Supabase Project Settings → API](https://app.supabase.com/project/_/settings/api)

### Step 8: Test the Integration

1. Start your development server:

```bash
pnpm dev
```

2. Navigate to a test organization's billing page
3. Click **Upgrade to Pro**
4. Use Stripe test card: `4242 4242 4242 4242`
5. Complete the checkout
6. Verify the subscription appears in your database

### Step 9: Test Webhooks

In a separate terminal:

```bash
# Trigger a test subscription created event
stripe trigger customer.subscription.created

# Check your database to see if the subscription was created
```

## 🧪 Testing

### Test Card Numbers

| Card Number           | Description                       |
| --------------------- | --------------------------------- |
| `4242 4242 4242 4242` | Successful payment                |
| `4000 0000 0000 0002` | Card declined                     |
| `4000 0025 0000 3155` | Requires 3D Secure authentication |
| `4000 0000 0000 9995` | Insufficient funds                |

Use:

- Any future expiry date (e.g., `12/34`)
- Any 3-digit CVC (e.g., `123`)
- Any billing ZIP code (e.g., `12345`)

### Testing Webhooks

```bash
# Test successful subscription
stripe trigger customer.subscription.created

# Test invoice payment
stripe trigger invoice.paid

# Test payment failure
stripe trigger invoice.payment_failed
```

## ✅ Verification Checklist

- [ ] Stripe API keys added to environment variables
- [ ] All Price IDs created and added to environment
- [ ] Database migration ran successfully
- [ ] Subscription tiers updated with Stripe IDs
- [ ] Webhook endpoint configured (local or production)
- [ ] Webhook secret added to environment variables
- [ ] Service role key configured
- [ ] Test subscription completed successfully
- [ ] Webhook events received and processed
- [ ] Billing data displays correctly on billing page

## 🚨 Troubleshooting

### "No subscription found" error

- Check that webhooks are properly configured
- Verify webhook secret matches
- Check Supabase service role key is correct

### Checkout session not created

- Verify Stripe API keys are correct
- Check that Price IDs exist in Stripe Dashboard
- Ensure user has admin/owner permissions

### Webhook events not processing

- Check webhook endpoint is accessible
- Verify webhook signature matches
- Check Supabase RLS policies allow service role access

### Payment not reflecting in database

- Check webhook logs in Stripe Dashboard
- Verify metadata includes `org_id`
- Check `stripe_webhook_events` table for errors

## 📚 Additional Resources

- [Full Integration Documentation](./lib/stripe/README.md)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Stripe Checkout Documentation](https://stripe.com/docs/payments/checkout)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)

## 🎉 You're All Set!

Your Stripe billing integration is now fully configured. Users can:

- ✅ View current subscription and usage
- ✅ Upgrade to paid plans via Stripe Checkout
- ✅ Manage billing and payment methods via Stripe Billing Portal
- ✅ View invoice history
- ✅ Track usage metrics

Happy billing! 💳
