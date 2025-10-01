// apps/protected/app/s/[subdomain]/icon.tsx
import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";

export const runtime = "edge";
export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

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
    const { data: organization } = await supabase
      .from("organizations")
      .select("logo_url, company_name")
      .eq("subdomain", subdomain)
      .single();

    // If organization has a logo, fetch and return it
    if (organization?.logo_url) {
      try {
        const response = await fetch(organization.logo_url);
        const blob = await response.blob();
        return new Response(blob, {
          headers: {
            "Content-Type": response.headers.get("content-type") || "image/png",
            "Cache-Control": "public, max-age=3600, s-maxage=3600",
          },
        });
      } catch (error) {
        console.error("Error fetching organization logo:", error);
        // Fall through to generated icon
      }
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
