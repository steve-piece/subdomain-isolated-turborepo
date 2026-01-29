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
import { createClient } from "@workspace/supabase/client";
import { type AppRole, useTenantAccess } from "@workspace/ui/hooks";

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
    createClient: () => Promise.resolve(createClient()) as Promise<ReturnType<typeof createClient>>,
    // Removed onDenied callback to prevent toast spam on page load
    // This component is deprecated - use useTenantClaims() instead
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
