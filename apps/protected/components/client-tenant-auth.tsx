// apps/protected/components/client-tenant-auth.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useToast } from "@workspace/ui/components/toast";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type AppRole = "owner" | "superadmin" | "admin" | "member" | "view-only";

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
  const [claims, setClaims] = useState<TenantClaims | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const { addToast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient();
        const { data: claimsData, error } = await supabase.auth.getClaims();

        if (error || !claimsData) {
          if (redirectToLogin) {
            router.replace("/auth/login?reason=no_session");
            return;
          }

          if (showAccessDeniedToast) {
            addToast("Please sign in to access this content", "warning");
          }
          setHasAccess(false);
          setIsLoading(false);
          return;
        }

        // Verify user belongs to this subdomain
        if (claimsData.claims.subdomain !== subdomain) {
          if (redirectToLogin) {
            router.replace("/auth/login?error=unauthorized");
            return;
          }

          if (showAccessDeniedToast) {
            addToast("You don't have access to this organization", "error");
          }
          setHasAccess(false);
          setIsLoading(false);
          return;
        }

        // Check role permissions if specified
        if (allowedRoles && allowedRoles.length > 0) {
          const role = (claimsData.claims.user_role ?? "member") as AppRole;
          const hasPermission = allowedRoles.includes(role);

          if (!hasPermission) {
            if (redirectToLogin) {
              router.replace("/dashboard?error=insufficient_permissions");
              return;
            }

            if (showAccessDeniedToast) {
              const message = `This content requires ${allowedRoles.join(" or ")} permissions. Your current role: ${role}`;
              addToast(message, "warning", 5000);
            }
            setHasAccess(false);
            setIsLoading(false);
            return;
          }
        }

        setClaims(claimsData as unknown as TenantClaims);
        setHasAccess(true);
        setIsLoading(false);
      } catch (error) {
        console.error("Client tenant auth error:", error);
        if (redirectToLogin) {
          router.replace("/auth/login?error=auth_check_failed");
        } else if (showAccessDeniedToast) {
          addToast("Authentication check failed", "error");
        }
        setHasAccess(false);
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [
    subdomain,
    allowedRoles,
    redirectToLogin,
    showAccessDeniedToast,
    addToast,
    router,
  ]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!hasAccess || !claims) {
    return (
      <div className="flex items-center justify-center min-h-32 text-muted-foreground">
        <p>Access denied</p>
      </div>
    );
  }

  return <>{children(claims)}</>;
}
