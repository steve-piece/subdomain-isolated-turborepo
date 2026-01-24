// apps/protected/app/actions/billing/webhook-sync.ts
"use server";

import { stripe } from "@/lib/stripe/server";
import type Stripe from "stripe";

interface StripeInvoiceExtended extends Stripe.Invoice {
  subscription: string | Stripe.Subscription | null;
  tax: number | null;
}

// Create service role client for webhook handlers (lazy initialization)
// Note: This bypasses RLS as webhooks need elevated privileges
async function getSupabaseAdmin() {
  const { createClient } = await import("@supabase/supabase-js");
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error("supabaseUrl is required.");
  }

  return createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Sync subscription data from Stripe to database
 */
export async function syncSubscription(
  subscription: Stripe.Subscription,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabaseAdmin = await getSupabaseAdmin();
    // Type assertion for Stripe properties that come as snake_case from the API
    const sub = subscription as unknown as {
      current_period_start: number;
      current_period_end: number;
      cancel_at_period_end: boolean;
      canceled_at: number | null;
      trial_end: number | null;
    };
    const orgId = subscription.metadata.org_id;

    if (!orgId) {
      return { success: false, error: "No org_id in subscription metadata" };
    }

    // Get tier ID from price
    const { data: tier } = await supabaseAdmin
      .from("subscription_tiers")
      .select("id")
      .eq("stripe_price_id", subscription.items.data[0]?.price.id)
      .single();

    if (!tier) {
      return {
        success: false,
        error: `No tier found for price: ${subscription.items.data[0]?.price.id}`,
      };
    }

    const subscriptionData = {
      org_id: orgId,
      tier_id: tier.id,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer as string,
      status: subscription.status,
      period_start: new Date(sub.current_period_start * 1000).toISOString(),
      period_end: new Date(sub.current_period_end * 1000).toISOString(),
      current_period_start: new Date(
        sub.current_period_start * 1000,
      ).toISOString(),
      current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      cancel_at_period_end: sub.cancel_at_period_end,
      canceled_at: sub.canceled_at
        ? new Date(sub.canceled_at * 1000).toISOString()
        : null,
      trial_end: sub.trial_end
        ? new Date(sub.trial_end * 1000).toISOString()
        : null,
      billing_cycle:
        subscription.items.data[0]?.price.recurring?.interval || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin
      .from("subscriptions")
      .upsert(subscriptionData, {
        onConflict: "org_id",
      });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error syncing subscription:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Mark subscription as deleted/canceled
 */
export async function syncSubscriptionDeleted(
  subscription: Stripe.Subscription,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabaseAdmin = await getSupabaseAdmin();
    const { error } = await supabaseAdmin
      .from("subscriptions")
      .update({
        status: "canceled",
        canceled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_subscription_id", subscription.id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error syncing subscription deletion:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Sync checkout session completion
 */
export async function syncCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabaseAdmin = await getSupabaseAdmin();
    const orgId = session.metadata?.org_id;

    if (!orgId) {
      return { success: false, error: "No org_id in session metadata" };
    }

    // Update billing profile with customer ID if not already set
    if (session.customer) {
      await supabaseAdmin
        .from("customer_billing_profiles")
        .update({
          stripe_customer_id: session.customer as string,
          updated_at: new Date().toISOString(),
        })
        .eq("org_id", orgId)
        .is("stripe_customer_id", null);
    }

    // Log successful checkout for analytics
    console.log(`Checkout completed for org: ${orgId}, session: ${session.id}`);

    return { success: true };
  } catch (error) {
    console.error("Error syncing checkout completion:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Sync customer updates from Stripe
 */
export async function syncCustomerUpdated(
  customer: Stripe.Customer,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabaseAdmin = await getSupabaseAdmin();
    const orgId = customer.metadata.org_id;

    if (!orgId) {
      return { success: false, error: "No org_id in customer metadata" };
    }

    const { error } = await supabaseAdmin
      .from("customer_billing_profiles")
      .update({
        billing_email: customer.email || null,
        billing_name: customer.name || null,
        billing_address: customer.address || null,
        default_payment_method_id: customer.invoice_settings
          .default_payment_method as string | null,
        updated_at: new Date().toISOString(),
      })
      .eq("org_id", orgId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error syncing customer update:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Handle customer deletion
 */
export async function syncCustomerDeleted(
  customer: Stripe.Customer,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabaseAdmin = await getSupabaseAdmin();
    const orgId = customer.metadata.org_id;

    if (!orgId) {
      return { success: false, error: "No org_id in customer metadata" };
    }

    // Soft delete by nullifying the customer ID
    const { error } = await supabaseAdmin
      .from("customer_billing_profiles")
      .update({
        stripe_customer_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("org_id", orgId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error syncing customer deletion:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Sync paid invoice to database
 */
export async function syncInvoicePaid(
  invoice: Stripe.Invoice,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabaseAdmin = await getSupabaseAdmin();
    const orgId = invoice.metadata?.org_id;

    if (!orgId) {
      return { success: false, error: "No org_id in invoice metadata" };
    }

    // Get subscription
    const invoiceSubscription = (invoice as StripeInvoiceExtended).subscription;
    const subscriptionId =
      typeof invoiceSubscription === "string"
        ? invoiceSubscription
        : invoiceSubscription && typeof invoiceSubscription === "object"
          ? invoiceSubscription.id
          : null;

    const { data: subscription } = await supabaseAdmin
      .from("subscriptions")
      .select("id")
      .eq("stripe_subscription_id", subscriptionId)
      .single();
    const { error } = await supabaseAdmin.from("invoices").upsert(
      {
        org_id: orgId,
        subscription_id: subscription?.id || null,
        stripe_invoice_id: invoice.id,
        stripe_customer_id: invoice.customer as string,
        number: invoice.number,
        status: invoice.status || "paid",
        amount_due: invoice.amount_due,
        amount_paid: invoice.amount_paid,
        amount_remaining: invoice.amount_remaining,
        subtotal: invoice.subtotal,
        tax: (invoice as StripeInvoiceExtended).tax ?? 0,
        total: invoice.total,
        invoice_pdf: invoice.invoice_pdf,
        hosted_invoice_url: invoice.hosted_invoice_url,
        paid_at: invoice.status_transitions.paid_at
          ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
          : null,
        period_start: invoice.period_start
          ? new Date(invoice.period_start * 1000).toISOString()
          : null,
        period_end: invoice.period_end
          ? new Date(invoice.period_end * 1000).toISOString()
          : null,
        due_date: invoice.due_date
          ? new Date(invoice.due_date * 1000).toISOString()
          : null,
        metadata: invoice.metadata || null,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "stripe_invoice_id",
      },
    );

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error syncing invoice:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Handle failed invoice payment
 */
export async function syncInvoicePaymentFailed(
  invoice: Stripe.Invoice,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabaseAdmin = await getSupabaseAdmin();
    const orgId = invoice.metadata?.org_id;

    if (!orgId) {
      return { success: false, error: "No org_id in invoice metadata" };
    }

    // Update subscription status to past_due
    const invoiceSubscription = (invoice as StripeInvoiceExtended).subscription;
    const subscriptionId =
      typeof invoiceSubscription === "string"
        ? invoiceSubscription
        : invoiceSubscription && typeof invoiceSubscription === "object"
          ? invoiceSubscription.id
          : null;

    const { error } = await supabaseAdmin
      .from("subscriptions")
      .update({
        status: "past_due",
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_subscription_id", subscriptionId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error syncing failed payment:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Sync finalized invoice (ready to be paid)
 */
export async function syncInvoiceFinalized(
  invoice: Stripe.Invoice,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabaseAdmin = await getSupabaseAdmin();
    const orgId = invoice.metadata?.org_id;

    if (!orgId) {
      return { success: false, error: "No org_id in invoice metadata" };
    }

    // Get subscription
    const invoiceSubscription = (invoice as StripeInvoiceExtended).subscription;
    const subscriptionId =
      typeof invoiceSubscription === "string"
        ? invoiceSubscription
        : invoiceSubscription && typeof invoiceSubscription === "object"
          ? invoiceSubscription.id
          : null;

    const { data: subscription } = await supabaseAdmin
      .from("subscriptions")
      .select("id")
      .eq("stripe_subscription_id", subscriptionId)
      .single();
    const { error } = await supabaseAdmin.from("invoices").upsert(
      {
        org_id: orgId,
        subscription_id: subscription?.id || null,
        stripe_invoice_id: invoice.id,
        stripe_customer_id: invoice.customer as string,
        number: invoice.number,
        status: "open",
        amount_due: invoice.amount_due,
        amount_paid: invoice.amount_paid || 0,
        amount_remaining: invoice.amount_remaining,
        subtotal: invoice.subtotal,
        tax: (invoice as StripeInvoiceExtended).tax ?? 0,
        total: invoice.total,
        invoice_pdf: invoice.invoice_pdf,
        hosted_invoice_url: invoice.hosted_invoice_url,
        due_date: invoice.due_date
          ? new Date(invoice.due_date * 1000).toISOString()
          : null,
        period_start: invoice.period_start
          ? new Date(invoice.period_start * 1000).toISOString()
          : null,
        period_end: invoice.period_end
          ? new Date(invoice.period_end * 1000).toISOString()
          : null,
        metadata: invoice.metadata || null,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "stripe_invoice_id",
      },
    );

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error syncing finalized invoice:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Sync payment method attachment
 */
export async function syncPaymentMethodAttached(
  paymentMethod: Stripe.PaymentMethod,
): Promise<{ success: boolean; error?: string }> {
  try {
    const customerId = paymentMethod.customer as string;

    if (!customerId) {
      return { success: false, error: "No customer ID on payment method" };
    }

    // Get org_id from customer
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) {
      return { success: false, error: "Customer was deleted" };
    }

    const orgId = customer.metadata.org_id;
    if (!orgId) {
      return { success: false, error: "No org_id in customer metadata" };
    }

    const supabaseAdmin = await getSupabaseAdmin();
    const { error } = await supabaseAdmin.from("payment_methods").insert({
      org_id: orgId,
      stripe_payment_method_id: paymentMethod.id,
      stripe_customer_id: customerId,
      type: paymentMethod.type,
      card_brand: paymentMethod.card?.brand || null,
      card_last4: paymentMethod.card?.last4 || null,
      card_exp_month: paymentMethod.card?.exp_month || null,
      card_exp_year: paymentMethod.card?.exp_year || null,
      is_default: false,
      metadata: paymentMethod.metadata || null,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error syncing payment method attachment:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Sync payment method detachment
 */
export async function syncPaymentMethodDetached(
  paymentMethod: Stripe.PaymentMethod,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabaseAdmin = await getSupabaseAdmin();
    const { error } = await supabaseAdmin
      .from("payment_methods")
      .delete()
      .eq("stripe_payment_method_id", paymentMethod.id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error syncing payment method detachment:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Sync payment method updates (e.g., expiration date changes)
 */
export async function syncPaymentMethodUpdated(
  paymentMethod: Stripe.PaymentMethod,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabaseAdmin = await getSupabaseAdmin();
    const { error } = await supabaseAdmin
      .from("payment_methods")
      .update({
        card_brand: paymentMethod.card?.brand || null,
        card_last4: paymentMethod.card?.last4 || null,
        card_exp_month: paymentMethod.card?.exp_month || null,
        card_exp_year: paymentMethod.card?.exp_year || null,
        metadata: paymentMethod.metadata || null,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_payment_method_id", paymentMethod.id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error syncing payment method update:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
