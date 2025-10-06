// apps/protected/app/actions/favicon/generate.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { isValidSubdomain } from "@workspace/ui/lib/subdomains";

// Default logo URL - used when organization doesn't have a custom logo
const DEFAULT_LOGO_URL =
  process.env.NEXT_PUBLIC_DEFAULT_LOGO_URL || "TODO: INSERT_DEFAULT_LOGO_URL";

export interface FaviconResponse {
  success: boolean;
  message?: string;
  logoUrl?: string;
  fallbackSvg?: string;
}

/**
 * Get organization favicon/logo
 * Returns logo URL if available, otherwise generates an SVG fallback
 */
export async function getOrganizationFavicon(
  subdomain: string
): Promise<FaviconResponse> {
  try {
    // Validate subdomain
    if (!isValidSubdomain(subdomain)) {
      return {
        success: false,
        message: "Invalid subdomain",
      };
    }

    const supabase = await createClient();

    // Use dedicated RPC function for fetching organization logo
    // This function is optimized and designed for unauthenticated access
    const { data, error: rpcError } = await supabase.rpc(
      "get_org_logo_by_subdomain",
      {
        p_subdomain: subdomain,
      }
    );

    if (rpcError) {
      console.error("RPC error fetching logo:", rpcError);
      return {
        success: true,
        logoUrl: DEFAULT_LOGO_URL,
      };
    }

    // RPC returns an array, get first result
    const organization = data?.[0];

    // RPC function returns empty string if no logo, so check for both null and empty
    const logoUrl =
      organization?.logo_url && organization.logo_url.trim()
        ? organization.logo_url
        : DEFAULT_LOGO_URL;

    return {
      success: true,
      logoUrl,
    };
  } catch (error) {
    console.error("Get organization favicon error:", error);

    // Return default logo on error
    return {
      success: false,
      message: "Failed to fetch favicon",
      logoUrl: DEFAULT_LOGO_URL,
    };
  }
}
