"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { extractSubdomainFromHostname } from "@workspace/ui/lib/subdomains";

export function SessionEvaluator() {
  const [isEvaluating, setIsEvaluating] = useState(true);
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

          console.log(
            "SessionEvaluator: No subdomain detected, redirecting to marketing site"
          );
          window.location.href = marketingUrl;
          return;
        }

        // If there is a subdomain, this should have been handled by middleware
        // This is an edge case - redirect to root to trigger middleware
        console.warn(
          "SessionEvaluator running with subdomain - this should not happen"
        );
        router.replace("/");
      } catch (error) {
        console.error("Session evaluation error:", error);
        // On error, redirect to marketing for safety
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
    <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-background to-muted/30">
      <div className="flex flex-col items-center gap-6">
        <div className="text-6xl mb-2">🏢</div>
        <div className="relative">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent mb-2">
            Evaluating Access
          </h2>
          <p className="text-muted-foreground flex items-center justify-center">
            <span className="mr-2">🔍</span>
            Checking your session and determining the best route...
          </p>
        </div>
      </div>
    </div>
  );
}
