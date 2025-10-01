-- Stripe Database Sync Verification Queries
-- Run these in Supabase SQL Editor or psql

-- ============================================================================
-- 1. WEBHOOK HEALTH CHECK
-- ============================================================================

-- Overall webhook success rate (last 24 hours)
SELECT 
  COUNT(*) as total_events,
  SUM(CASE WHEN processed THEN 1 ELSE 0 END) as processed,
  SUM(CASE WHEN NOT processed THEN 1 ELSE 0 END) as pending,
  SUM(CASE WHEN error IS NOT NULL THEN 1 ELSE 0 END) as errors,
  ROUND(100.0 * SUM(CASE WHEN processed THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate_percent
FROM stripe_webhook_events
WHERE created_at > NOW() - INTERVAL '24 hours';

-- ============================================================================
-- 2. WEBHOOK EVENTS BY TYPE
-- ============================================================================

-- Count of each event type processed
SELECT 
  event_type,
  COUNT(*) as total,
  SUM(CASE WHEN processed THEN 1 ELSE 0 END) as processed_count,
  SUM(CASE WHEN error IS NOT NULL THEN 1 ELSE 0 END) as error_count
FROM stripe_webhook_events
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY event_type
ORDER BY total DESC;

-- ============================================================================
-- 3. RECENT WEBHOOK FAILURES
-- ============================================================================

-- Show failed webhook events with details
SELECT 
  stripe_event_id,
  event_type,
  error,
  created_at,
  payload->>'id' as stripe_object_id
FROM stripe_webhook_events
WHERE error IS NOT NULL
  OR (processed = false AND created_at < NOW() - INTERVAL '5 minutes')
ORDER BY created_at DESC
LIMIT 20;

-- ============================================================================
-- 4. NEW WEBHOOK EVENTS TEST
-- ============================================================================

-- Verify new webhook handlers are receiving events
SELECT 
  event_type,
  processed,
  error,
  created_at
FROM stripe_webhook_events
WHERE event_type IN (
  'checkout.session.completed',
  'customer.updated',
  'customer.deleted',
  'invoice.finalized',
  'payment_method.updated'
)
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- 5. SUBSCRIPTION SYNC STATUS
-- ============================================================================

-- View all active subscriptions with organization details
SELECT 
  o.company_name,
  o.subdomain,
  st.name as tier_name,
  s.status,
  s.stripe_subscription_id,
  s.current_period_end,
  s.cancel_at_period_end,
  s.created_at as subscription_created,
  s.updated_at as last_synced
FROM subscriptions s
JOIN organizations o ON s.org_id = o.id
JOIN subscription_tiers st ON s.tier_id = st.id
WHERE s.status IN ('active', 'trialing', 'past_due')
ORDER BY s.created_at DESC;

-- ============================================================================
-- 6. RECENT INVOICE SYNC
-- ============================================================================

-- View recent invoices with payment status
SELECT 
  i.number,
  o.company_name,
  o.subdomain,
  i.status,
  i.total / 100.0 as amount_dollars,
  i.paid_at,
  i.hosted_invoice_url,
  i.created_at as invoice_created,
  i.updated_at as last_synced
FROM invoices i
JOIN organizations o ON i.org_id = o.id
ORDER BY i.created_at DESC
LIMIT 10;

-- ============================================================================
-- 7. PAYMENT METHODS STATUS
-- ============================================================================

-- View payment methods for organizations
SELECT 
  o.company_name,
  o.subdomain,
  pm.type,
  pm.card_brand,
  pm.card_last4,
  pm.card_exp_month || '/' || pm.card_exp_year as expiration,
  pm.is_default,
  pm.created_at
FROM payment_methods pm
JOIN organizations o ON pm.org_id = o.id
ORDER BY pm.created_at DESC
LIMIT 20;

-- ============================================================================
-- 8. CUSTOMER BILLING PROFILES
-- ============================================================================

-- View customer billing information
SELECT 
  o.company_name,
  o.subdomain,
  cbp.stripe_customer_id,
  cbp.billing_email,
  cbp.billing_name,
  cbp.updated_at as last_synced
FROM customer_billing_profiles cbp
JOIN organizations o ON cbp.org_id = o.id
WHERE cbp.stripe_customer_id IS NOT NULL
ORDER BY cbp.updated_at DESC
LIMIT 10;

-- ============================================================================
-- 9. SUBSCRIPTION REVENUE SUMMARY
-- ============================================================================

-- Monthly recurring revenue by tier
SELECT 
  st.name as tier_name,
  COUNT(*) as active_subscriptions,
  SUM(st.price_monthly) / 100.0 as monthly_revenue_dollars
FROM subscriptions s
JOIN subscription_tiers st ON s.tier_id = st.id
WHERE s.status = 'active'
GROUP BY st.name, st.price_monthly
ORDER BY monthly_revenue_dollars DESC;

-- ============================================================================
-- 10. SYNC HEALTH - ORPHANED RECORDS
-- ============================================================================

-- Find subscriptions with missing Stripe customer IDs (data inconsistency)
SELECT 
  o.company_name,
  o.subdomain,
  s.stripe_subscription_id,
  s.stripe_customer_id,
  s.status
FROM subscriptions s
JOIN organizations o ON s.org_id = o.id
WHERE s.stripe_customer_id IS NULL
  AND s.status != 'canceled';

-- Find organizations with billing profiles but no customer ID
SELECT 
  o.company_name,
  o.subdomain,
  cbp.billing_email,
  cbp.stripe_customer_id
FROM customer_billing_profiles cbp
JOIN organizations o ON cbp.org_id = o.id
WHERE cbp.stripe_customer_id IS NULL;

-- ============================================================================
-- 11. WEBHOOK PROCESSING TIMELINE
-- ============================================================================

-- View webhook processing timeline (last 100 events)
SELECT 
  stripe_event_id,
  event_type,
  CASE 
    WHEN processed THEN '✅ Processed'
    WHEN error IS NOT NULL THEN '❌ Error'
    ELSE '⏳ Pending'
  END as status,
  COALESCE(processed_at, created_at) as event_time,
  EXTRACT(EPOCH FROM (processed_at - created_at)) as processing_seconds,
  error
FROM stripe_webhook_events
ORDER BY created_at DESC
LIMIT 100;

-- ============================================================================
-- 12. METADATA VALIDATION
-- ============================================================================

-- Check for missing org_id in webhook payloads (critical for sync)
SELECT 
  event_type,
  stripe_event_id,
  created_at,
  payload->'metadata'->>'org_id' as org_id_in_metadata
FROM stripe_webhook_events
WHERE event_type IN (
  'customer.subscription.created',
  'customer.subscription.updated',
  'invoice.paid',
  'checkout.session.completed'
)
  AND (payload->'metadata'->>'org_id') IS NULL
ORDER BY created_at DESC
LIMIT 10;

