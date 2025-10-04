// apps/protected/components/require-usage-auth.tsx
// Server utility that layers entitlement and usage checks on top of tenant auth.
/**
 * Server wrapper that gates a feature by subscription entitlements and usage.
 *
 * It performs three checks before rendering any UI:
 * 1) Valid tenant session (via RequireTenantAuth-like checks)
 * 2) Entitlement: organization has the feature enabled (by tier)
 * 3) Usage: within the period limit (optionally increments usage atomically)
 *
 * If any check fails, we redirect or render a fallback (e.g., upsell).
 */
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  getOrgEntitlements,
  ensureWithinUsageAndIncrement,
} from "@/lib/billing/entitlements";
import type { ReactNode } from "react";

type AppRole = "owner" | "superadmin" | "admin" | "member" | "view-only";

export default async function RequireUsageAuth({
  subdomain,
  featureKey,
  increment,
  allowedRoles,
  children,
  fallback,
}: {
  /** Current tenant subdomain */
  subdomain: string;
  /** Feature key to check against entitlements & usage counters */
  featureKey: string;
  /** If true, increment usage atomically when rendering */
  increment?: boolean;
  /** Optional role allowlist required to use this feature */
  allowedRoles?: AppRole[];
  /** Protected content (rendered only when allowed) */
  children: ReactNode;
  /** Optional fallback to show when not allowed (otherwise redirect) */
  fallback?: ReactNode;
}) {
  const supabase = await createClient();

  // Read JWT claims locally
  const { data: claims, error } = await supabase.auth.getClaims();
  if (error || !claims) redirect("/auth/login");
  if (claims.claims.subdomain !== subdomain)
    redirect("/auth/login?error=unauthorized");

  const role = (claims.claims.user_role ?? "member") as AppRole;
  if (allowedRoles && !allowedRoles.includes(role)) {
    if (fallback) return <>{fallback}</>;
    redirect("/dashboard?error=insufficient_permissions");
  }

  const orgId = claims.claims.org_id as string | undefined;
  if (!orgId) {
    if (fallback) return <>{fallback}</>;
    redirect("/dashboard?error=missing_org");
  }

  // Ensure the feature is entitled for this org (by subscription tier)
  const entitlements = await getOrgEntitlements(orgId!);
  const entitled = entitlements.some(
    (e: { feature_key: string }) => e.feature_key === featureKey,
  );
  if (!entitled) {
    if (fallback) return <>{fallback}</>;
    redirect("/dashboard?error=feature_unavailable");
  }

  // Optionally enforce usage limits (and increment atomically)
  if (increment) {
    const within = await ensureWithinUsageAndIncrement(orgId!, featureKey);
    if (!within.allowed) {
      if (fallback) return <>{fallback}</>;
      redirect("/dashboard?error=usage_limit_reached");
    }
  }

  return <>{children}</>;
}
