// apps/marketing/app/actions.ts
"use server";
import { createClient } from "@workspace/supabase/server";
import * as Sentry from "@sentry/nextjs";

export interface TenantSearchResult {
  subdomain: string;
  name: string;
  logo_url?: string | null;
}

export interface SearchTenantsResponse {
  tenants: TenantSearchResult[];
  error?: string;
}

export interface VerifyTenantResponse {
  exists: boolean;
  tenant: TenantSearchResult | null;
  error?: string;
}

/**
 * Search for tenants by name or subdomain
 */
export async function searchTenants(
  query: string
): Promise<SearchTenantsResponse> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery || trimmedQuery.length < 2) {
    return { tenants: [] };
  }

  try {
    Sentry.logger.info("tenant_search_started", {
      queryLength: trimmedQuery.length,
    });

    Sentry.logger.debug("tenant_search_env_vars", {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
      urlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30),
      keyPrefix:
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY?.substring(
          0,
          30
        ),
    });

    const supabase = await createClient();

    // Check current session
    const { data: session, error: sessionError } =
      await supabase.auth.getSession();
    Sentry.logger.debug("tenant_search_session_status", {
      hasSession: !!session?.session,
      sessionError: sessionError?.message,
      userId: session?.session?.user?.id,
    });

    Sentry.logger.info("tenant_search_query_attempt", {
      table: "tenants_public",
    });

    // First, try a simple count query to test basic access
    const { count: tenantCount, error: countError } = await supabase
      .from("tenants_public")
      .select("*", { count: "exact", head: true });

    Sentry.logger.debug("tenant_search_access_test_result", {
      count: tenantCount,
      countError: countError?.message,
    });

    if (countError) {
      Sentry.logger.error("tenant_search_access_denied", {
        code: countError.code,
        message: countError.message,
        details: countError.details,
        hint: countError.hint,
      });

      // Provide more specific error message
      const errorMsg =
        countError.message ||
        countError.details ||
        countError.hint ||
        `Database error (code: ${countError.code})` ||
        "Unknown database access error";

      return {
        tenants: [],
        error: `Database access error: ${errorMsg}`,
      };
    }

    // Now try the actual search query
    const escapedQuery = trimmedQuery.replace(/[%_]/g, "\\$&");
    const wildcardQuery = `%${escapedQuery}%`;
    const searchCondition = `subdomain.ilike.${wildcardQuery},company_name.ilike.${wildcardQuery}`;

    Sentry.logger.debug("tenant_search_query", {
      query: searchCondition,
    });

    const { data: tenants, error } = await supabase
      .from("tenants_public")
      .select("subdomain, company_name, logo_url")
      .or(searchCondition)
      .order("company_name")
      .limit(5);

    Sentry.logger.info("tenant_search_results", {
      resultCount: tenants?.length || 0,
      firstResult: tenants?.[0]?.subdomain,
    });

    if (error) {
      Sentry.logger.error("tenant_search_error", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      return {
        tenants: [],
        error: `Search failed: ${error.message}`,
      };
    }

    // Map company_name to name for client consumption
    const mappedTenants = (tenants || []).map((tenant) => ({
      subdomain: tenant.subdomain,
      name: tenant.company_name,
      logo_url: tenant.logo_url,
    }));

    return {
      tenants: mappedTenants,
    };
  } catch (error) {
    Sentry.logger.error("tenant_search_exception", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      queryLength: trimmedQuery.length,
    });
    return {
      tenants: [],
      error: error instanceof Error ? error.message : "Internal server error",
    };
  }
}

/**
 * Verify if a tenant exists by exact subdomain match
 */
export async function verifyTenant(
  subdomain: string
): Promise<VerifyTenantResponse> {
  if (!subdomain || typeof subdomain !== "string") {
    return {
      exists: false,
      tenant: null,
      error: "Subdomain is required",
    };
  }

  try {
    Sentry.logger.info("tenant_verify_started", {
      subdomain,
    });
    const supabase = await createClient();

    // Check if tenant exists with exact subdomain match using secure view
    const normalizedSubdomain = subdomain.trim().toLowerCase();

    const { data: tenant, error } = await supabase
      .from("tenants_public")
      .select("subdomain, company_name, logo_url")
      .eq("subdomain", normalizedSubdomain)
      .maybeSingle();

    if (error) {
      Sentry.logger.error("tenant_verify_error", {
        message: error.message,
        subdomain,
      });
      return {
        exists: false,
        tenant: null,
        error: "Failed to verify tenant",
      };
    }

    // maybeSingle returns null when no row is found, which is the expected behavior
    if (!tenant) {
      // Also check if there's an active reservation for this subdomain
      const { data: reservation, error: reservationError } = await supabase
        .from("subdomain_reservations")
        .select("subdomain")
        .eq("subdomain", normalizedSubdomain)
        .gt("expires_at", new Date().toISOString())
        .is("confirmed_at", null)
        .maybeSingle();

      if (reservationError) {
        Sentry.logger.error("reservation_check_error", {
          message: reservationError.message,
          subdomain,
        });
        // Don't fail the request if reservation check fails
        // Just assume no reservation exists
      }

      if (reservation) {
        // Subdomain is reserved but not yet confirmed
        return {
          exists: true,
          tenant: null,
        };
      }

      return {
        exists: false,
        tenant: null,
      };
    }

    return {
      exists: true,
      tenant: {
        subdomain: tenant.subdomain,
        name: tenant.company_name,
        logo_url: tenant.logo_url,
      },
    };
  } catch (error) {
    Sentry.logger.error("tenant_verify_exception", {
      message: error instanceof Error ? error.message : String(error),
      subdomain,
    });
    return {
      exists: false,
      tenant: null,
      error: "Internal server error",
    };
  }
}
