// apps/protected/components/session-evaluator.tsx
// Client fallback that routes users to marketing or tenant root when middleware misses.
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { extractSubdomainFromHostname } from "@workspace/ui/lib/subdomains";
import * as Sentry from "@sentry/nextjs";
import { Building2, Search } from "lucide-react";

export function SessionEvaluator() {
  const router = useRouter();

  useEffect(() => {
    const evaluateAndRedirect = () => {
      try {
        // Extract subdomain from current hostname
        const hostname = window.location.hostname;
        const subdomain = extractSubdomainFromHostname(hostname);

        // If no subdomain, redirect to marketing site
        // Note: This should normally be handled by middleware, but kept as fallback
        if (!subdomain) {
          const isDevelopment = process.env.NODE_ENV === "development";
          const marketingUrl = isDevelopment
            ? "http://localhost:3002"
            : `https://${process.env.NEXT_PUBLIC_MARKETING_DOMAIN}`;

          Sentry.logger.warn("session_evaluator_no_subdomain", {
            marketingUrl,
          });
          window.location.href = marketingUrl;
          return;
        }

        // If there is a subdomain, this should have been handled by middleware
        // This is an edge case - redirect to root to trigger middleware
        Sentry.logger.warn("session_evaluator_with_subdomain", {
          subdomain,
        });
        router.replace("/");
      } catch (error) {
        Sentry.captureException(error);
        const isDevelopment = process.env.NODE_ENV === "development";
        const marketingUrl = isDevelopment
          ? "http://localhost:3002"
          : `https://${process.env.NEXT_PUBLIC_MARKETING_DOMAIN}`;

        window.location.href = marketingUrl;
      }
    };

    evaluateAndRedirect();
  }, [router]);

  // Loading UI while evaluating route
  return (
    <div className="flex h-screen w-full items-center justify-center bg-linear-to-br from-background to-muted/30">
      <div className="flex flex-col items-center gap-6">
        <Building2 className="h-16 w-16 mb-2 text-primary" />
        <div className="relative">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-transparent mb-2">
            Evaluating Access
          </h2>
          <p className="text-muted-foreground flex items-center justify-center">
            <Search className="h-4 w-4 mr-2" />
            Checking your session and determining the best route...
          </p>
        </div>
      </div>
    </div>
  );
}
