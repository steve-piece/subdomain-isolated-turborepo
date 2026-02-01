// apps/marketing/app/site.webmanifest/route.ts
import { NextResponse } from "next/server";

/**
 * Dynamic site.webmanifest route handler
 * Serves web app manifest with environment-based configuration
 */
export async function GET() {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "Your App";

  // Generate short name from app name (first word or first 12 chars)
  const shortName =
    appName.split(" ")[0] || appName.substring(0, 12) || "Your App";

  const manifest = {
    name: appName,
    short_name: shortName,
    icons: [
      {
        src: "/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    theme_color: "#8b5cf6",
    background_color: "#ffffff",
    display: "standalone",
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=3600, s-maxage=3600", // Cache for 1 hour
    },
  });
}
