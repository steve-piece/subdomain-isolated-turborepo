# Stripe → Database Sync Architecture

Complete guide to how Stripe data syncs to your Supabase database.

## 📊 Database Tables Overview

Your database has 5 Stripe-related tables:

### 1. `customer_billing_profiles`

Stores Stripe customer information for each organization.

**Key Fields:**

- `org_id` → Links to `organizations.id`
- `stripe_customer_id` → Stripe Customer ID (`cus_xxx`)
- `billing_email` → Customer email in Stripe
- `billing_name`, `billing_address`, `tax_id` → Billing details
- `default_payment_method_id` → Default payment method

**Sync Events:**

- ✅ Created via `getOrCreateStripeCustomer()` action
- ⚠️ **MISSING**: `customer.updated` webhook to sync changes
- ⚠️ **MISSING**: `customer.deleted` webhook

### 2. `subscriptions`

Stores active subscriptions for organizations.

**Key Fields:**

- `org_id` → Links to `organizations.id`
- `tier_id` → Links to `subscription_tiers.id`
- `stripe_subscription_id` → Stripe Subscription ID (`sub_xxx`)
- `stripe_customer_id` → Stripe Customer ID
- `status` → `active`, `canceled`, `past_due`, etc.
- `current_period_start`, `current_period_end` → Billing period
- `cancel_at_period_end` → Whether subscription cancels at period end
- `trial_end` → Trial end date (if applicable)

**Sync Events:**

- ✅ `customer.subscription.created` → Creates subscription
- ✅ `customer.subscription.updated` → Updates subscription
- ✅ `customer.subscription.deleted` → Marks as canceled
- ⚠️ **MISSING**: `checkout.session.completed` (recommended for better tracking)

### 3. `invoices`

Stores all invoices for organizations.

**Key Fields:**

- `org_id` → Links to `organizations.id`
- `subscription_id` → Links to `subscriptions.id`
- `stripe_invoice_id` → Stripe Invoice ID (`in_xxx`)
- `stripe_customer_id` → Stripe Customer ID
- `status` → `paid`, `open`, `void`, `uncollectible`
- `amount_due`, `amount_paid`, `amount_remaining` → Payment amounts (in cents)
- `invoice_pdf`, `hosted_invoice_url` → Invoice URLs
- `paid_at` → Payment timestamp

**Sync Events:**

- ✅ `invoice.paid` → Creates/updates invoice record
- ✅ `invoice.payment_failed` → Updates subscription to `past_due`
- ⚠️ **MISSING**: `invoice.created`, `invoice.finalized`, `invoice.voided`

### 4. `payment_methods`

Stores payment methods for organizations.

**Key Fields:**

- `org_id` → Links to `organizations.id`
- `stripe_payment_method_id` → Stripe PaymentMethod ID (`pm_xxx`)
- `stripe_customer_id` → Stripe Customer ID
- `type` → `card`, `bank_account`, etc.
- `card_brand`, `card_last4`, `card_exp_month`, `card_exp_year` → Card details
- `is_default` → Whether this is the default payment method

**Sync Events:**

- ✅ `payment_method.attached` → Adds payment method
- ✅ `payment_method.detached` → Removes payment method
- ⚠️ **MISSING**: `payment_method.updated` webhook
- ⚠️ **MISSING**: Default payment method tracking

### 5. `stripe_webhook_events`

Audit log for all Stripe webhook events.

**Key Fields:**

- `stripe_event_id` → Stripe Event ID (`evt_xxx`)
- `event_type` → Event name (e.g., `invoice.paid`)
- `payload` → Full event payload (JSONB)
- `processed` → Whether event was successfully processed
- `processed_at` → When event was processed
- `error` → Error message if processing failed

**Purpose:**

- Audit trail for all webhook events
- Debugging failed webhooks
- Idempotency (prevents duplicate processing)

## 🔄 Current Sync Flow

### 1. Customer Creation Flow

```
User clicks "Upgrade"
  → createCheckoutSession() called
    → getOrCreateStripeCustomer(orgId) called
      → Checks customer_billing_profiles for existing customer
      → If not exists:
        - Creates Stripe customer via stripe.customers.create()
        - Stores customer_id in customer_billing_profiles
      → Returns customer_id
    → Creates Checkout Session with customer_id
  → User redirected to Stripe Checkout
```

