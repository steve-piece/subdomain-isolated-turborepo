-- ============================================================================
-- Stripe Billing Tables - Comments and Documentation
-- ============================================================================
-- Migration: 20250103000000_stripe_tables_comments
-- Purpose: Add comprehensive comments to existing Stripe billing tables for API documentation
-- Dependencies:
--   - customer_billing_profiles table exists
--   - subscriptions table exists
--   - invoices table exists
--   - payment_methods table exists
--   - stripe_webhook_events table exists
-- Impact: Adds COMMENT ON statements for Supabase auto-generated API documentation
-- Rollback: Comments are documentation only - no functional rollback needed
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. CUSTOMER_BILLING_PROFILES TABLE
-- ============================================================================

COMMENT ON TABLE public.customer_billing_profiles IS 
'Stripe customer information for organizations. Stores billing contact details, addresses, and default payment method references. One-to-one with organizations.';

COMMENT ON COLUMN public.customer_billing_profiles.id IS 
'Unique identifier for billing profile record';

COMMENT ON COLUMN public.customer_billing_profiles.org_id IS 
'Organization this billing profile belongs to (one-to-one relationship)';

COMMENT ON COLUMN public.customer_billing_profiles.stripe_customer_id IS 
'Stripe Customer ID (cus_xxx) - links to customer in Stripe Dashboard';

COMMENT ON COLUMN public.customer_billing_profiles.billing_email IS 
'Email address for invoices and billing communications';

COMMENT ON COLUMN public.customer_billing_profiles.billing_name IS 
'Name to display on invoices and receipts';

COMMENT ON COLUMN public.customer_billing_profiles.billing_address IS 
'JSONB object containing street, city, state, postal_code, country for invoices';

COMMENT ON COLUMN public.customer_billing_profiles.tax_id IS 
'Tax identification number (VAT/GST/etc) for invoice compliance';

COMMENT ON COLUMN public.customer_billing_profiles.default_payment_method_id IS 
'Stripe Payment Method ID (pm_xxx) set as default for this customer';

COMMENT ON COLUMN public.customer_billing_profiles.created_at IS 
'Timestamp when billing profile was created';

COMMENT ON COLUMN public.customer_billing_profiles.updated_at IS 
'Timestamp when billing profile was last synced from Stripe (updated by customer.updated webhook)';

-- ============================================================================
-- 2. SUBSCRIPTIONS TABLE
-- ============================================================================

COMMENT ON TABLE public.subscriptions IS 
'Active subscription records for organizations. Tracks current plan, billing period, and subscription status synced from Stripe. Updated by customer.subscription.* webhooks.';

COMMENT ON COLUMN public.subscriptions.id IS 
'Unique identifier for subscription record';

COMMENT ON COLUMN public.subscriptions.org_id IS 
'Organization this subscription belongs to (one-to-one, enforced by unique constraint)';

COMMENT ON COLUMN public.subscriptions.tier_id IS 
'References subscription_tiers.id - determines feature access and pricing';

COMMENT ON COLUMN public.subscriptions.stripe_subscription_id IS 
'Stripe Subscription ID (sub_xxx) - links to subscription in Stripe Dashboard';

COMMENT ON COLUMN public.subscriptions.stripe_customer_id IS 
'Stripe Customer ID (cus_xxx) - redundant with customer_billing_profiles for quick joins';

COMMENT ON COLUMN public.subscriptions.status IS 
'Subscription status: active (paying), trialing (in trial), past_due (payment failed), canceled (ended), incomplete (payment pending), paused (temporarily suspended)';

COMMENT ON COLUMN public.subscriptions.billing_cycle IS 
'Billing frequency: monthly or yearly - determines invoice cadence';

COMMENT ON COLUMN public.subscriptions.period_start IS 
'Start of billing period (legacy - use current_period_start instead)';

COMMENT ON COLUMN public.subscriptions.period_end IS 
'End of billing period (legacy - use current_period_end instead)';

COMMENT ON COLUMN public.subscriptions.current_period_start IS 
'Start of current billing cycle - synced from Stripe';

COMMENT ON COLUMN public.subscriptions.current_period_end IS 
'End of current billing cycle - next invoice date if active';

COMMENT ON COLUMN public.subscriptions.cancel_at_period_end IS 
'If true, subscription will not renew at period end (user canceled but still active until end date)';

COMMENT ON COLUMN public.subscriptions.canceled_at IS 
'Timestamp when subscription was canceled (null if never canceled or currently active)';

COMMENT ON COLUMN public.subscriptions.trial_end IS 
'End of trial period - null if no trial or trial already ended';

COMMENT ON COLUMN public.subscriptions.metadata IS 
'JSONB storage for additional Stripe subscription metadata';

