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

export interface CreateOrganizationResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Create organization and tenant mapping after successful user signup
 */
export async function createOrganizationAfterSignup(
  userId: string,
  organizationName: string,
  subdomain: string,
  userEmail: string
): Promise<CreateOrganizationResponse> {
  try {
    const supabase = await createClient();

    // Create organization record
    // Note: owner_id will be set after user profile is created (since it references user_profiles.user_id)
    const { data: organization, error: orgError } = await supabase
      .from("organizations")
      .insert({
        company_name: organizationName,
        settings: {},
        metadata: {},
      })
      .select()
      .single();

    if (orgError) {
      console.error("Organization creation error:", orgError);
      return {
        success: false,
        error: `Failed to create organization: ${orgError.message}`,
      };
    }

    // Create tenant mapping (subdomain -> organization)
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .insert({
        subdomain: subdomain.toLowerCase(),
        org_id: organization.id,
        company_name: organizationName,
      })
      .select()
      .single();

    if (tenantError) {
      console.error("Tenant creation error:", tenantError);
      return {
        success: false,
        error: `Failed to create tenant mapping: ${tenantError.message}`,
      };
    }

    // Create user profile with new structure (direct org_id reference)
    const shortUserId = userId.toString().substring(0, 8); // First 8 chars as new primary key
    const { error: profileError } = await supabase
      .from("user_profiles")
      .insert({
        user_id: shortUserId,
        uid: userId, // Full UUID for auth.users reference
        org_id: organization.id, // Direct reference to organization
        role: "superadmin",
        email: userEmail,
      });

    if (profileError) {
      console.error("User profile creation error:", profileError);
      return {
        success: false,
        error: `Failed to create user profile: ${profileError.message}`,
      };
    }

    // Update organization.owner_id to reference the user's short ID
    const { error: ownerUpdateError } = await supabase
      .from("organizations")
      .update({ owner_id: shortUserId })
      .eq("id", organization.id);

    if (ownerUpdateError) {
      console.error("Owner ID update error:", ownerUpdateError);
      return {
        success: false,
        error: `Failed to set organization owner: ${ownerUpdateError.message}`,
      };
    }

    return {
      success: true,
      message: "Organization created successfully",
    };
  } catch (error) {
    console.error("Organization creation error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
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
    // Debug environment variables
    console.log("Search Debug:", {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY,
      urlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20) + "...",
      keyPrefix:
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY?.substring(
          0,
          20
        ) + "...",
      query: query,
    });

    const supabase = await createClient();

    console.log("About to query tenants_public with query:", query);

    // Use the secure public view that excludes org_id and other sensitive data
    const { data: tenants, error } = await supabase
      .from("tenants_public")
      .select("subdomain, name")
      .or(`subdomain.ilike.%${query}%,name.ilike.%${query}%`)
      .order("name")
      .limit(5);

    console.log("Query result:", {
      data: tenants,
      error,
      queryUsed: `subdomain.ilike.%${query}%,name.ilike.%${query}%`,
    });

    if (error) {
      console.error("Supabase error:", error);
      return {
        tenants: [],
        error: "Failed to search tenants",
      };
    }

    return {
      tenants: tenants || [],
    };
  } catch (error) {
    console.error("Search tenants error:", error);
    return {
      tenants: [],
      error: "Internal server error",
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
