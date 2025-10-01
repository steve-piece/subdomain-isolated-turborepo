// apps/protected/app/actions/billing/stripe-customer.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe/server";
import { revalidatePath } from "next/cache";

export interface CreateStripeCustomerResponse {
  success: boolean;
  customerId?: string;
  error?: string;
}

/**
 * Get or create a Stripe customer for an organization
 */
export async function getOrCreateStripeCustomer(
  orgId: string
): Promise<CreateStripeCustomerResponse> {
  try {
    const supabase = await createClient();

    // Check if customer already exists
    const { data: existingProfile } = await supabase
      .from("customer_billing_profiles")
      .select("stripe_customer_id, billing_email")
      .eq("org_id", orgId)
      .single();

    if (existingProfile?.stripe_customer_id) {
      return {
        success: true,
        customerId: existingProfile.stripe_customer_id,
      };
    }

    // Get organization details
    const { data: org } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", orgId)
      .single();

    // Get user email from auth
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }

    // Create Stripe customer
    const customer = await stripe.customers.create({
      email: existingProfile?.billing_email || user.email,
      name: org?.name || "Organization",
      metadata: {
        org_id: orgId,
        user_id: user.id,
      },
    });

    // Update our database
    await supabase
      .from("customer_billing_profiles")
      .update({
        stripe_customer_id: customer.id,
        billing_email: customer.email,
      })
      .eq("org_id", orgId);

    return {
      success: true,
      customerId: customer.id,
    };
  } catch (error) {
    console.error("Error creating Stripe customer:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create customer",
    };
  }
}

/**
 * Update billing email for a customer
 */
export async function updateBillingEmail(
  orgId: string,
  email: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Get existing customer
    const { data: profile } = await supabase
      .from("customer_billing_profiles")
      .select("stripe_customer_id")
      .eq("org_id", orgId)
      .single();

    if (!profile?.stripe_customer_id) {
      return {
        success: false,
        error: "No billing profile found",
      };
    }

    // Update in Stripe
    await stripe.customers.update(profile.stripe_customer_id, {
      email,
    });

    // Update in database
    await supabase
      .from("customer_billing_profiles")
      .update({ billing_email: email })
      .eq("org_id", orgId);

    revalidatePath("/org-settings/billing");

    return { success: true };
  } catch (error) {
    console.error("Error updating billing email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update email",
    };
  }
}
