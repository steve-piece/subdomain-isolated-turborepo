// apps/protected/components/role-protected-action.tsx
// Wraps interactive regions to enforce role-based access with client-side claims.
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
  const access = useTenantAccess({
    subdomain,
    allowedRoles,
    navigate: (path) => window.location.replace(path),
    showToast: false,
    messages: messages ?? {
      no_session: fallbackMessage || "Please sign in to access this content",
      wrong_subdomain:
        fallbackMessage || "You don't have access to this organization",
      insufficient_role: (failure) =>
        fallbackMessage ||
        `This action requires ${allowedRoles.join(
          " or "
        )} permissions. Your current role: ${failure.actual ?? "unknown"}`,
      error: fallbackMessage || "Authentication check failed",
    },
    createClient,
    onDenied: (failure: GuardFailure) => {
      if (
        failure.reason === "insufficient_role" ||
        failure.reason === "wrong_subdomain"
      ) {
        const message = resolveGuardMessage(
          failure,
          undefined,
          fallbackMessage ||
            `This action requires ${allowedRoles.join(
              " or "
            )} permissions. Your current role: ${
              failure.reason === "insufficient_role"
                ? (failure.actual ?? "unknown")
                : "unknown"
            }`
        );
        addToast(message, "warning", 5000);
      }
    },
  });

  const handleClick = (e: React.MouseEvent) => {
    if (access.state !== "allowed") {
      e.preventDefault();
      e.stopPropagation();

      let currentRole = "unknown";
      if (
        access.state === "denied" &&
        access.failure.reason === "insufficient_role"
      ) {
        currentRole = access.failure.actual ?? "unknown";
      }

      const message =
        fallbackMessage ||
        `This action requires ${allowedRoles.join(
          " or "
        )} permissions. Your current role: ${currentRole}`;

      addToast(message, "warning", 5000);
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
