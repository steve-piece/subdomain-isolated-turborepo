// apps/protected/app/s/[subdomain]/(protected)/layout.tsx
/**
 * Route-group layout that protects all nested routes under (protected)
 * by enforcing tenant auth once at the layout boundary.
 * Now includes the AppSidebar for consistent navigation with RBAC enforcement.
 * ✅ PHASE 1.2: Centralized auth with TenantClaimsProvider
 */
import { AppSidebar } from "@/components/shared/app-sidebar";
import { CommandKSearch } from "@/components/shared/command-k-search";
import { OnboardingCheck } from "@/components/shared/onboarding-check";
import { TenantClaimsProvider } from "@/lib/contexts/tenant-claims-context";
import { createClient } from "@workspace/supabase/server";
import { redirect } from "next/navigation";
import * as Sentry from "@sentry/nextjs";
import {
  SidebarInset,
  SidebarProvider,
} from "@workspace/ui/components/sidebar";

export default async function ProtectedLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ subdomain: string }>;
}): Promise<React.ReactNode> {
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

  // ✅ FORCE LOGOUT CHECK: Verify user's session is still valid
  // Check if user should be forced to logout due to:
  // - Organization-wide logout (migrations, security)
  // - User-specific logout (role change, suspicious activity)
  // - Permission updates (capabilities changed)

  // Get JWT issued at time from the session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.access_token && claims.claims.org_id) {
    try {
      // Decode JWT to get issued_at time (iat is in the payload)
      const tokenParts = session.access_token.split(".");
      if (tokenParts.length !== 3 || !tokenParts[1]) {
        throw new Error("Invalid JWT format");
      }

      const payload = JSON.parse(atob(tokenParts[1]));
      const jwtIssuedAt = payload.iat
        ? new Date(payload.iat * 1000).toISOString()
        : null;

      if (!jwtIssuedAt) {
        throw new Error("JWT issued_at time not found");
      }

      const { data: logoutCheck } = await supabase.rpc("should_force_logout", {
        p_user_id: user.id,
        p_org_id: claims.claims.org_id,
        p_jwt_issued_at: jwtIssuedAt,
      });

      if (logoutCheck?.should_logout) {
        // Log the reason for debugging
        Sentry.logger.info("force_logout_triggered", {
          user_id: user.id,
          org_id: claims.claims.org_id,
          reason: logoutCheck.reason,
          jwt_issued_at: jwtIssuedAt,
        });

        // Force logout
        await supabase.auth.signOut();
        redirect(
          `/auth/login?message=${encodeURIComponent(logoutCheck.reason || "Please log in again")}`,
        );
      }
    } catch (error) {
      // Don't block user if force logout check fails, but log it
      Sentry.captureException(error, {
        tags: {
          context: "force_logout_check",
          user_id: user.id,
          org_id: claims.claims.org_id,
        },
      });
    }
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

  // Get capabilities from JWT (now included in custom_claims_hook)
  const userCapabilities: string[] = claims.claims.capabilities || [];

  // Get organization logo from JWT
  const organizationLogoUrl = claims.claims.organization_logo_url;

  // Get user's full name and avatar from database (not in minimal JWT)
  let userFullName: string | null = null;
  let userAvatarUrl: string | null = null;
  try {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("full_name, profile_picture_url")
      .eq("user_id", user.id)
      .single();
    userFullName = profile?.full_name || null;
    userAvatarUrl = profile?.profile_picture_url || null;
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        context: "user_profile_fetch",
        user_id: user.id,
      },
    });
  }

  // Check if organization needs onboarding
  let needsOnboarding = false;

  if (orgId) {
    try {
      const { data: org } = await supabase
        .from("organizations")
        .select("onboarding_completed")
        .eq("id", orgId)
        .single();

      if (org) {
        needsOnboarding = isOwner && !org.onboarding_completed;
      }
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          context: "onboarding_check",
          org_id: orgId,
        },
      });
    }
  }

  // ✅ Minimal JWT claims (identity + org context + authorization)
  const tenantClaims = {
    // Identity
    user_id: user.id,
    email: user.email || "",
    full_name: userFullName || undefined,

    // Organization Context
    org_id: claims.claims.org_id,
    subdomain: claims.claims.subdomain,
    company_name: claims.claims.company_name,
    organization_logo_url: claims.claims.organization_logo_url,

    // Authorization
    user_role: userRole as
      | "owner"
      | "superadmin"
      | "admin"
      | "member"
      | "view-only",
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
      <CommandKSearch
        userRole={userRole}
        userCapabilities={userCapabilities}
        subdomain={subdomain}
      />
      <SidebarProvider defaultOpen>
        <AppSidebar
          organizationName={organizationName}
          userRole={userRole}
          userCapabilities={userCapabilities}
          logoUrl={organizationLogoUrl}
          userName={userFullName}
          userAvatarUrl={userAvatarUrl}
        />
        <SidebarInset>
          <main className="flex flex-1 flex-col content-background pb-10">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TenantClaimsProvider>
  );
}
