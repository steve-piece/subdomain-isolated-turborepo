// apps/protected/app/s/[subdomain]/layout.tsx
/**
 * Root layout for all subdomain routes
 * Validates that the organization exists before allowing access
 * Redirects to marketing site if organization doesn't exist
 */
import { createClient } from "@workspace/supabase/server";
import { redirect } from "next/navigation";
import * as Sentry from "@sentry/nextjs";

/**
 * Verify if subdomain exists (either as active tenant or active reservation)
 */
async function verifySubdomainExists(subdomain: string): Promise<boolean> {
  const supabase = await createClient();
  const normalizedSubdomain = subdomain.trim().toLowerCase();

  try {
    // First check if tenant exists using the tenants_public view (active organizations)
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants_public")
      .select("subdomain")
      .eq("subdomain", normalizedSubdomain)
      .maybeSingle();

    if (tenantError) {
      Sentry.logger.error("subdomain_tenant_check_error", {
        subdomain: normalizedSubdomain,
        error: tenantError.message,
      });
    }

    // If tenant exists, subdomain is valid
    if (tenant) {
      Sentry.logger.info("subdomain_tenant_found", {
        subdomain: normalizedSubdomain,
      });
      return true;
    }

    // If no tenant, check for active reservation
    const { data: reservation, error: reservationError } = await supabase
      .from("subdomain_reservations")
      .select("subdomain, expires_at")
      .eq("subdomain", normalizedSubdomain)
      .gt("expires_at", new Date().toISOString())
      .is("confirmed_at", null)
      .maybeSingle();

    if (reservationError) {
      Sentry.logger.error("subdomain_reservation_check_error", {
        subdomain: normalizedSubdomain,
        error: reservationError.message,
      });
    }

    // If reservation exists and is active, subdomain is valid (pending confirmation)
    if (reservation) {
      Sentry.logger.info("subdomain_reservation_found", {
        subdomain: normalizedSubdomain,
        expiresAt: reservation.expires_at,
      });
      return true;
    }

    // No tenant and no active reservation
    Sentry.logger.info("subdomain_not_found", {
      subdomain: normalizedSubdomain,
    });
    return false;
  } catch (error) {
    Sentry.logger.error("subdomain_verification_exception", {
      subdomain: normalizedSubdomain,
      error: error instanceof Error ? error.message : String(error),
    });
    // On error, return false to redirect to marketing site
    return false;
  }
}

export default async function SubdomainLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;

  // Verify subdomain exists (either as active organization or active reservation)
  const exists = await verifySubdomainExists(subdomain);

  if (!exists) {
    // Subdomain doesn't exist - redirect to marketing site
    const isDevelopment = process.env.NODE_ENV === "development";
    const marketingUrl = isDevelopment
      ? "http://localhost:3002"
      : `https://${process.env.NEXT_PUBLIC_MARKETING_DOMAIN || "bask-app.com"}`;

    Sentry.logger.info("subdomain_redirect_to_marketing", {
      subdomain,
      marketingUrl,
    });

    redirect(marketingUrl);
  }

  // Subdomain exists - allow access
  return <>{children}</>;
}
