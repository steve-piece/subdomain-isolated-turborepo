// apps/protected/components/role-protected-action.tsx
/**
 * @deprecated This component is DEPRECATED as of October 2, 2025
 *
 * ⚠️ DO NOT USE - Use useTenantClaims() instead ⚠️
 *
 * MIGRATION: Use conditional rendering with useTenantClaims()
 * See: /apps/protected/components/shared/DEPRECATED_AUTH_COMPONENTS.md
 */
"use client";

import React from "react";
import { useToast } from "@workspace/ui/components/toast";
import { createClient } from "@/lib/supabase/client";
import {
  type AppRole,
  useTenantAccess,
  type GuardFailure,
  resolveGuardMessage,
  type GuardMessageOverrides,
} from "@workspace/ui/hooks";

interface RoleProtectedActionProps {
  subdomain: string;
  allowedRoles: AppRole[];
  children: React.ReactNode;
  fallbackMessage?: string;
  className?: string;
  messages?: GuardMessageOverrides;
}

export function RoleProtectedAction({
  subdomain,
  allowedRoles,
  children,
  fallbackMessage,
  className,
  messages,
}: RoleProtectedActionProps) {
  const { addToast } = useToast();

  // Create centralized messages object to be reused consistently
  const centralizedMessages = messages ?? {
    no_session: fallbackMessage || "Please sign in to access this content",
    wrong_subdomain:
      fallbackMessage || "You don't have access to this organization",
    insufficient_role: (failure) =>
      fallbackMessage ||
      `This action requires ${allowedRoles.join(
        " or "
      )} permissions. Your current role: ${failure.actual ?? "unknown"}`,
    error: fallbackMessage || "Authentication check failed",
  };

  const access = useTenantAccess({
    subdomain,
    allowedRoles,
    navigate: (path) => window.location.replace(path),
    showToast: false,
    messages: centralizedMessages,
    createClient,
    // Removed onDenied callback to prevent toast spam on page load
    // Toasts will only show on actual user interaction via handleClick
  });

  const handleClick = (e: React.MouseEvent) => {
    if (access.state !== "allowed") {
      e.preventDefault();
      e.stopPropagation();

      if (access.state === "denied") {
        const message = resolveGuardMessage(
          access.failure,
          centralizedMessages,
          fallbackMessage ||
            `This action requires ${allowedRoles.join(
              " or "
            )} permissions. Your current role: ${
              access.failure.reason === "insufficient_role"
                ? (access.failure.actual ?? "unknown")
                : "unknown"
            }`
        );
        addToast(message, "warning", 5000);
      }
      return;
    }
  };

  if (access.state === "checking") {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      className={className}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          // trigger click for keyboard users
          (e.currentTarget as HTMLDivElement).click();
        }
      }}
      aria-disabled={access.state !== "allowed" ? true : undefined}
    >
      {children}
    </div>
  );
}
