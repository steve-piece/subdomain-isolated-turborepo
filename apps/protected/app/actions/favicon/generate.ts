// apps/protected/app/actions/favicon/generate.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { isValidSubdomain } from "@workspace/ui/lib/subdomains";

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
      // If organization not found, return fallback
      const firstLetter = subdomain.charAt(0).toUpperCase();
      const fallbackSvg = generateFallbackSvg(firstLetter);

      return {
        success: true,
        fallbackSvg,
      };
    }

    // If organization has a logo, return the URL
    if (organization?.logo_url) {
      return {
        success: true,
        logoUrl: organization.logo_url,
      };
    }

    // Generate fallback SVG with first letter of subdomain
    const firstLetter = subdomain.charAt(0).toUpperCase();
    const fallbackSvg = generateFallbackSvg(firstLetter);

    return {
      success: true,
      fallbackSvg,
    };
  } catch (error) {
    console.error("Get organization favicon error:", error);

    // Return generic fallback on error
    const fallbackSvg = generateFallbackSvg("?");

    return {
      success: false,
      message: "Failed to fetch favicon",
      fallbackSvg,
    };
  }
}

/**
 * Generate an SVG favicon with a letter
 */
function generateFallbackSvg(letter: string): string {
  return `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <rect width="32" height="32" rx="6" fill="url(#gradient)"/>
  <defs>
    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#8b5cf6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#a855f7;stop-opacity:1" />
    </linearGradient>
  </defs>
  <text 
    x="50%" 
    y="50%" 
    dominant-baseline="central" 
    text-anchor="middle" 
    font-family="system-ui, -apple-system, sans-serif" 
    font-size="18" 
    font-weight="600" 
    fill="white"
  >${letter}</text>
</svg>`;
}
