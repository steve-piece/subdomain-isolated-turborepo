// apps/protected/components/shared/subdomain-auth-checker.tsx
/**
 * @deprecated This component is DEPRECATED as of October 2, 2025
 *
 * ⚠️ DO NOT USE - Protected layout already handles auth ⚠️
 *
 * MIGRATION: Simply redirect to dashboard - no auth check needed
 * See: /apps/protected/components/shared/DEPRECATED_AUTH_COMPONENTS.md
 */
"use client";

import React from "react";
import { createClient } from "@workspace/supabase/client";
import { useTenantAccess, type GuardFailure } from "@workspace/ui/hooks";
import { Building2, Search } from "lucide-react";

interface SubdomainAuthCheckerProps {
  subdomain: string;
}

export function SubdomainAuthChecker({ subdomain }: SubdomainAuthCheckerProps) {
  const [shouldRedirect, setShouldRedirect] = React.useState(false);

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
      // Removed toast notifications to prevent spam - redirects provide feedback
      switch (failure.reason) {
        case "no_session":
          window.location.href = "/auth/login?reason=no_session";
          break;
        case "wrong_subdomain":
          window.location.href = "/auth/login?error=unauthorized";
          break;
        case "insufficient_role":
          window.location.href = "/auth/login?error=insufficient_permissions";
          break;
        case "error":
          window.location.href = "/auth/login?error=auth_check_failed";
          break;
      }
    },
  });

  // Handle redirect to dashboard when authenticated
  React.useEffect(() => {
    if (access.state === "allowed" && !shouldRedirect) {
      setShouldRedirect(true);
      window.location.href = "/dashboard";
    }
  }, [access.state, shouldRedirect]);

  if (access.state === "checking") {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-background to-muted/30">
        <div className="flex flex-col items-center gap-6">
          <Building2 className="h-16 w-16 mb-2 text-primary" />
          <div className="relative">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
          <div className="text-center max-w-md">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent mb-2">
              Loading {subdomain}
            </h2>
            <p className="text-muted-foreground flex items-center justify-center">
              <Search className="h-4 w-4 mr-2" />
              Verifying your access permissions...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show loading screen while redirecting to dashboard
  if (access.state === "allowed" || shouldRedirect) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-background to-muted/30">
        <div className="flex flex-col items-center gap-6">
          <Building2 className="h-16 w-16 mb-2 text-primary" />
          <div className="relative">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
          <div className="text-center max-w-md">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent mb-2">
              Welcome back!
            </h2>
            <p className="text-muted-foreground flex items-center justify-center">
              <Search className="h-4 w-4 mr-2" />
              Redirecting to dashboard...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Fallback - should not reach here due to redirects above
  return null;
}
