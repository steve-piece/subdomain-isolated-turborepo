// apps/protected/app/s/[subdomain]/icon.tsx
import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";

export const runtime = "edge";
export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

// Default logo URL - used when organization doesn't have a custom logo
const DEFAULT_LOGO_URL =
  process.env.NEXT_PUBLIC_DEFAULT_LOGO_URL ||
  "https://qnbqrlpvokzgtfevnuzv.supabase.co/storage/v1/object/public/organization-logos/defaults/logo.png";

/**
 * Dynamic favicon generator for each organization
 * Uses organization logo if available, otherwise generates SVG with first letter
 */
export default async function Icon({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;

  try {
    const supabase = await createClient();

    // Get logo from JWT claims (same as sidebar)
    const { data: claims } = await supabase.auth.getClaims();
    const logoUrl = claims?.claims.organization_logo_url as string | undefined;
    const companyName = claims?.claims.company_name as string | undefined;

    console.log(`[ICON] Subdomain: ${subdomain}, Logo from JWT:`, logoUrl);

    // Use custom logo if available, otherwise use default logo
    const finalLogoUrl = logoUrl || DEFAULT_LOGO_URL;

    console.log(`[ICON] Fetching logo from: ${finalLogoUrl}`);
    try {
      const response = await fetch(finalLogoUrl);
      console.log(`[ICON] Logo fetch status: ${response.status}`);

      if (response.ok) {
        const blob = await response.blob();
        return new Response(blob, {
          headers: {
            "Content-Type": response.headers.get("content-type") || "image/png",
            "Cache-Control": "public, max-age=300, s-maxage=300",
          },
        });
      }
    } catch (error) {
      console.error("[ICON] Error fetching logo:", error);
      // Fall through to generated icon
    }

    // Generate a simple icon with the first letter
    const firstLetter = (companyName || subdomain).charAt(0).toUpperCase();

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
    console.error("Error generating icon:", error);

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
