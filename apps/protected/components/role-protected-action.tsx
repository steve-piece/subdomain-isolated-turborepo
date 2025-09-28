// apps/protected/components/role-protected-action.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useToast } from "@workspace/ui/components/toast";
import { createClient } from "@/lib/supabase/client";

type AppRole = "owner" | "superadmin" | "admin" | "member" | "view-only";

interface RoleProtectedActionProps {
  subdomain: string;
  allowedRoles: AppRole[];
  children: React.ReactNode;
  fallbackMessage?: string;
  className?: string;
}

export function RoleProtectedAction({
  subdomain,
  allowedRoles,
  children,
  fallbackMessage,
  className,
}: RoleProtectedActionProps) {
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const supabase = createClient();
        const { data: claims, error } = await supabase.auth.getClaims();

        if (error || !claims) {
          setUserRole(null);
          setIsLoading(false);
          return;
        }

        // Verify user belongs to this subdomain
        if (claims.claims.subdomain !== subdomain) {
          setUserRole(null);
          setIsLoading(false);
          return;
        }

        const role = (claims.claims.user_role ?? "member") as AppRole;
        setUserRole(role);
        setIsLoading(false);
      } catch (error) {
        console.error("Role check error:", error);
        setUserRole(null);
        setIsLoading(false);
      }
    };

    checkUserRole();
  }, [subdomain]);

  const handleClick = (e: React.MouseEvent) => {
    if (!userRole || !allowedRoles.includes(userRole)) {
      e.preventDefault();
      e.stopPropagation();

      const message =
        fallbackMessage ||
        `This action requires ${allowedRoles.join(" or ")} permissions. Your current role: ${userRole || "unknown"}`;

      addToast(message, "warning", 5000);
      return;
    }
  };

  if (isLoading) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={className} onClick={handleClick}>
      {children}
    </div>
  );
}
