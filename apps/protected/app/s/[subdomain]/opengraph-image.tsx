// apps/protected/app/s/[subdomain]/opengraph-image.tsx
import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";

export const runtime = "edge";
export const alt = "Organization";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

/**
 * Dynamic OpenGraph image for each organization
 * Displays organization logo and name
 */
export default async function OgImage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;

  try {
    const supabase = await createClient();
    const { data: organization } = await supabase
      .from("organizations")
      .select("company_name, description, logo_url")
      .eq("subdomain", subdomain)
      .single();

    const orgName = organization?.company_name || subdomain;
    const description = organization?.description || "";

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          {/* Logo or First Letter */}
          {organization?.logo_url ? (
            <img
              src={organization.logo_url}
              alt={orgName}
              style={{
                width: 150,
                height: 150,
                borderRadius: 20,
                marginBottom: 40,
                objectFit: "contain",
                background: "white",
                padding: 20,
              }}
            />
          ) : (
            <div
              style={{
                width: 150,
                height: 150,
                borderRadius: 20,
                background: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 72,
                fontWeight: 700,
                color: "#667eea",
                marginBottom: 40,
              }}
            >
              {orgName.charAt(0).toUpperCase()}
            </div>
          )}

          {/* Organization Name */}
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              color: "white",
              textAlign: "center",
              marginBottom: 20,
              maxWidth: 900,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {orgName}
          </div>

          {/* Description */}
          {description && (
            <div
              style={{
                fontSize: 28,
                color: "rgba(255, 255, 255, 0.9)",
                textAlign: "center",
                maxWidth: 800,
                display: "flex",
                flexWrap: "wrap",
                lineHeight: 1.4,
              }}
            >
              {description.substring(0, 120)}
              {description.length > 120 ? "..." : ""}
            </div>
          )}
        </div>
      ),
      {
        ...size,
      },
    );
  } catch (error) {
    console.error("Error generating OpenGraph image:", error);

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: "white",
            }}
          >
            {subdomain}
          </div>
        </div>
      ),
      {
        ...size,
      },
    );
  }
}
