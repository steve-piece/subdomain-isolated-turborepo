// apps/protected/components/subdomain-auth-checker.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { OrganizationDashboard } from "../components/organization-dashboard";
import * as Sentry from "@sentry/nextjs";

interface SubdomainAuthCheckerProps {
  subdomain: string;
}

export function SubdomainAuthChecker({ subdomain }: SubdomainAuthCheckerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState<string>(subdomain);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();

      // Get claims for fast, local authentication + tenant verification
      const { data: claimsData, error: claimsError } =
        await supabase.auth.getClaims();

      if (claimsError || !claimsData) {
        // No valid session - redirect to login
        router.replace("/auth/login?reason=no_session");
        return;
      }

      // Verify user belongs to this specific subdomain/organization
      const claimSubdomain = (
        claimsData.claims?.subdomain as string | undefined
      )?.toLowerCase();
      if (claimSubdomain !== subdomain.toLowerCase()) {
        router.replace("/auth/login?error=unauthorized");
        return;
      }

      // User is authenticated and authorized for this tenant
      setIsAuthenticated(true);
      setUserEmail((claimsData.claims?.email as string | undefined) || null);
      setOrganizationName(
        (claimsData.claims?.company_name as string | undefined) || subdomain
      );
      setIsLoading(false);
    };

    checkAuth().catch((error) => {
      Sentry.captureException(error);
      Sentry.logger.error("subdomain_auth_check_error", {
        message: error instanceof Error ? error.message : "Unknown error",
        subdomain,
      });
      router.replace("/auth/login?error=auth_check_failed");
    });
  }, [subdomain, router]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-background to-muted/30">
        <div className="flex flex-col items-center gap-6">
          <div className="text-6xl mb-2">🏢</div>
          <div className="relative">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
          <div className="text-center max-w-md">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent mb-2">
              Loading {subdomain}
            </h2>
            <p className="text-muted-foreground flex items-center justify-center">
              <span className="mr-2">🔍</span>
              Verifying your access permissions...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If authenticated, show the dashboard
  if (isAuthenticated && userEmail) {
    return (
      <OrganizationDashboard
        organizationName={organizationName}
        subdomain={subdomain}
        userEmail={userEmail}
      />
    );
  }

  // Fallback - should not reach here due to redirects above
  return null;
}