**Important:** Customer is created BEFORE checkout, ensuring metadata is set correctly.

### 2. Subscription Creation Flow

```
User completes payment in Stripe Checkout
  → Stripe fires: customer.subscription.created
    → Webhook received at /api/webhooks/stripe
      → handleSubscriptionUpdate() called
        - Extracts org_id from subscription.metadata
        - Looks up tier_id from subscription_tiers (by stripe_price_id)
        - Upserts to subscriptions table
```

**Critical:** `subscription.metadata.org_id` MUST be set during checkout session creation.

### 3. Invoice Payment Flow

```
Stripe processes recurring payment
  → Stripe fires: invoice.paid
    → Webhook received at /api/webhooks/stripe
      → handleInvoicePaid() called
        - Extracts org_id from invoice.metadata
        - Looks up subscription_id from subscriptions table
        - Upserts to invoices table
```

### 4. Payment Method Flow

```
User adds payment method in Stripe Billing Portal
  → Stripe fires: payment_method.attached
    → Webhook received at /api/webhooks/stripe
      → handlePaymentMethodAttached() called
        - Retrieves customer from Stripe to get org_id
        - Inserts payment method to payment_methods table
```

## ⚠️ Missing Webhook Handlers

### High Priority

#### 1. `checkout.session.completed`

**Why needed:** Provides better tracking when checkout completes successfully.

**Use case:**

- Log successful checkouts
- Track conversion metrics
- Handle edge cases where subscription webhook arrives first

#### 2. `customer.updated`

**Why needed:** Sync billing email, name, address changes from Stripe Portal.

**Use case:**

- User updates email in Stripe Billing Portal
- Admin updates customer details in Stripe Dashboard
- Address/tax info changes

#### 3. `customer.deleted`

**Why needed:** Clean up customer data when deleted in Stripe.

**Use case:**

- Customer deleted in Stripe Dashboard
- Clean up orphaned records

### Medium Priority

#### 4. `invoice.finalized`

**Why needed:** Track when invoice is ready to be paid.

#### 5. `invoice.voided`

**Why needed:** Update invoice status when voided.

#### 6. `payment_method.updated`

**Why needed:** Sync card expiration date changes.

#### 7. `customer.subscription.trial_will_end`

**Why needed:** Send notification before trial ends.

## 🔧 Implementation: Missing Handlers

Add these handlers to `/apps/protected/app/api/webhooks/stripe/route.ts`:

```typescript
// In the main switch statement (line 63)
case "checkout.session.completed":
  await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
  break;

case "customer.updated":
  await handleCustomerUpdated(event.data.object as Stripe.Customer);
  break;

case "customer.deleted":
  await handleCustomerDeleted(event.data.object as Stripe.Customer);
  break;

case "invoice.finalized":
  await handleInvoiceFinalized(event.data.object as Stripe.Invoice);
  break;

case "payment_method.updated":
  await handlePaymentMethodUpdated(event.data.object as Stripe.PaymentMethod);
  break;
```

See the implementation section below for full handler functions.

## 🎯 Metadata Requirements

For webhooks to work correctly, you MUST set metadata on Stripe objects:

### Checkout Session Metadata

```typescript
{
  metadata: {
    org_id: "uuid-here",
    subdomain: "acme"
  }
}
```

### Subscription Metadata

```typescript
{
  subscription_data: {
    metadata: {
      org_id: "uuid-here",
      subdomain: "acme"
    }
  }
}
```

### Customer Metadata

```typescript
{
  metadata: {
    org_id: "uuid-here",
    user_id: "uuid-here"
  }
}
```

### Invoice Metadata

Automatically inherited from subscription metadata.

## 🚨 Common Sync Issues

### Issue: Subscription not showing up after payment

**Cause:** Webhook failed or metadata missing.

**Debug:**

1. Check `stripe_webhook_events` table for errors
2. Verify `org_id` is in subscription metadata
3. Check Stripe Dashboard → Webhooks for failed events
4. Verify `subscription_tiers.stripe_price_id` matches the price in Stripe

**Fix:**

```sql
-- Check for webhook errors
SELECT * FROM stripe_webhook_events
WHERE processed = false
ORDER BY created_at DESC;

-- Verify tier price IDs
SELECT id, name, stripe_price_id
FROM subscription_tiers;
```

### Issue: Payment method not appearing

