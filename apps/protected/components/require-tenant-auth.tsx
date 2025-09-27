// apps/protected/components/require-tenant-auth.tsx 
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

type AppRole = "superadmin" | "admin" | "member" | "view-only";

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
  // Build a server-scoped Supabase client that reads the request cookies
  const supabase = await createClient();

  // Decode the JWT locally (no network hop) and read our custom claims
  const { data: claims, error } = await supabase.auth.getClaims();

  // No session or decode error: send the user to login (clean URL)
  if (error || !claims) redirect("/auth/login");

  if (claims.claims.email_confirmed !== true) {
    redirect("/auth/login?error=email_unconfirmed");
  }

  // Ensure the JWT belongs to the same tenant as the route
  if (claims.claims.subdomain !== subdomain) {
    redirect("/auth/login?error=unauthorized");
  }

  // If roles are required, verify the user's role is allowed
  const role = (claims.claims.user_role ?? "member") as AppRole;
  if (allowedRoles && !allowedRoles.includes(role)) {
    redirect("/dashboard?error=insufficient_permissions");
  }

  // All good: render the protected UI and provide the validated claims.
  // company_name is now included directly in the JWT via the custom claims hook.
  return <>{children(claims as unknown as TenantClaims)}</>;
}
