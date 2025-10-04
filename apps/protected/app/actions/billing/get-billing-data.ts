// apps/protected/app/actions/billing/get-billing-data.ts
"use server";

import { createClient } from "@/lib/supabase/server";

export interface BillingData {
  subscription: {
    tier: string;
    status: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
  usage: {
    teamMembers: { current: number; limit: number | null };
    projects: { current: number; limit: number | null };
    storage: { current: number; limit: number | null };
    apiCalls: { current: number; limit: number | null };
  };
  paymentMethod: {
    brand: string | null;
    last4: string | null;
    expMonth: number | null;
    expYear: number | null;
  } | null;
  invoices: Array<{
    id: string;
    number: string | null;
    amount: number;
    status: string;
    created: string;
    pdfUrl: string | null;
  }>;
}

/**
 * Get comprehensive billing data for an organization
 */
export async function getBillingData(orgId: string): Promise<BillingData> {
  const supabase = await createClient();

  // Fetch subscription
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select(
      `
      status,
      current_period_end,
      cancel_at_period_end,
      subscription_tiers (
        name
      )
    `,
    )
    .eq("org_id", orgId)
    .single();

  // Fetch usage metrics
  const { data: usageMetrics } = await supabase
    .from("usage_metrics")
    .select("metric_name, current_value, limit_value")
    .eq("org_id", orgId);

  // Fetch payment method
  const { data: paymentMethod } = await supabase
    .from("payment_methods")
    .select("card_brand, card_last4, card_exp_month, card_exp_year")
    .eq("org_id", orgId)
    .eq("is_default", true)
    .single();

  // Fetch recent invoices
  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, number, total, status, created_at, invoice_pdf")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(10);

  // Format usage metrics
  const usage = {
    teamMembers: { current: 0, limit: null as number | null },
    projects: { current: 0, limit: null as number | null },
    storage: { current: 0, limit: null as number | null },
    apiCalls: { current: 0, limit: null as number | null },
  };

  usageMetrics?.forEach((metric) => {
    const key = metric.metric_name as keyof typeof usage;
    if (key in usage) {
      usage[key] = {
        current: metric.current_value,
        limit: metric.limit_value,
      };
    }
  });

  return {
    subscription: subscription
      ? {
          tier:
            (
              subscription as unknown as {
                subscription_tiers?: { name: string };
              }
            ).subscription_tiers?.name || "Free",
          status: subscription.status,
          currentPeriodEnd: subscription.current_period_end,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        }
      : null,
    usage,
    paymentMethod: paymentMethod
      ? {
          brand: paymentMethod.card_brand,
          last4: paymentMethod.card_last4,
          expMonth: paymentMethod.card_exp_month,
          expYear: paymentMethod.card_exp_year,
        }
      : null,
    invoices:
      invoices?.map((invoice) => ({
        id: invoice.id,
        number: invoice.number,
        amount: invoice.total,
        status: invoice.status,
        created: invoice.created_at,
        pdfUrl: invoice.invoice_pdf,
      })) || [],
  };
}

/**
 * Get available subscription plans
 */
export async function getSubscriptionPlans() {
  const supabase = await createClient();

  const { data: plans } = await supabase
    .from("subscription_tiers")
    .select("*")
    .order("price_monthly", { ascending: true });

  return plans || [];
}
