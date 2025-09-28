// apps/protected/components/client-role-guard.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useToast } from "@workspace/ui/components/toast";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type AppRole = "owner" | "superadmin" | "admin" | "member" | "view-only";

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
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { addToast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient();
        const { data: claims, error } = await supabase.auth.getClaims();

        if (error || !claims) {
          if (redirectToLogin) {
            router.replace("/auth/login?reason=no_session");
            return;
          }
          setIsAuthorized(false);
          setIsLoading(false);
          return;
        }

        // Verify user belongs to this subdomain
        if (claims.claims.subdomain !== subdomain) {
          if (redirectToLogin) {
            router.replace("/auth/login?error=unauthorized");
            return;
          }
          addToast("You don't have access to this organization", "error");
          setIsAuthorized(false);
          setIsLoading(false);
          return;
        }

        const role = (claims.claims.user_role ?? "member") as AppRole;

        // Check role permissions if allowedRoles is specified
        if (allowedRoles && allowedRoles.length > 0) {
          const hasPermission = allowedRoles.includes(role);
          setIsAuthorized(hasPermission);

          if (!hasPermission && !redirectToLogin) {
            const message =
              fallbackMessage ||
              `This content requires ${allowedRoles.join(" or ")} permissions. Your current role: ${role}`;
            addToast(message, "warning", 5000);
          }
        } else {
          // No role restriction, just need valid session for this subdomain
          setIsAuthorized(true);
        }

        setIsLoading(false);
      } catch (error) {
        console.error("Client role guard error:", error);
        if (redirectToLogin) {
          router.replace("/auth/login?error=auth_check_failed");
        } else {
          addToast("Authentication check failed", "error");
          setIsAuthorized(false);
        }
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [
    subdomain,
    allowedRoles,
    redirectToLogin,
    fallbackMessage,
    addToast,
    router,
  ]);

  if (isLoading) {
    return <div className="opacity-50">{children}</div>;
  }

  if (isAuthorized === false && !redirectToLogin) {
    // Show disabled version of children or hide completely
    return <div className="opacity-30 pointer-events-none">{children}</div>;
  }

  if (isAuthorized) {
    return <>{children}</>;
  }

  // If redirectToLogin is true and not authorized, the redirect already happened
  return null;
}
