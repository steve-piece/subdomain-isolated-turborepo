// apps/protected/components/client-role-guard.tsx
/**
 * @deprecated This component is DEPRECATED as of October 2, 2025
 *
 * ⚠️ DO NOT USE - Use useTenantClaims() instead ⚠️
 *
 * MIGRATION: Use useEffect with useTenantClaims() for role checks
 * See: /apps/protected/components/shared/DEPRECATED_AUTH_COMPONENTS.md
 */
"use client";

import React from "react";
import { useToast } from "@workspace/ui/components/toast";
import { createClient } from "@/lib/supabase/client";
import {
  type AppRole,
  useTenantAccess,
  resolveGuardMessage,
} from "@workspace/ui/hooks";

interface ClientRoleGuardProps {
  subdomain: string;
  allowedRoles?: AppRole[];
  children: React.ReactNode;
  redirectToLogin?: boolean; // Default: false (show toast instead)
  fallbackMessage?: string;
}

export function ClientRoleGuard({
  subdomain,
  allowedRoles,
  children,
  redirectToLogin = false,
  fallbackMessage,
}: ClientRoleGuardProps) {
  const { addToast } = useToast();
  const access = useTenantAccess({
    subdomain,
    allowedRoles,
    redirectTo: redirectToLogin ? "/auth/login" : undefined,
    navigate: (path) => window.location.replace(path),
    showToast: false,
    messages: {
      no_session: "Please sign in to access this content",
      wrong_subdomain: "You don't have access to this organization",
      insufficient_role: (failure) =>
        fallbackMessage ||
        `This content requires ${
          failure.allowed?.join(" or ") ?? "additional"
        } permissions. Your current role: ${failure.actual ?? "unknown"}`,
      error: "Authentication check failed",
    },
    createClient,
    onDenied: (failure) => {
      if (redirectToLogin) return;

      switch (failure.reason) {
        case "no_session":
          addToast(
            resolveGuardMessage(
              failure,
              undefined,
              "Please sign in to access this content"
            ),
            "warning"
          );
          break;
        case "wrong_subdomain":
          addToast(
            resolveGuardMessage(
              failure,
              undefined,
              "You don't have access to this organization"
            ),
            "error"
          );
          break;
        case "insufficient_role":
          addToast(
            resolveGuardMessage(
              failure,
              undefined,
              fallbackMessage ||
                `This content requires ${
                  failure.allowed?.join(" or ") ?? "additional"
                } permissions.`
            ),
            "warning"
          );
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
          break;
      }
    },
  });

  if (access.state === "checking") {
    return <div className="opacity-50">{children}</div>;
  }

  if (access.state !== "allowed" && !redirectToLogin) {
    // Show disabled version of children or hide completely
    return <div className="opacity-30 pointer-events-none">{children}</div>;
  }

  if (access.state === "allowed") {
    return <>{children}</>;
  }

  // If redirectToLogin is true and not authorized, the redirect already happened
  return null;
}
