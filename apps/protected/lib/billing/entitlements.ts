// apps/protected/lib/billing/entitlements.ts
/**
 * Entitlements helpers used on the server:
 * - getOrgEntitlements: returns feature keys and limits for the org's active subscription
 * - ensureWithinUsageAndIncrement: atomically checks usage and increments if within limit
 */
"use server";

import { createClient } from "@workspace/supabase/server";

export type Entitlement = {
  feature_key: string;
  limit_per_period: number | null;
};

export type UsageCheck = {
  allowed: boolean;
  remaining: number | null;
};

/**
 * Returns the org's entitled features and per-period limits using a view that
 * resolves the current active subscription and tier mapping.
 */
export async function getOrgEntitlements(
  org_id: string,
): Promise<Entitlement[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("org_entitlements")
    .select("feature_key, limit_per_period")
    .eq("org_id", org_id);

  if (error) throw error;
  return (data ?? []) as Entitlement[];
}

/**
 * RPC that performs an atomic check+increment for a feature counter in the current billing window.
 * The SQL function must implement the logic described in database-setup.sql.
 */
export async function ensureWithinUsageAndIncrement(
  org_id: string,
  feature_key: string,
): Promise<UsageCheck> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "feature_increment_if_within_limit",
    {
      p_org_id: org_id,
      p_feature_key: feature_key,
    },
  );
  if (error) throw error;
  return (data ?? { allowed: false, remaining: 0 }) as UsageCheck;
}
