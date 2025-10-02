// apps/protected/app/icon.tsx
import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

export const runtime = "edge";
export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

// Default logo URL - used when organization doesn't have a custom logo
const DEFAULT_LOGO_URL =
  "https://qnbqrlpvokzgtfevnuzv.supabase.co/storage/v1/object/public/organization-logos/defaults/logo.png";

/**
 * Dynamic favicon generator for each organization
 * Works WITHOUT authentication by extracting subdomain from hostname
 * and querying the database directly
 */
export default async function Icon() {
  try {
    // Get subdomain from hostname (works without auth)
    const headersList = await headers();
    const host = headersList.get("host") || "";
    const subdomain = host.split(".")[0];

    console.log(`[ICON ROOT] Host: ${host}, Subdomain: ${subdomain}`);

    const supabase = await createClient();

    // Query database directly using subdomain (no auth required)
    const { data: organization } = await supabase
      .from("organizations")
      .select("logo_url, company_name")
      .eq("subdomain", subdomain)
      .single();

    console.log(`[ICON ROOT] Organization:`, organization);

    // Use custom logo if available, otherwise use default logo
    const finalLogoUrl = organization?.logo_url || DEFAULT_LOGO_URL;

    console.log(`[ICON ROOT] Fetching logo from: ${finalLogoUrl}`);
    try {
      const response = await fetch(finalLogoUrl);
      console.log(`[ICON ROOT] Logo fetch status: ${response.status}`);

      if (response.ok) {
        const blob = await response.blob();
        return new Response(blob, {
          headers: {
            "Content-Type": response.headers.get("content-type") || "image/png",
            "Cache-Control": "public, max-age=3600, s-maxage=3600, immutable",
          },
        });
      }
    } catch (error) {
      console.error("[ICON ROOT] Error fetching logo:", error);
      // Fall through to generated icon
    }

    // Generate a simple icon with the first letter
    const firstLetter = (organization?.company_name || subdomain)
      .charAt(0)
      .toUpperCase();

    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)",
            borderRadius: "6px",
          }}
        >
          <div
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: "white",
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
          >
            {firstLetter}
          </div>
        </div>
      ),
      {
        ...size,
      }
    );
  } catch (error) {
    console.error("[ICON ROOT] Error generating icon:", error);

    // Return a fallback icon
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            background: "#8b5cf6",
            borderRadius: "6px",
          }}
        />
      ),
      {
        ...size,
      }
    );
  }
}
