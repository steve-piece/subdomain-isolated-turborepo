# 🚀 Stripe Integration - Next Steps

**Status:** ✅ Code Complete | ⏳ Testing Required

## Quick Start (5 minutes)

### Step 1: Start Webhook Listener

Open **Terminal 1**:

```bash
cd /Users/splmbp3/projects/subdomain-isolated-turborepo
./scripts/test-stripe-webhooks.sh
```

This will:

- Check if Stripe CLI is installed
- Start listening for webhooks
- Display webhook secret to add to `.env.local`

**Copy the `whsec_...` secret** and add to `apps/protected/.env.local`:

```bash
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx
```

### Step 2: Start Dev Server

Open **Terminal 2**:

```bash
cd apps/protected
pnpm dev
```

Wait for server to start on `localhost:3003`.

### Step 3: Test New Webhooks

Open **Terminal 3**:

```bash
cd /Users/splmbp3/projects/subdomain-isolated-turborepo
./scripts/trigger-stripe-events.sh new
```

This triggers:

- ✅ `checkout.session.completed`
- ✅ `customer.updated`
- ✅ `customer.deleted`
- ✅ `invoice.finalized`

### Step 4: Verify in Database

Open Supabase Studio → SQL Editor and run:

```sql
-- Quick health check
SELECT
  event_type,
  processed,
  error
FROM stripe_webhook_events
WHERE created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC;
```

Expected: All events show `processed = true` and `error = null`.

---

## Full Testing (15 minutes)

### Test All Events

```bash
./scripts/trigger-stripe-events.sh all
```

### Run Verification Queries

```bash
# Copy queries to clipboard or run in psql
cat scripts/verify-stripe-sync.sql
```

In Supabase Studio, run queries 1-4 from the file:

- Webhook health check
- Event counts by type
- Recent failures
- New webhook events verification

---

## Production Setup (10 minutes)

### 1. Add Webhook in Stripe Dashboard

1. Go to: https://dashboard.stripe.com/webhooks
2. Click: **+ Add endpoint**
3. URL: `https://acme.ghostwrite.app/api/webhooks/stripe`
   _(Replace `acme` with your actual subdomain if needed)_

4. **Select these 12 events:**

   **Existing (already working):**
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.paid`
   - ✅ `invoice.payment_failed`
   - ✅ `payment_method.attached`
   - ✅ `payment_method.detached`

   **New (just added):**
   - 🆕 `checkout.session.completed`
   - 🆕 `customer.updated`
   - 🆕 `customer.deleted`
   - 🆕 `invoice.finalized`
   - 🆕 `payment_method.updated`

5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`)

### 2. Update Production Environment Variables

In Vercel/Railway/Your Host:

```bash
STRIPE_WEBHOOK_SECRET=whsec_... # Paste secret from step 1
```

### 3. Test Production Webhook

In Stripe Dashboard:

1. Go to: Webhooks → Your endpoint
2. Click: **Send test webhook**
3. Select: `customer.subscription.created`
4. Click: **Send test webhook**

Verify in production database:

```sql
SELECT * FROM stripe_webhook_events
ORDER BY created_at DESC LIMIT 1;
```

---

## Troubleshooting

### ❌ "Stripe CLI not found"

**Fix:**

```bash
brew install stripe/stripe-cli/stripe
stripe login
```

### ❌ "Webhook signature verification failed"

**Fix:**

1. Copy webhook secret from Terminal 1
2. Update `apps/protected/.env.local`
3. Restart dev server (Terminal 2)

### ❌ "No org_id in metadata"

**Fix:** Test events won't have real org_id. For real testing:

1. Login to your app: http://acme.localhost:3003
2. Go to: Org Settings → Billing
3. Click: Upgrade to Pro
4. Use test card: `4242 4242 4242 4242`
5. Complete checkout
6. Check database for real subscription

### ❌ Events not processing

**Check logs in Terminal 1 and 2:**

- Terminal 1: Webhook received?
- Terminal 2: Any errors in console?

**Check database:**

```sql
SELECT * FROM stripe_webhook_events
WHERE error IS NOT NULL
ORDER BY created_at DESC LIMIT 5;
```

---

## Files Created

✅ **Actions:** `/apps/protected/app/actions/billing/webhook-sync.ts`

- All 11 webhook sync actions
- Follows "use server" pattern
- Standardized error handling

✅ **Webhook Route:** `/apps/protected/app/api/webhooks/stripe/route.ts`

- Refactored to call actions
- Clean, maintainable code

✅ **Scripts:**

- `scripts/test-stripe-webhooks.sh` - Start webhook listener
- `scripts/trigger-stripe-events.sh` - Trigger test events
- `scripts/verify-stripe-sync.sql` - Verification queries

✅ **Documentation:**

- `docs/STRIPE_DATABASE_SYNC.md` - Architecture guide
- `docs/STRIPE_TESTING_GUIDE.md` - Complete testing guide
- `docs/STRIPE_IMPLEMENTATION_SUMMARY.md` - Implementation overview

---

## ✅ Completion Checklist

**Local Testing:**

- [ ] Stripe CLI installed and logged in
- [ ] Webhook listener running
- [ ] Dev server running
- [ ] Test events triggered successfully
- [ ] All events show `processed = true` in database
- [ ] No errors in `stripe_webhook_events` table

**Production Setup:**

- [ ] Webhook endpoint created in Stripe Dashboard
- [ ] All 12 events selected
- [ ] Webhook secret added to production env vars
- [ ] Test webhook sent from Stripe Dashboard
- [ ] Test event appears in production database
- [ ] Production monitoring queries bookmarked

---

## 📚 Documentation Quick Links

- **Testing Guide:** [docs/STRIPE_TESTING_GUIDE.md](./docs/STRIPE_TESTING_GUIDE.md)
- **Architecture:** [docs/STRIPE_DATABASE_SYNC.md](./docs/STRIPE_DATABASE_SYNC.md)
- **Implementation:** [docs/STRIPE_IMPLEMENTATION_SUMMARY.md](./docs/STRIPE_IMPLEMENTATION_SUMMARY.md)
- **Setup Guide:** [apps/protected/STRIPE_SETUP.md](./apps/protected/STRIPE_SETUP.md)

---

## 🎯 What's Next?

After completing the checklist above:

1. **Monitor production webhooks** for first 24 hours
2. **Run daily health checks** using `verify-stripe-sync.sql`
3. **Set up alerting** for webhook failures
4. **Test real checkout flow** with test customers
5. **Verify billing portal** works correctly

You're ready to go live! 🚀