**Cause:** Customer metadata missing `org_id`.

**Debug:**

1. Check customer in Stripe Dashboard → Customers
2. Verify `metadata.org_id` is set
3. Check webhook event payload in `stripe_webhook_events`

**Fix:**

```typescript
// Ensure customer is created with metadata
const customer = await stripe.customers.create({
  email: user.email,
  metadata: {
    org_id: orgId,
    user_id: userId,
  },
});
```

### Issue: Invoice amounts wrong

**Cause:** Stripe returns amounts in cents, not dollars.

**Fix:** Already handled - webhook stores amounts in cents to match Stripe.

### Issue: Duplicate webhook processing

**Solution:** Already handled via `stripe_event_id` unique constraint.

## 🛠️ Testing Webhooks Locally

### Setup Stripe CLI

```bash
# Install
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks
stripe listen --forward-to localhost:3003/api/webhooks/stripe
```

### Trigger Test Events

```bash
# Test subscription creation
stripe trigger customer.subscription.created

# Test invoice payment
stripe trigger invoice.paid

# Test payment failure
stripe trigger invoice.payment_failed

# Test payment method
stripe trigger payment_method.attached
```

### View Event Logs

```sql
-- View all webhook events
SELECT
  stripe_event_id,
  event_type,
  processed,
  error,
  created_at
FROM stripe_webhook_events
ORDER BY created_at DESC
LIMIT 20;

-- View failed events
SELECT * FROM stripe_webhook_events
WHERE processed = false OR error IS NOT NULL;
```

## 📋 Setup Checklist

- [ ] Stripe API keys configured (`STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`)
- [ ] Webhook secret configured (`STRIPE_WEBHOOK_SECRET`)
- [ ] Supabase service role key configured (`SUPABASE_SECRET_KEY`)
- [ ] Database migration applied (subscription tables created)
- [ ] Subscription tiers seeded with Stripe Price IDs
- [ ] Webhook endpoint registered in Stripe Dashboard
- [ ] Webhook events enabled (see required events below)
- [ ] Local webhook testing working (Stripe CLI)
- [ ] Customer creation tested
- [ ] Checkout flow tested
- [ ] Subscription webhooks verified in database
- [ ] Payment method sync tested
- [ ] Invoice creation tested

## 🔔 Required Webhook Events

Configure these in [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks):

### Currently Handled

- ✅ `customer.subscription.created`
- ✅ `customer.subscription.updated`
- ✅ `customer.subscription.deleted`
- ✅ `invoice.paid`
- ✅ `invoice.payment_failed`
- ✅ `payment_method.attached`
- ✅ `payment_method.detached`

### Recommended to Add

- ⚠️ `checkout.session.completed`
- ⚠️ `customer.updated`
- ⚠️ `customer.deleted`
- ⚠️ `invoice.finalized`
- ⚠️ `payment_method.updated`

## 🔍 Monitoring & Debugging

### Check Webhook Health

```sql
-- Webhook success rate
SELECT
  event_type,
  COUNT(*) as total,
  SUM(CASE WHEN processed THEN 1 ELSE 0 END) as processed,
  SUM(CASE WHEN error IS NOT NULL THEN 1 ELSE 0 END) as errors
FROM stripe_webhook_events
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY event_type;
```

### View Recent Subscriptions

```sql
SELECT
  o.company_name,
  o.subdomain,
  st.name as tier_name,
  s.status,
  s.current_period_end,
  s.cancel_at_period_end
FROM subscriptions s
JOIN organizations o ON s.org_id = o.id
JOIN subscription_tiers st ON s.tier_id = st.id
ORDER BY s.created_at DESC
LIMIT 10;
```

### View Recent Invoices

```sql
SELECT
  i.number,
  o.company_name,
  i.status,
  i.total / 100.0 as amount_dollars,
  i.paid_at,
  i.hosted_invoice_url
FROM invoices i
JOIN organizations o ON i.org_id = o.id
ORDER BY i.created_at DESC
LIMIT 10;
```

## 🚀 Next Steps

1. **Add Missing Webhook Handlers** (see implementation below)
2. **Test all webhook flows** with Stripe CLI
3. **Monitor webhook logs** for errors
4. **Set up Stripe webhooks** in production
5. **Document any custom subscription logic** specific to your app

---

For implementation code of missing handlers, see the next section.
