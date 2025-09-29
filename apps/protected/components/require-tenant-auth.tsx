// apps/protected/components/require-tenant-auth.tsx
// Server-side gate that enforces tenant claims before rendering protected routes.
/**
 * Server wrapper that checks the user's JWT claims from cookies and ensures:
 * - The user has a valid session
 * - The JWT's subdomain matches the route's subdomain
 * - (Optional) The user's role is in the allowed list
 *
 * If any check fails, we redirect BEFORE rendering any UI to avoid flicker
 * and prevent shipping unauthorized components to the browser.
 */
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import React, { type ReactNode } from "react";
import * as Sentry from "@sentry/nextjs";

type AppRole = "owner" | "superadmin" | "admin" | "member" | "view-only";

export type TenantClaims = {
  claims: {
    subdomain: string;
    email?: string;
    org_id?: string;
    user_role?: AppRole | string;
    user_metadata?: Record<string, unknown>;
    company_name?: string;
  };
};

export default async function RequireTenantAuth({
  subdomain,
  allowedRoles,
  children,
}: {
  /** The tenant subdomain coming from the route params */
  subdomain: string;
  /** Optional allowlist of roles required to view this content */
  allowedRoles?: AppRole[];
  /** Render-prop children receive validated JWT claims */
  children: (claims: TenantClaims) => ReactNode;
}) {
  const supabase = await createClient();
  const { data: claims, error } = await supabase.auth.getClaims();

  if (error || !claims) {
    Sentry.logger.warn("require_tenant_auth_missing_claims", {
      subdomain,
      hasClaims: Boolean(claims),
      errorMessage: error?.message,
    });
    redirect("/auth/login?reason=no_session");
  }

  if (claims.claims.subdomain !== subdomain) {
    redirect("/auth/login?error=unauthorized");
  }

  const role = (claims.claims.user_role ?? "member") as AppRole;
  if (allowedRoles && !allowedRoles.includes(role)) {
    redirect("/dashboard?error=insufficient_permissions");
  }

  return <>{children(claims as unknown as TenantClaims)}</>;
}
