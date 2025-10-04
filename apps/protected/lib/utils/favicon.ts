// apps/protected/lib/utils/favicon.ts
import { createClient } from "@/lib/supabase/server";

/**
 * Generate an SVG favicon data URI with a letter
 */
function generateFaviconSvgDataUri(letter: string): string {
  const svg = `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
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
  // Encode SVG as data URI
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Get the favicon URL for an organization
 * Returns organization logo if available, otherwise returns generated SVG data URI
 */
export async function getOrganizationFavicon(
  subdomain: string,
): Promise<string> {
  try {
    const supabase = await createClient();
    const { data: organization } = await supabase
      .from("organizations")
      .select("logo_url")
      .eq("subdomain", subdomain)
      .single();

    // If organization has a logo, use it as favicon
    if (organization?.logo_url) {
      return organization.logo_url;
    }

    // Generate SVG favicon with first letter of subdomain
    const firstLetter = subdomain.charAt(0).toUpperCase();
    return generateFaviconSvgDataUri(firstLetter);
  } catch (error) {
    console.error("Error getting organization favicon:", error);
    // Return default favicon with "?" on error
    return generateFaviconSvgDataUri("?");
  }
}

/**
 * Get organization metadata including logo for OpenGraph
 */
export async function getOrganizationMetadata(subdomain: string) {
  try {
    const supabase = await createClient();
    const { data: organization } = await supabase
      .from("organizations")
      .select("company_name, description, logo_url")
      .eq("subdomain", subdomain)
      .single();

    const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || "ghostwrite.app";
    const appName = process.env.APP_NAME || "Your App Name";

    return {
      title: organization?.company_name || subdomain,
      description:
        organization?.description ||
        `${organization?.company_name || subdomain} - Powered by ${appName}`,
      logo_url: organization?.logo_url,
      subdomain,
      appDomain,
    };
  } catch (error) {
    console.error("Error getting organization metadata:", error);
    return null;
  }
}
