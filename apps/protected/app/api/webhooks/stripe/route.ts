// apps/protected/app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { stripe, STRIPE_CONFIG } from "@/lib/stripe/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import {
  syncSubscription,
  syncSubscriptionDeleted,
  syncCheckoutCompleted,
  syncCustomerUpdated,
  syncCustomerDeleted,
  syncInvoicePaid,
  syncInvoicePaymentFailed,
  syncInvoiceFinalized,
  syncPaymentMethodAttached,
  syncPaymentMethodDetached,
  syncPaymentMethodUpdated,
} from "@/app/actions/billing/webhook-sync";

// Create service role client for webhook handlers
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
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
      { status: 400 },
    );
  }

  if (!STRIPE_CONFIG.webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 },
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      STRIPE_CONFIG.webhookSecret,
    );
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Log the event
  await supabaseAdmin.from("stripe_webhook_events").insert({
    stripe_event_id: event.id,
    event_type: event.type,
    payload: event.data.object as unknown as Record<string, unknown>,
  });

  try {
    let result: { success: boolean; error?: string } = { success: false };

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        result = await syncSubscription(
          event.data.object as Stripe.Subscription,
        );
        break;

      case "customer.subscription.deleted":
        result = await syncSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );
        break;

      case "checkout.session.completed":
        result = await syncCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;

      case "customer.updated":
        result = await syncCustomerUpdated(
          event.data.object as Stripe.Customer,
        );
        break;

      case "customer.deleted":
        result = await syncCustomerDeleted(
          event.data.object as Stripe.Customer,
        );
        break;

      case "invoice.paid":
        result = await syncInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        result = await syncInvoicePaymentFailed(
          event.data.object as Stripe.Invoice,
        );
        break;

      case "invoice.finalized":
        result = await syncInvoiceFinalized(
          event.data.object as Stripe.Invoice,
        );
        break;

      case "payment_method.attached":
        result = await syncPaymentMethodAttached(
          event.data.object as Stripe.PaymentMethod,
        );
        break;

      case "payment_method.detached":
        result = await syncPaymentMethodDetached(
          event.data.object as Stripe.PaymentMethod,
        );
        break;

      case "payment_method.updated":
        result = await syncPaymentMethodUpdated(
          event.data.object as Stripe.PaymentMethod,
        );
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
        result = { success: true }; // Don't fail on unhandled events
    }

    if (!result.success && result.error) {
      throw new Error(result.error);
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
      { status: 500 },
    );
  }
}