COMMENT ON COLUMN public.subscriptions.created_at IS 
'Timestamp when subscription was created in database';

COMMENT ON COLUMN public.subscriptions.updated_at IS 
'Timestamp when subscription was last synced from Stripe webhooks';

-- ============================================================================
-- 3. INVOICES TABLE
-- ============================================================================

COMMENT ON TABLE public.invoices IS 
'Invoice records synced from Stripe. Tracks all billing transactions including paid, open, and voided invoices. Created/updated by invoice.* webhooks.';

COMMENT ON COLUMN public.invoices.id IS 
'Unique identifier for invoice record';

COMMENT ON COLUMN public.invoices.org_id IS 
'Organization this invoice belongs to';

COMMENT ON COLUMN public.invoices.subscription_id IS 
'References subscriptions.id - null for one-time charges';

COMMENT ON COLUMN public.invoices.stripe_invoice_id IS 
'Stripe Invoice ID (in_xxx) - links to invoice in Stripe Dashboard';

COMMENT ON COLUMN public.invoices.stripe_customer_id IS 
'Stripe Customer ID (cus_xxx) - redundant for quick queries';

COMMENT ON COLUMN public.invoices.number IS 
'Human-readable invoice number (e.g., INV-001)';

COMMENT ON COLUMN public.invoices.status IS 
'Invoice status: draft (not finalized), open (awaiting payment), paid (successfully paid), void (canceled), uncollectible (marked as bad debt)';

COMMENT ON COLUMN public.invoices.amount_due IS 
'Total amount due in cents (e.g., 2900 = $29.00)';

COMMENT ON COLUMN public.invoices.amount_paid IS 
'Amount paid so far in cents - may be partial payment';

COMMENT ON COLUMN public.invoices.amount_remaining IS 
'Remaining balance due in cents (amount_due - amount_paid)';

COMMENT ON COLUMN public.invoices.subtotal IS 
'Subtotal before tax in cents';

COMMENT ON COLUMN public.invoices.tax IS 
'Tax amount in cents (calculated by Stripe Tax)';

COMMENT ON COLUMN public.invoices.total IS 
'Final total including tax in cents (subtotal + tax)';

COMMENT ON COLUMN public.invoices.invoice_pdf IS 
'Direct URL to downloadable PDF invoice';

COMMENT ON COLUMN public.invoices.hosted_invoice_url IS 
'URL to Stripe-hosted invoice page where customers can pay';

COMMENT ON COLUMN public.invoices.due_date IS 
'Invoice due date - null for immediate payment required';

COMMENT ON COLUMN public.invoices.paid_at IS 
'Timestamp when invoice was successfully paid - null if unpaid';

COMMENT ON COLUMN public.invoices.period_start IS 
'Start of billing period this invoice covers';

COMMENT ON COLUMN public.invoices.period_end IS 
'End of billing period this invoice covers';

COMMENT ON COLUMN public.invoices.metadata IS 
'JSONB storage for additional Stripe invoice metadata';

COMMENT ON COLUMN public.invoices.created_at IS 
'Timestamp when invoice record was created in database';

COMMENT ON COLUMN public.invoices.updated_at IS 
'Timestamp when invoice was last synced from Stripe webhooks';

-- ============================================================================
-- 4. PAYMENT_METHODS TABLE
-- ============================================================================

COMMENT ON TABLE public.payment_methods IS 
'Payment methods attached to organizations via Stripe. Tracks cards, bank accounts, and other payment instruments. Synced by payment_method.* webhooks.';

COMMENT ON COLUMN public.payment_methods.id IS 
'Unique identifier for payment method record';

COMMENT ON COLUMN public.payment_methods.org_id IS 
'Organization this payment method belongs to';

COMMENT ON COLUMN public.payment_methods.stripe_payment_method_id IS 
'Stripe Payment Method ID (pm_xxx) - links to payment method in Stripe Dashboard';

COMMENT ON COLUMN public.payment_methods.stripe_customer_id IS 
'Stripe Customer ID this payment method is attached to';

COMMENT ON COLUMN public.payment_methods.type IS 
'Payment method type: card (credit/debit card), bank_account (ACH), sepa_debit (SEPA Direct Debit)';

COMMENT ON COLUMN public.payment_methods.card_brand IS 
'Card brand: visa, mastercard, amex, discover, etc. Null for non-card types.';

COMMENT ON COLUMN public.payment_methods.card_last4 IS 
'Last 4 digits of card number for display (e.g., 4242). Null for non-card types.';

COMMENT ON COLUMN public.payment_methods.card_exp_month IS 
'Card expiration month (1-12). Null for non-card types.';

