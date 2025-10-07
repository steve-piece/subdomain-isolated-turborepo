// apps/protected/app/s/[subdomain]/opengraph-image.tsx
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Organization";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

/**
 * Static OpenGraph image for social media sharing
 */
export default async function OgImage() {
  const appName = process.env.APP_NAME || "Your App Name";

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
        {/* App Name */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: "white",
            textAlign: "center",
            maxWidth: 1000,
          }}
        >
          {appName}
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
