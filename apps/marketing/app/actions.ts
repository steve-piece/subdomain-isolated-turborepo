"use server";
import { createClient } from "@/lib/supabase/server";

export interface TenantSearchResult {
  subdomain: string;
  name: string;
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
    console.log("=== SEARCH TENANTS DEBUG START ===");

    // Debug environment variables
    console.log("Environment Check:", {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY,
      urlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + "...",
      keyPrefix:
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY?.substring(
          0,
          30
        ) + "...",
      query: query,
    });

    const supabase = await createClient();

    // Check current session
    const { data: session, error: sessionError } =
      await supabase.auth.getSession();
    console.log("Session status:", {
      hasSession: !!session?.session,
      sessionError: sessionError?.message,
      userId: session?.session?.user?.id,
    });

    console.log("Attempting to query tenants_public...");

    // First, try a simple count query to test basic access
    const { count: tenantCount, error: countError } = await supabase
      .from("tenants_public")
      .select("*", { count: "exact", head: true });

    console.log("Access test result:", {
      count: tenantCount,
      countError: countError?.message,
    });

    if (countError) {
      console.error("CRITICAL: Cannot access tenants_public view:", {
        code: countError.code,
        message: countError.message,
        details: countError.details,
        hint: countError.hint,
        fullError: countError,
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

    const { data: tenants, error } = await supabase
      .from("tenants_public")
      .select("subdomain, company_name")
      .or(searchCondition)
      .order("company_name")
      .limit(5);

    console.log("Search query result:", {
      resultCount: tenants?.length || 0,
      firstResult: tenants?.[0],
      error: error
        ? {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
          }
        : null,
      queryUsed: searchCondition,
    });

    console.log("=== SEARCH TENANTS DEBUG END ===");

    if (error) {
      console.error("Supabase search error:", {
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
    }));

    return {
      tenants: mappedTenants,
    };
  } catch (error) {
    console.error("Search tenants catch error:", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
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
    const supabase = await createClient();

    // Check if tenant exists with exact subdomain match using secure view
    const normalizedSubdomain = subdomain.trim().toLowerCase();

    const { data: tenant, error } = await supabase
      .from("tenants_public")
      .select("subdomain, company_name")
      .eq("subdomain", normalizedSubdomain)
      .maybeSingle();

    if (error) {
      console.error("Supabase error:", error);
      return {
        exists: false,
        tenant: null,
        error: "Failed to verify tenant",
      };
    }

    // maybeSingle returns null when no row is found, which is the expected behavior
    if (!tenant) {
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
      },
    };
  } catch (error) {
    console.error("Verify tenant error:", error);
    return {
      exists: false,
      tenant: null,
      error: "Internal server error",
    };
  }
}
