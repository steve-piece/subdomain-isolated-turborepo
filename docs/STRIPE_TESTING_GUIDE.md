# Stripe Testing Guide

Step-by-step guide to test your Stripe integration and verify database sync.

## 📋 Prerequisites

- [ ] Stripe CLI installed (`brew install stripe/stripe-cli/stripe`)
- [ ] Logged in to Stripe CLI (`stripe login`)
- [ ] Local dev server running on port 3003
- [ ] Environment variables configured (see below)

## 🔧 Environment Setup

Ensure these are in your `.env.local`:

```bash
# Stripe Keys
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Supabase (for webhooks)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=your_service_role_key

# Domain
NEXT_PUBLIC_APP_DOMAIN=ghostwrite.app
```

## 🚀 Quick Start

### 1. Start Webhook Listener

```bash
# Terminal 1 - Start your dev server
cd apps/protected
pnpm dev

# Terminal 2 - Start Stripe webhook listener
./scripts/test-stripe-webhooks.sh
```

Copy the webhook secret from Terminal 2 output and add to `.env.local`:
```bash
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx
```

Restart your dev server to pick up the new secret.

### 2. Test All Webhooks

```bash
# Terminal 3 - Trigger test events
./scripts/trigger-stripe-events.sh new
```

This will trigger all new webhook handlers.

### 3. Verify Database Sync

Open Supabase Studio and run:
```bash
# Copy verification queries
cat scripts/verify-stripe-sync.sql
```

Or use psql:
```bash
psql $DATABASE_URL -f scripts/verify-stripe-sync.sql
```

## 📊 Testing Scenarios

### Scenario 1: Customer Creation

**Test:** Create a Stripe customer via checkout

```bash
# In your browser
1. Navigate to http://acme.localhost:3003
2. Login as owner/admin
3. Go to Org Settings → Billing
4. Click "Upgrade to Pro"
5. Use test card: 4242 4242 4242 4242
6. Complete checkout
```

**Verify:**
```sql
-- Check webhook received
SELECT * FROM stripe_webhook_events 
WHERE event_type = 'checkout.session.completed'
ORDER BY created_at DESC LIMIT 1;

-- Check customer created
SELECT * FROM customer_billing_profiles
WHERE stripe_customer_id IS NOT NULL
ORDER BY updated_at DESC LIMIT 1;
```

### Scenario 2: Subscription Creation

**Trigger:**
```bash
stripe trigger customer.subscription.created
```

**Verify:**
```sql
-- Check webhook
SELECT * FROM stripe_webhook_events 
WHERE event_type = 'customer.subscription.created'
ORDER BY created_at DESC LIMIT 1;

-- Check subscription synced
SELECT 
  o.company_name,
  s.status,
  st.name as tier
FROM subscriptions s
JOIN organizations o ON s.org_id = o.id
JOIN subscription_tiers st ON s.tier_id = st.id
ORDER BY s.created_at DESC LIMIT 1;
```

**Expected:** New row in `subscriptions` table with status `active`.

### Scenario 3: Invoice Payment

**Trigger:**
```bash
stripe trigger invoice.paid
```

**Verify:**
```sql
-- Check webhook
SELECT * FROM stripe_webhook_events 
WHERE event_type = 'invoice.paid'
ORDER BY created_at DESC LIMIT 1;

-- Check invoice synced
SELECT 
  i.number,
  i.status,
  i.total / 100.0 as amount,
  i.paid_at
FROM invoices i
ORDER BY i.created_at DESC LIMIT 1;
```

**Expected:** New row in `invoices` table with status `paid`.

### Scenario 4: Payment Failure

**Trigger:**
```bash
stripe trigger invoice.payment_failed
```

**Verify:**
```sql
-- Check webhook
SELECT * FROM stripe_webhook_events 
WHERE event_type = 'invoice.payment_failed'
ORDER BY created_at DESC LIMIT 1;

-- Check subscription updated to past_due
SELECT status FROM subscriptions
WHERE stripe_subscription_id = (
  SELECT payload->>'subscription' FROM stripe_webhook_events
  WHERE event_type = 'invoice.payment_failed'
  ORDER BY created_at DESC LIMIT 1
);
```

**Expected:** Subscription status changed to `past_due`.

### Scenario 5: Customer Update

**Trigger:**
```bash
stripe trigger customer.updated
```

**Verify:**
```sql
-- Check webhook processed
SELECT 
  processed,
  error,
  event_type
FROM stripe_webhook_events 
WHERE event_type = 'customer.updated'
ORDER BY created_at DESC LIMIT 1;

-- Check billing profile updated
SELECT 
  billing_email,
  billing_name,
  updated_at
FROM customer_billing_profiles
ORDER BY updated_at DESC LIMIT 1;
```

