// apps/protected/app/layout.tsx
// Protected app root layout wiring fonts, Sentry metadata, and global providers.
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";

import "./globals.css";
import { Providers } from "@/components/shared/providers";
import * as Sentry from "@sentry/nextjs";
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
export function generateMetadata(): Metadata {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "Your App";
  const description = "Manage your workspace with powerful tools";
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || "localhost:3003";
  
  // Ensure valid URL for metadataBase (handles missing/invalid env vars during build)
  let siteUrl: string;
  let metadataBaseUrl: URL;
  try {
    metadataBaseUrl = new URL(`https://${appDomain}`);
    siteUrl = metadataBaseUrl.toString();
  } catch {
    metadataBaseUrl = new URL("https://localhost:3003");
    siteUrl = "https://localhost:3003";
  }

  return {
    title: {
      default: appName,
      template: `%s | ${appName}`,
    },
    description,
    metadataBase: metadataBaseUrl,
    openGraph: {
      title: appName,
      description,
      url: siteUrl,
      siteName: appName,
      locale: "en_US",
      type: "website",
      images: [
        {
          url: "/icon-white.png",
          width: 512,
          height: 512,
          alt: `${appName} Logo`,
        },
      ],
    },
    twitter: {
      card: "summary",
      title: appName,
      description,
      images: ["/icon-white.png"],
    },
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: "/icon-white.png", type: "image/png" },
      ],
      apple: "/icon-white.png",
    },
    manifest: "/site.webmanifest",
    other: {
      "apple-mobile-web-app-title": appName,
      ...Sentry.getTraceData(),
    },
  };
}

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactNode {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased `}
      >
        <Providers>
          <Suspense>{children}</Suspense>
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
