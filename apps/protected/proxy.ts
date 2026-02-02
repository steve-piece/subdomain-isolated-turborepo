// apps/protected/middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { extractSubdomainFromHostname } from "@workspace/ui/lib/subdomains";
import * as Sentry from "@sentry/nextjs";

export async function proxy(request: NextRequest) {
  Sentry.logger.debug("protected_middleware_request", {
    url: request.url,
    hostname: request.headers.get("host"),
  });
  const url = request.nextUrl.clone();
  const hostname = request.headers.get("host");

  // Extract subdomain from hostname using utility function
  const subdomain = extractSubdomainFromHostname(hostname || "");
  Sentry.logger.debug("protected_middleware_subdomain", {
    subdomain,
  });

  // If accessing via subdomain, rewrite to subdomain route
  if (subdomain) {
    // Only rewrite if not already in the /s/ structure and not an API/static route
    if (
      !url.pathname.startsWith("/s/") &&
      !url.pathname.startsWith("/api/") &&
      !url.pathname.startsWith("/_next/")
    ) {
      // Create internal rewrite URL
      const rewriteUrl = url.clone();
      rewriteUrl.pathname = `/s/${subdomain}${url.pathname}`;
      Sentry.logger.info("protected_middleware_rewrite", {
        from: url.pathname,
        to: rewriteUrl.pathname,
      });
      // This creates an internal rewrite that doesn't change the URL the user sees
      return NextResponse.rewrite(rewriteUrl);
    }

    // If URL already contains /s/subdomain, prevent double subdomain by redirecting to clean URL
    // BUT: Allow Next.js special routes (opengraph-image, etc.) to pass through
    if (url.pathname.startsWith(`/s/${subdomain}`)) {
      const remainingPath = url.pathname.replace(`/s/${subdomain}`, "");
      const isSpecialRoute = remainingPath.match(
        /^\/(apple-icon|opengraph-image|twitter-image)$/,
      );

      if (!isSpecialRoute) {
        const cleanPath = remainingPath || "/";
        const redirectUrl = url.clone();
        redirectUrl.pathname = cleanPath;
        Sentry.logger.info("protected_middleware_cleanup_redirect", {
          to: redirectUrl.pathname,
        });
        return NextResponse.redirect(redirectUrl);
      }
    }
  }

  // If no subdomain, redirect to marketing site
  if (!subdomain) {
    const isDevelopment = process.env.NODE_ENV === "development";
    const marketingDomain = process.env.NEXT_PUBLIC_MARKETING_DOMAIN || "localhost:3002";
    const marketingUrl = isDevelopment
      ? "http://localhost:3002"
      : `https://${marketingDomain}`;
    Sentry.logger.info("protected_middleware_marketing_redirect", {
      marketingUrl,
    });

    try {
      return NextResponse.redirect(new URL(marketingUrl));
    } catch {
      // Fallback if URL is invalid
      return NextResponse.redirect(new URL("https://localhost:3002"));
    }
  }

  // Pass through without session update to keep middleware Edge-compatible
  Sentry.logger.debug("protected_middleware_next", {
    url: request.url,
  });
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
