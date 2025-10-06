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
 * Uses the subdomain from the route params to query organization logo
 */
export default async function Icon({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  try {
    const { subdomain } = await params;

    console.log(`[ICON] Processing icon request for subdomain: ${subdomain}`);

    const supabase = await createClient();

    // Use dedicated RPC function for fetching organization logo
    // This function is optimized and designed for unauthenticated access
    const { data, error: rpcError } = await supabase.rpc(
      "get_org_logo_by_subdomain",
      {
        p_subdomain: subdomain,
      },
    );

    // RPC returns an array, get first result
    const organization = data?.[0];

    console.log(`[ICON] RPC query result:`, {
      subdomain,
      company_name: organization?.company_name,
      logo_url: organization?.logo_url,
      error: rpcError?.message,
    });

    // Use custom logo if available, otherwise use default logo
    // RPC function returns empty string if no logo, so check for both null and empty
    const finalLogoUrl =
      organization?.logo_url && organization.logo_url.trim()
        ? organization.logo_url
        : DEFAULT_LOGO_URL;

    console.log(`[ICON] Final logo URL to fetch: ${finalLogoUrl}`);

    if (finalLogoUrl) {
      try {
        console.log(`[ICON] Fetching logo from: ${finalLogoUrl}`);
        const response = await fetch(finalLogoUrl, {
          // Add cache control to ensure fresh fetch
          cache: "no-store",
        });

        console.log(`[ICON] Fetch response status: ${response.status}`);

        if (response.ok) {
          const blob = await response.blob();
          const contentType =
            response.headers.get("content-type") ||
            (finalLogoUrl.endsWith(".jpg") || finalLogoUrl.endsWith(".jpeg")
              ? "image/jpeg"
              : "image/png");

          console.log(
            `[ICON] Successfully fetched logo, size: ${blob.size} bytes, type: ${contentType}`
          );

          return new Response(blob, {
            headers: {
              "Content-Type": contentType,
              "Cache-Control": "public, max-age=60, s-maxage=60",
            },
          });
        } else {
          console.error(
            `[ICON] Failed to fetch logo, status: ${response.status}`
          );
        }
      } catch (error) {
        // Log error but fall through to generated icon
        console.error(
          `[ICON] Failed to fetch logo for ${subdomain}:`,
          error instanceof Error ? error.message : "Unknown error"
        );
      }
    } else {
      console.log(`[ICON] No logo URL available, generating fallback`);
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
  } catch {
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
