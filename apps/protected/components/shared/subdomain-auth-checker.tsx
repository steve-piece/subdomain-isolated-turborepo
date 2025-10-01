// apps/protected/components/shared/subdomain-auth-checker.tsx
// Client-side guard that verifies tenant claims before rendering the dashboard shell.
"use client";

import React from "react";
import { OrganizationDashboard } from "@/components/dashboard/organization-dashboard";
import { createClient } from "@/lib/supabase/client";
import {
  useTenantAccess,
  type GuardFailure,
  resolveGuardMessage,
} from "@workspace/ui/hooks";
import { useToast } from "@workspace/ui/components/toast";

interface SubdomainAuthCheckerProps {
  subdomain: string;
}

export function SubdomainAuthChecker({ subdomain }: SubdomainAuthCheckerProps) {
  const { addToast } = useToast();
  const access = useTenantAccess({
    subdomain,
    redirectTo: "/auth/login",
    navigate: (path) => window.location.replace(path),
    createClient,
    showToast: false,
    messages: {
      no_session: "Please sign in to access this organization",
      wrong_subdomain:
        "Your account does not belong to this organization. Please sign in again.",
      insufficient_role:
        "You do not have sufficient permissions to access this organization.",
      error: "We ran into a problem validating your access.",
    },
    onDenied: (failure: GuardFailure) => {
      switch (failure.reason) {
        case "no_session":
          window.location.href = "/auth/login?reason=no_session";
          break;
        case "wrong_subdomain":
          addToast(
            resolveGuardMessage(
              failure,
              undefined,
              "You don't have access to this organization"
            ),
            "error",
            5000
          );
          window.location.href = "/auth/login?error=unauthorized";
          break;
        case "insufficient_role":
          addToast(
            resolveGuardMessage(
              failure,
              undefined,
              "Insufficient permissions for this organization"
            ),
            "warning"
          );
          window.location.href = "/auth/login?error=insufficient_permissions";
          break;
        case "error":
          addToast(
            resolveGuardMessage(
              failure,
              undefined,
              "Authentication check failed"
            ),
            "error"
          );
          window.location.href = "/auth/login?error=auth_check_failed";
          break;
      }
    },
  });

  if (access.state === "checking") {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-background to-muted/30">
        <div className="flex flex-col items-center gap-6">
          <div className="text-6xl mb-2">🏢</div>
          <div className="relative">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
          <div className="text-center max-w-md">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent mb-2">
              Loading {subdomain}
            </h2>
            <p className="text-muted-foreground flex items-center justify-center">
              <span className="mr-2">🔍</span>
              Verifying your access permissions...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If authenticated, show the dashboard
  if (access.state === "allowed") {
    const claims = access.claims.claims;
    return (
      <OrganizationDashboard
        organizationName={claims.company_name ?? subdomain}
        subdomain={subdomain}
        userEmail={(claims.email as string | undefined) ?? ""}
      />
    );
  }

  // Fallback - should not reach here due to redirects above
  return null;
}
