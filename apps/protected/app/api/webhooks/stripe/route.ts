// apps/protected/app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { stripe, STRIPE_CONFIG } from "@/lib/stripe/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

// Create service role client for webhook handlers
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Disable body parsing so we can get raw body for signature verification
export const runtime = "nodejs";
export const preferredRegion = "auto";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "No signature provided" },
      { status: 400 }
    );
  }

  if (!STRIPE_CONFIG.webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      STRIPE_CONFIG.webhookSecret
    );
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Log the event
  await supabaseAdmin.from("stripe_webhook_events").insert({
    stripe_event_id: event.id,
    event_type: event.type,
    payload: event.data.object as any,
  });

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpdate(
          event.data.object as Stripe.Subscription
        );
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        );
        break;

      case "invoice.paid":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case "payment_method.attached":
        await handlePaymentMethodAttached(
          event.data.object as Stripe.PaymentMethod
        );
        break;

      case "payment_method.detached":
        await handlePaymentMethodDetached(
          event.data.object as Stripe.PaymentMethod
        );
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Mark event as processed
    await supabaseAdmin
      .from("stripe_webhook_events")
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
      })
      .eq("stripe_event_id", event.id);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);

    // Log error
    await supabaseAdmin
      .from("stripe_webhook_events")
      .update({
        error: error instanceof Error ? error.message : "Unknown error",
      })
      .eq("stripe_event_id", event.id);

    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

// Handler functions
async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const orgId = subscription.metadata.org_id;

  if (!orgId) {
    console.error("No org_id in subscription metadata");
    return;
  }

  // Get tier ID from price
  const { data: tier } = await supabaseAdmin
    .from("subscription_tiers")
    .select("id")
    .eq("stripe_price_id", subscription.items.data[0]?.price.id)
    .single();

  const subscriptionData = {
    org_id: orgId,
    tier_id: tier?.id,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: subscription.customer as string,
    status: subscription.status,
    current_period_start: new Date(
      subscription.current_period_start * 1000
    ).toISOString(),
    current_period_end: new Date(
      subscription.current_period_end * 1000
    ).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
    canceled_at: subscription.canceled_at
      ? new Date(subscription.canceled_at * 1000).toISOString()
      : null,
    trial_end: subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null,
    updated_at: new Date().toISOString(),
  };

  await supabaseAdmin.from("subscriptions").upsert(subscriptionData, {
    onConflict: "org_id",
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await supabaseAdmin
    .from("subscriptions")
    .update({
      status: "canceled",
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const orgId = invoice.metadata?.org_id;

  if (!orgId) {
    console.error("No org_id in invoice metadata");
    return;
  }

  // Get subscription
  const { data: subscription } = await supabaseAdmin
    .from("subscriptions")
    .select("id")
    .eq("stripe_subscription_id", invoice.subscription)
    .single();

  await supabaseAdmin.from("invoices").upsert(
    {
      org_id: orgId,
      subscription_id: subscription?.id,
      stripe_invoice_id: invoice.id,
      stripe_customer_id: invoice.customer as string,
      number: invoice.number,
      status: invoice.status || "paid",
      amount_due: invoice.amount_due,
      amount_paid: invoice.amount_paid,
      amount_remaining: invoice.amount_remaining,
      subtotal: invoice.subtotal,
      tax: invoice.tax || 0,
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
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "stripe_invoice_id",
    }
  );
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const orgId = invoice.metadata?.org_id;

  if (!orgId) {
    console.error("No org_id in invoice metadata");
    return;
  }

  // Update subscription status to past_due if payment failed
  await supabaseAdmin
    .from("subscriptions")
    .update({
      status: "past_due",
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", invoice.subscription);
}

async function handlePaymentMethodAttached(
  paymentMethod: Stripe.PaymentMethod
) {
  const customerId = paymentMethod.customer as string;

  if (!customerId) return;

  // Get org_id from customer
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) return;

  const orgId = customer.metadata.org_id;
  if (!orgId) return;

  await supabaseAdmin.from("payment_methods").insert({
    org_id: orgId,
    stripe_payment_method_id: paymentMethod.id,
    stripe_customer_id: customerId,
    type: paymentMethod.type,
    card_brand: paymentMethod.card?.brand,
    card_last4: paymentMethod.card?.last4,
    card_exp_month: paymentMethod.card?.exp_month,
    card_exp_year: paymentMethod.card?.exp_year,
    is_default: false,
  });
}

async function handlePaymentMethodDetached(
  paymentMethod: Stripe.PaymentMethod
) {
  await supabaseAdmin
    .from("payment_methods")
    .delete()
    .eq("stripe_payment_method_id", paymentMethod.id);
}
