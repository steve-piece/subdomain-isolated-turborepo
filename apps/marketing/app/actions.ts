"use server";

import { z } from "zod";
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

export interface CreateOrganizationResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Create organization using RPC function (requires authenticated session)
 */
const createOrgInputSchema = z
  .object({
    companyName: z
      .string()
      .min(2, "Organization name must be at least 2 characters"),
    subdomain: z
      .string()
      .min(3)
      .max(63)
      .regex(
        /^[a-z0-9-]+$/,
        "Subdomain must contain only lowercase letters, numbers, or hyphens"
      ),
  })
  .strict();

export async function createOrganizationRpc(input: {
  companyName: string;
  subdomain: string;
}): Promise<CreateOrganizationResponse> {
  try {
    const parseResult = createOrgInputSchema.safeParse(input);
    if (!parseResult.success) {
      return {
        success: false,
        error: parseResult.error.errors[0]?.message || "Invalid input",
      };
    }

    const supabase = await createClient();

    const { data: claims, error: claimsError } =
      await supabase.auth.getClaims();

    if (claimsError || !claims) {
      return {
        success: false,
        error: "Authentication required",
      };
    }

    if (claims.claims.email_confirmed !== true) {
      return {
        success: false,
        error: "Please confirm your email before creating an organization",
      };
    }

    const { companyName, subdomain } = parseResult.data;

    const { error } = await supabase.rpc("create_org_for_current_user", {
      p_company_name: companyName,
      p_subdomain: subdomain,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, message: "Organization created successfully" };
  } catch (e) {
    console.error("createOrganizationRpc error", e);
    return {
      success: false,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

/**
 * Search for tenants by name or subdomain
 */
export async function searchTenants(
  query: string
): Promise<SearchTenantsResponse> {
  if (!query || query.length < 2) {
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
    const { data: tenants, error } = await supabase
      .from("tenants_public")
      .select("subdomain, company_name")
      .or(`subdomain.ilike.%${query}%,company_name.ilike.%${query}%`)
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
      queryUsed: `subdomain.ilike.%${query}%,company_name.ilike.%${query}%`,
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
    const { data: tenant, error } = await supabase
      .from("tenants_public")
      .select("subdomain, company_name")
      .eq("subdomain", subdomain.toLowerCase().trim())
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned - tenant doesn't exist
        return {
          exists: false,
          tenant: null,
        };
      }

      console.error("Supabase error:", error);
      return {
        exists: false,
        tenant: null,
        error: "Failed to verify tenant",
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
