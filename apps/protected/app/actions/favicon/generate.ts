// apps/protected/app/actions/favicon/generate.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { isValidSubdomain } from "@workspace/ui/lib/subdomains";

// Default logo URL - used when organization doesn't have a custom logo
const DEFAULT_LOGO_URL =
  process.env.NEXT_PUBLIC_DEFAULT_LOGO_URL ||
  "https://qnbqrlpvokzgtfevnuzv.supabase.co/storage/v1/object/public/organization-logos/defaults/logo.png";

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

    // Get organization logo from database (no auth required for logo lookup)
    const { data: organization, error } = await supabase
      .from("organizations")
      .select("logo_url")
      .eq("subdomain", subdomain)
      .single();

    if (error) {
      // If organization not found, return default logo
      return {
        success: true,
        logoUrl: DEFAULT_LOGO_URL,
      };
    }

    // If organization has a logo, return the URL, otherwise use default
    return {
      success: true,
      logoUrl: organization?.logo_url || DEFAULT_LOGO_URL,
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
