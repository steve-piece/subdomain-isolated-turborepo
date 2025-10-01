// apps/protected/app/s/[subdomain]/(protected)/layout.tsx
/**
 * Route-group layout that protects all nested routes under (protected)
 * by enforcing tenant auth once at the layout boundary.
 * Now includes the AppSidebar for consistent navigation with RBAC enforcement.
 * ✅ PHASE 1.2: Centralized auth with TenantClaimsProvider
 */
import { AppSidebar } from "@/components/shared/app-sidebar";
import { OnboardingCheck } from "@/components/shared/onboarding-check";
import { TenantClaimsProvider } from "@/lib/contexts/tenant-claims-context";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import * as Sentry from "@sentry/nextjs";

export default async function ProtectedLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;
  const supabase = await createClient();

  // ✅ Single auth check for the entire layout tree
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Use getClaims() - validates JWT locally (faster than getUser)
  const { data: claims } = await supabase.auth.getClaims();

  if (!claims || claims.claims.subdomain !== subdomain) {
    redirect("/auth/login?error=unauthorized");
  }

  // Sentry logging for debugging
  const sanitizedClaimSummary = {
    claimKeys: Object.keys(claims.claims ?? {}),
    hasOrgId: Boolean(claims.claims?.org_id),
    hasUserRole: Boolean(claims.claims?.user_role),
  };

  if (!claims.claims.org_id) {
    Sentry.logger.warn("require_tenant_auth_missing_org_id", {
      subdomain,
      sanitizedClaimSummary,
    });
  }

  if (!claims.claims.user_role) {
    Sentry.logger.warn("require_tenant_auth_missing_user_role", {
      subdomain,
      sanitizedClaimSummary,
    });
  }

  const organizationName = claims.claims.company_name || subdomain;
  const userRole = claims.claims.user_role || "member";
  const orgId = claims.claims.org_id;
  const isOwner = userRole === "owner";

  // Check if organization needs onboarding
  let needsOnboarding = false;
  if (orgId && isOwner) {
    try {
      const { data: org } = await supabase
        .from("organizations")
        .select("onboarding_completed")
        .eq("id", orgId)
        .single();

      needsOnboarding = !org?.onboarding_completed;
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          context: "onboarding_check",
          org_id: orgId,
        },
      });
    }
  }

  // Get user capabilities from database (once)
  let userCapabilities: string[] = [];
  if (orgId) {
    try {
      // Get user's role-based capabilities
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("user_id", user.id)
        .eq("org_id", orgId)
        .single();

      if (profile) {
        const { data: capabilities } = await supabase
          .from("role_capabilities")
          .select("capabilities(key)")
          .eq("role", profile.role)
          .eq("is_default", true);

        if (capabilities) {
          userCapabilities = capabilities
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((cap: any) => cap.capabilities?.key)
            .filter(Boolean);
        }
      }
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          context: "protected_layout_capabilities",
          org_id: orgId,
        },
      });
    }
  }

  // Prepare claims object for context
  const tenantClaims = {
    user_id: user.id,
    email: user.email || "",
    subdomain: claims.claims.subdomain,
    org_id: claims.claims.org_id,
    company_name: claims.claims.company_name,
    full_name: claims.claims.full_name,
    user_role: userRole,
    capabilities: userCapabilities,
  };

  return (
    <TenantClaimsProvider claims={tenantClaims}>
      <OnboardingCheck
        organizationName={organizationName}
        subdomain={subdomain}
        needsOnboarding={needsOnboarding}
        isOwner={isOwner}
      />
      <div className="flex h-screen overflow-hidden bg-background">
        <AppSidebar
          subdomain={subdomain}
          organizationName={organizationName}
          userRole={userRole}
          userCapabilities={userCapabilities}
        />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </TenantClaimsProvider>
  );
}
