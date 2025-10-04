// packages/ui/src/hooks/use-tenant-access.ts
/**
 * @deprecated This hook is DEPRECATED as of October 2, 2025
 *
 * ⚠️ DO NOT USE IN NEW CODE ⚠️
 *
 * This hook made duplicate auth API calls on every render, causing:
 * - 70+ unnecessary API calls per page load
 * - Performance degradation
 * - Excessive network traffic
 *
 * MIGRATION GUIDE:
 * ================
 *
 * OLD PATTERN (❌ Don't use):
 * ```tsx
 * const access = useTenantAccess({
 *   subdomain,
 *   allowedRoles: ["owner", "admin"],
 *   createClient,
 * });
 *
 * if (access.state === "allowed") {
 *   return <div>Content</div>;
 * }
 * ```
 *
 * NEW PATTERN (✅ Use this):
 * ```tsx
 * import { useTenantClaims } from "@/lib/contexts/tenant-claims-context";
 *
 * export function MyComponent() {
 *   const claims = useTenantClaims(); // No API calls!
 *
 *   // Role check
 *   if (!["owner", "admin"].includes(claims.user_role)) {
 *     return <div>Access denied</div>;
 *   }
 *
 *   return <div>Content for {claims.full_name}</div>;
 * }
 * ```
 *
 * WHY MIGRATE:
 * - ✅ Zero API calls (reads from context)
 * - ✅ Instant access to user data
 * - ✅ Better performance
 * - ✅ Simpler code
 * - ✅ Type-safe with strict role typing
 *
 * See: /docs/AUTH_REFACTOR_PATTERN.md for full guide
 *
 * This hook will be REMOVED in a future version.
 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as Sentry from "@sentry/nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";

// Supported application roles. Exported so callers can type their allowlists.
export type AppRole = "owner" | "superadmin" | "admin" | "member" | "view-only";

// Minimal claims shape exposed to consumers when the guard passes.
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

// Enumerates failure modes so downstream UI can tailor messaging.
export type GuardFailure =
  | { reason: "no_session" }
  | { reason: "wrong_subdomain"; expected: string; actual?: string }
  | { reason: "insufficient_role"; allowed: AppRole[]; actual?: string }
  | { reason: "error"; message?: string };

type GuardFailureByReason<R extends GuardFailure["reason"]> = Extract<
  GuardFailure,
  { reason: R }
>;

export type GuardMessageOverrides = Partial<{
  no_session:
    | string
    | ((failure: GuardFailureByReason<"no_session">) => string);
  wrong_subdomain:
    | string
    | ((failure: GuardFailureByReason<"wrong_subdomain">) => string);
  insufficient_role:
    | string
    | ((failure: GuardFailureByReason<"insufficient_role">) => string);
  error: string | ((failure: GuardFailureByReason<"error">) => string);
}>;

export function resolveGuardMessage(
  failure: GuardFailure,
  overrides: GuardMessageOverrides | undefined,
  defaultMessage: string,
): string {
  switch (failure.reason) {
    case "no_session": {
      const override = overrides?.no_session;
      if (!override) return defaultMessage;
      return typeof override === "function" ? override(failure) : override;
    }
    case "wrong_subdomain": {
      const override = overrides?.wrong_subdomain;
      if (!override) return defaultMessage;
      return typeof override === "function" ? override(failure) : override;
    }
    case "insufficient_role": {
      const override = overrides?.insufficient_role;
      if (!override) return defaultMessage;
      return typeof override === "function" ? override(failure) : override;
    }
    case "error": {
      const override = overrides?.error;
      if (!override) return defaultMessage;
      return typeof override === "function" ? override(failure) : override;
    }
    default:
      return defaultMessage;
  }
}

// Options accepted by the guard hook. Callers supply the Supabase client factory,
// optional role allowlist, redirect behavior, toast helper, etc.
type GuardOptions = {
  subdomain: string;
  allowedRoles?: AppRole[];
  redirectTo?: string;
  navigate?: (path: string | URL) => void;
  showToast?: boolean;
  onDenied?: (failure: GuardFailure) => void;
  messages?: GuardMessageOverrides;
  toast?: (
    message: string,
    variant?: "warning" | "error",
    duration?: number,
  ) => void;
  createClient: () => SupabaseClient | Promise<SupabaseClient>;
};

// Hook return shape. Exposes status + claims/failure metadata.
type GuardStatus =
  | { state: "checking" }
  | { state: "allowed"; claims: TenantClaims }
  | { state: "denied"; failure: GuardFailure };

// Default toast handler used when callers don't pass their own.
const defaultToast = () => undefined;

// Main guard hook. Validates the active Supabase session against the supplied tenant context.
export function useTenantAccess({
  subdomain,
  allowedRoles,
  redirectTo,
  navigate,
  showToast = true,
  onDenied,
  messages,
  toast = defaultToast,
  createClient,
}: GuardOptions): GuardStatus {
  // `status` tracks the guard state for consumers.
  const [status, setStatus] = useState<GuardStatus>({ state: "checking" });
  // Prevent duplicate redirects when failures trigger multiple effects.
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Track mounting status to avoid setting state on unmounted components.
    let isMounted = true;

    async function evaluate() {
      try {
        // `createClient` is supplied by the caller (app-specific Supabase client factory).
        const supabase = await Promise.resolve(createClient());
        const { data: claims, error } = await supabase.auth.getClaims();

        if (!isMounted) return;

        // No session -> fail early.
        if (error || !claims) {
          handleFailure({ reason: "no_session" });
          return;
        }

        // Subdomain mismatch -> deny access.
        const claimSubdomain = claims.claims.subdomain;
        if (claimSubdomain !== subdomain) {
          handleFailure({
            reason: "wrong_subdomain",
            expected: subdomain,
            actual: claimSubdomain,
          });
          return;
        }

        // Role allowlist enforcement if provided.
        const role = (claims.claims.user_role ?? "member") as AppRole;
        if (
          allowedRoles &&
          allowedRoles.length > 0 &&
          !allowedRoles.includes(role)
        ) {
          handleFailure({
            reason: "insufficient_role",
            allowed: allowedRoles,
            actual: role,
          });
          return;
        }

        // Success path: surface claims to the caller.
        setStatus({
          state: "allowed",
          claims: claims as unknown as TenantClaims,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        handleFailure({ reason: "error", message });
      }
    }

    function handleFailure(failure: GuardFailure) {
      setStatus({ state: "denied", failure });

      // Auto-toast with configurable messaging when enabled.
      if (showToast) {
        switch (failure.reason) {
          case "no_session":
            toast(
              resolveGuardMessage(
                failure,
                messages,
                "Please sign in to access this content",
              ),
              "warning",
              5000,
            );
            break;
          case "wrong_subdomain":
            toast(
              resolveGuardMessage(
                failure,
                messages,
                "You don't have access to this organization",
              ),
              "error",
              5000,
            );
            break;
          case "insufficient_role":
            toast(
              resolveGuardMessage(
                failure,
                messages,
                "You don't have permission to perform this action",
              ),
              "warning",
              5000,
            );
            break;
          case "error":
            toast(
              resolveGuardMessage(
                failure,
                messages,
                "Authentication check failed",
              ),
              "error",
              5000,
            );
            break;
        }
      }

      // Optional redirect: either use caller-provided navigate or fallback to window.location.
      if (redirectTo && !hasRedirected.current) {
        hasRedirected.current = true;
        if (navigate) {
          navigate(redirectTo);
        } else if (typeof window !== "undefined") {
          window.location.href = redirectTo;
        }
      }

      // Record denial so we can spot patterns in Sentry.
      Sentry.captureMessage("tenant_guard_denied", {
        level: "warning",
        extra: {
          failure,
          subdomain,
          allowedRoles,
          messages,
        },
      });

      // Allow caller to run custom UI/analytics.
      onDenied?.(failure);
    }

    evaluate();

    return () => {
      isMounted = false;
    };
  }, [
    subdomain,
    allowedRoles,
    redirectTo,
    showToast,
    onDenied,
    messages,
    toast,
    navigate,
    createClient,
  ]);

  // Memoize so callbacks don't rerender based on object identity.
  return useMemo(() => status, [status]);
}