**Expected:** Webhook processed successfully, billing profile updated.

### Scenario 6: Payment Method

**Trigger:**
```bash
# Attach payment method
stripe trigger payment_method.attached

# Detach payment method
stripe trigger payment_method.detached
```

**Verify:**
```sql
-- Check webhooks
SELECT event_type, processed, error
FROM stripe_webhook_events 
WHERE event_type LIKE 'payment_method.%'
ORDER BY created_at DESC LIMIT 2;

-- Check payment methods
SELECT 
  type,
  card_brand,
  card_last4,
  created_at
FROM payment_methods
ORDER BY created_at DESC LIMIT 5;
```

## 🔍 Debugging Failed Webhooks

### Check Webhook Logs

```sql
-- View all failures
SELECT 
  stripe_event_id,
  event_type,
  error,
  created_at,
  payload
FROM stripe_webhook_events
WHERE error IS NOT NULL
ORDER BY created_at DESC;
```

### Common Issues

#### 1. "No org_id in metadata"

**Cause:** Metadata not set during checkout/subscription creation.

**Fix:** Ensure `getOrCreateStripeCustomer()` sets metadata:
```typescript
metadata: {
  org_id: orgId,
  user_id: userId
}
```

#### 2. "No tier found for price"

**Cause:** `subscription_tiers.stripe_price_id` doesn't match Stripe Price ID.

**Fix:** Update your tiers:
```sql
UPDATE subscription_tiers
SET stripe_price_id = 'price_xxx'
WHERE name = 'Pro';
```

#### 3. "Webhook signature verification failed"

**Cause:** Wrong webhook secret or stale secret.

**Fix:**
```bash
# Get new secret from Stripe CLI
stripe listen --forward-to localhost:3003/api/webhooks/stripe

# Update .env.local
STRIPE_WEBHOOK_SECRET=whsec_new_secret_here

# Restart dev server
```

## 📈 Health Monitoring

### Daily Health Check

```sql
-- Run this daily in production
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_events,
  SUM(CASE WHEN processed THEN 1 ELSE 0 END) as processed,
  SUM(CASE WHEN error IS NOT NULL THEN 1 ELSE 0 END) as errors,
  ROUND(100.0 * SUM(CASE WHEN processed THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM stripe_webhook_events
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

**Healthy:** Success rate > 99%
**Warning:** Success rate 95-99%
**Critical:** Success rate < 95%

### Alert on Failures

Set up Supabase webhook or cron job:

```sql
-- Find recent failures (run every 5 minutes)
SELECT COUNT(*) as failure_count
FROM stripe_webhook_events
WHERE error IS NOT NULL
  AND created_at > NOW() - INTERVAL '5 minutes';
```

If `failure_count > 0`, send alert (email/Slack/PagerDuty).

## ✅ Testing Checklist

Before deploying to production:

- [ ] All webhook events trigger successfully locally
- [ ] Database tables sync correctly for each event type
- [ ] No errors in `stripe_webhook_events.error` column
- [ ] Metadata contains `org_id` in all relevant events
- [ ] Subscription tiers have correct `stripe_price_id`
- [ ] Customer creation flow works end-to-end
- [ ] Checkout → Subscription → Invoice flow complete
- [ ] Payment failure updates subscription status
- [ ] Payment method attach/detach works
- [ ] Customer updates sync to billing profile
- [ ] Webhook health monitoring queries run
- [ ] Production webhook endpoint configured in Stripe Dashboard

## 🚀 Production Deployment

### 1. Configure Production Webhook

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **+ Add endpoint**
3. Enter URL: `https://acme.ghostwrite.app/api/webhooks/stripe`
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
6. Copy **Signing secret**
7. Add to production environment variables

### 2. Update Environment Variables

In your production environment (Vercel/etc):

```bash
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_... # From step 1
SUPABASE_SECRET_KEY=your_prod_service_role_key
```

### 3. Test Production Webhooks

```bash
# Send test event from Stripe Dashboard
# Dashboard → Webhooks → Your endpoint → Send test webhook

# Or use Stripe CLI
stripe trigger customer.subscription.created --stripe-account acct_xxx
```

### 4. Monitor Production

Set up:
- [ ] Daily health check query (automated)
- [ ] Error alerting (Supabase webhook → Slack/email)
- [ ] Weekly sync audit (review orphaned records)
- [ ] Monthly revenue reconciliation (Stripe vs database)

## 📚 Additional Resources

- [Stripe CLI Docs](https://stripe.com/docs/stripe-cli)
- [Stripe Testing](https://stripe.com/docs/testing)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Our Stripe Setup Guide](../apps/protected/STRIPE_SETUP.md)
- [Stripe Database Sync Architecture](./STRIPE_DATABASE_SYNC.md)

