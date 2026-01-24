// apps/protected/app/actions/billing/checkout.ts
"use server";

import { createClient } from "@workspace/supabase/server";
import { stripe } from "@/lib/stripe/server";
import { getOrCreateStripeCustomer } from "./stripe-customer";

export interface CreateCheckoutSessionResponse {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Create a Stripe Checkout session for subscription upgrade
 */
export async function createCheckoutSession(
  orgId: string,
  priceId: string,
  subdomain: string,
): Promise<CreateCheckoutSessionResponse> {
  try {
    const supabase = await createClient();

    // Verify user has permission
    const { data: claims } = await supabase.auth.getClaims();
    const userRole = claims?.claims.user_role;

    if (!["owner", "admin"].includes(userRole)) {
      return {
        success: false,
        error:
          "Insufficient permissions. Only owners and admins can manage billing.",
      };
    }

    // Get or create Stripe customer
    const customerResult = await getOrCreateStripeCustomer(orgId);

    if (!customerResult.success || !customerResult.customerId) {
      return {
        success: false,
        error: customerResult.error || "Failed to create customer",
      };
    }

    const successUrl = `https://${subdomain}.${process.env.NEXT_PUBLIC_APP_DOMAIN}/org-settings/billing?success=true`;
    const cancelUrl = `https://${subdomain}.${process.env.NEXT_PUBLIC_APP_DOMAIN}/org-settings/billing?canceled=true`;

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerResult.customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        org_id: orgId,
        subdomain: subdomain,
      },
      subscription_data: {
        metadata: {
          org_id: orgId,
          subdomain: subdomain,
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: "required",
    });

    return {
      success: true,
      url: session.url || undefined,
    };
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create checkout session",
    };
  }
}

/**
 * Create a Stripe Billing Portal session for managing subscription
 */
export async function createBillingPortalSession(
  orgId: string,
  subdomain: string,
): Promise<CreateCheckoutSessionResponse> {
  try {
    const supabase = await createClient();

    // Verify user has permission
    const { data: claims } = await supabase.auth.getClaims();
    const userRole = claims?.claims.user_role;

    if (!["owner", "admin"].includes(userRole)) {
      return {
        success: false,
        error:
          "Insufficient permissions. Only owners and admins can manage billing.",
      };
    }

    // Get Stripe customer
    const { data: profile } = await supabase
      .from("customer_billing_profiles")
      .select("stripe_customer_id")
      .eq("org_id", orgId)
      .single();

    if (!profile?.stripe_customer_id) {
      return {
        success: false,
        error: "No billing profile found. Please set up a subscription first.",
      };
    }

    const returnUrl = `https://${subdomain}.${process.env.NEXT_PUBLIC_APP_DOMAIN}/org-settings/billing`;

    // Create Billing Portal Session
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: returnUrl,
    });

    return {
      success: true,
      url: session.url,
    };
  } catch (error) {
    console.error("Error creating billing portal session:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create billing portal session",
    };
  }
}

/**
 * Cancel subscription at period end
 */
export async function cancelSubscriptionAtPeriodEnd(
  orgId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Verify user has permission
    const { data: claims } = await supabase.auth.getClaims();
    const userRole = claims?.claims.user_role;

    if (!["owner", "admin"].includes(userRole)) {
      return {
        success: false,
        error: "Insufficient permissions",
      };
    }

    // Get subscription
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id")
      .eq("org_id", orgId)
      .single();

    if (!subscription?.stripe_subscription_id) {
      return {
        success: false,
        error: "No active subscription found",
      };
    }

    // Cancel in Stripe
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    // Update database
    await supabase
      .from("subscriptions")
      .update({
        cancel_at_period_end: true,
        updated_at: new Date().toISOString(),
      })
      .eq("org_id", orgId);

    return { success: true };
  } catch (error) {
    console.error("Error canceling subscription:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to cancel subscription",
    };
  }
}