COMMENT ON COLUMN public.payment_methods.card_exp_year IS 
'Card expiration year (e.g., 2025). Null for non-card types.';

COMMENT ON COLUMN public.payment_methods.is_default IS 
'Whether this is the default payment method for the customer - synced from customer.invoice_settings.default_payment_method';

COMMENT ON COLUMN public.payment_methods.metadata IS 
'JSONB storage for additional Stripe payment method metadata';

COMMENT ON COLUMN public.payment_methods.created_at IS 
'Timestamp when payment method was added';

COMMENT ON COLUMN public.payment_methods.updated_at IS 
'Timestamp when payment method was last synced (e.g., expiration date updated)';

-- ============================================================================
-- 5. STRIPE_WEBHOOK_EVENTS TABLE
-- ============================================================================

COMMENT ON TABLE public.stripe_webhook_events IS 
'Audit log of all Stripe webhook events received. Used for debugging, idempotency, and compliance tracking. Every webhook is logged before processing.';

COMMENT ON COLUMN public.stripe_webhook_events.id IS 
'Unique identifier for webhook event record';

COMMENT ON COLUMN public.stripe_webhook_events.stripe_event_id IS 
'Stripe Event ID (evt_xxx) - unique identifier from Stripe for idempotency checks';

COMMENT ON COLUMN public.stripe_webhook_events.event_type IS 
'Stripe event type (e.g., customer.subscription.created, invoice.paid, payment_method.attached)';

COMMENT ON COLUMN public.stripe_webhook_events.payload IS 
'Full JSONB webhook payload from Stripe - complete event object for debugging and replay';

COMMENT ON COLUMN public.stripe_webhook_events.processed IS 
'Whether event was successfully processed by webhook handler - false indicates pending or failed';

COMMENT ON COLUMN public.stripe_webhook_events.processed_at IS 
'Timestamp when event was successfully processed - null if not yet processed';

COMMENT ON COLUMN public.stripe_webhook_events.error IS 
'Error message if webhook processing failed - null if successful or pending';

COMMENT ON COLUMN public.stripe_webhook_events.created_at IS 
'Timestamp when webhook was received - matches Stripe event creation time';

-- ============================================================================
-- 6. SUBSCRIPTION_TIERS TABLE (Enhanced Comments)
-- ============================================================================

COMMENT ON COLUMN public.subscription_tiers.stripe_product_id IS 
'Stripe Product ID (prod_xxx) - links to product in Stripe Dashboard';

COMMENT ON COLUMN public.subscription_tiers.stripe_price_id IS 
'Stripe Price ID (price_xxx) - used to create checkout sessions and identify tier from webhook price';

COMMENT ON COLUMN public.subscription_tiers.price_monthly IS 
'Monthly price in cents (e.g., 2900 = $29/month) - null for free tier or non-monthly pricing';

COMMENT ON COLUMN public.subscription_tiers.price_yearly IS 
'Yearly price in cents (e.g., 29000 = $290/year) - null for free tier or non-yearly pricing';

-- ============================================================================
-- Index Comments
-- ============================================================================

COMMENT ON INDEX public.idx_subscriptions_org_id IS 
'Primary lookup index for subscriptions by organization. Critical for webhook processing and billing queries.';

COMMENT ON INDEX public.idx_subscriptions_status IS 
'Filter index for subscription status queries (e.g., finding active subscriptions). Used in reports and analytics.';

-- ============================================================================
-- Migration Completion
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Migration 20250103000000_stripe_tables_comments completed successfully';
    RAISE NOTICE 'Added comprehensive comments to 5 Stripe billing tables';
    RAISE NOTICE 'Added column-level documentation for Supabase auto-generated API docs';
    RAISE NOTICE 'All comments follow @sql-testing documentation standards';
END $$;

COMMIT;

-- ============================================================================
-- Rollback Script (Not needed for comments-only migration)
-- ============================================================================
/*
-- Comments are documentation only and do not affect functionality
-- No rollback required
*/

-- ============================================================================
-- @sql-testing Compliance Checklist
-- ============================================================================
/*
✅ Transaction Management
  - Wrapped in BEGIN/COMMIT
  - Idempotent (comments can be re-applied)

✅ Documentation
  - All tables have COMMENT ON TABLE
  - All columns have COMMENT ON COLUMN
  - Comments describe purpose, format, and usage

✅ Security
  - Comments-only migration (no security impact)
  - No changes to RLS policies or permissions

✅ Performance
  - No indexes added/modified
  - Zero performance impact

✅ Integration
  - Comments enable Supabase auto-generated API documentation
  - Improves developer experience with inline docs
*/

