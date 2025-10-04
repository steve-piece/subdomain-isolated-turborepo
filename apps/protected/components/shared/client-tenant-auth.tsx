// apps/protected/components/client-tenant-auth.tsx
// Declarative client-side tenant guard that validates Supabase claims and roles.
"use client";

import React from "react";
import { useToast } from "@workspace/ui/components/toast";
import { createClient } from "@/lib/supabase/client";
import {
  useTenantAccess,
  type AppRole,
  type TenantClaims,
  type GuardFailure,
  resolveGuardMessage,
} from "@workspace/ui/hooks";

interface ClientTenantAuthProps {
  subdomain: string;
  allowedRoles?: AppRole[];
  children: (claims: TenantClaims) => React.ReactNode;
  redirectToLogin?: boolean; // Default: false (show toast instead)
  showAccessDeniedToast?: boolean; // Default: true
}

export function ClientTenantAuth({
  subdomain,
  allowedRoles,
  children,
  redirectToLogin = false,
  showAccessDeniedToast = true,
}: ClientTenantAuthProps) {
  const { addToast } = useToast();
  const access = useTenantAccess({
    subdomain,
    allowedRoles,
    redirectTo: redirectToLogin ? "/auth/login" : undefined,
    navigate: (path: string | URL) => window.location.replace(path),
    createClient,
    showToast: false,
    messages: {
      no_session: "Please sign in to access this content",
      wrong_subdomain: "You don't have access to this organization",
      insufficient_role: (failure) =>
        `This content requires ${failure.allowed.join(
          " or ",
        )} permissions. Your current role: ${failure.actual ?? "unknown"}`,
      error: "Authentication check failed",
    },
    onDenied: (failure: GuardFailure) => {
      if (redirectToLogin) return;
      if (!showAccessDeniedToast) return;

      switch (failure.reason) {
        case "no_session":
          addToast(
            resolveGuardMessage(
              failure,
              undefined,
              "Please sign in to access this content",
            ),
            "warning",
          );
          break;
        case "wrong_subdomain":
          addToast(
            resolveGuardMessage(
              failure,
              undefined,
              "You don't have access to this organization",
            ),
            "error",
          );
          break;
        case "insufficient_role":
          addToast(
            resolveGuardMessage(
              failure,
              undefined,
              `This content requires ${failure.allowed.join(
                " or ",
              )} permissions. Your current role: ${failure.actual ?? "unknown"}`,
            ),
            "warning",
            5000,
          );
          break;
        case "error":
          addToast(
            resolveGuardMessage(
              failure,
              undefined,
              "Authentication check failed",
            ),
            "error",
          );
          break;
      }
    },
  });

  if (access.state === "checking") {
    return (
      <div className="flex items-center justify-center min-h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (access.state !== "allowed") {
    return (
      <div className="flex items-center justify-center min-h-32 text-muted-foreground">
        <p>Access denied</p>
      </div>
    );
  }

  return <>{children(access.claims)}</>;
}
