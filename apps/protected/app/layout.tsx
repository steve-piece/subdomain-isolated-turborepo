// apps/protected/app/layout.tsx
// Protected app root layout wiring fonts, Sentry metadata, and global providers.
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";
import { Providers } from "@/components/shared/providers";
import * as Sentry from "@sentry/nextjs";
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
export function generateMetadata(): Metadata {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "Your App";
  const description = "Manage your workspace with powerful tools";
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || "localhost:3003";
  const siteUrl = `https://${appDomain}`;

  return {
    title: {
      default: appName,
      template: `%s | ${appName}`,
    },
    description,
    metadataBase: new URL(siteUrl),
    openGraph: {
      title: appName,
      description,
      url: siteUrl,
      siteName: appName,
      locale: "en_US",
      type: "website",
      images: [
        {
          url: "/web-app-manifest-512x512.png",
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
      images: ["/web-app-manifest-512x512.png"],
    },
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      ],
      apple: "/apple-touch-icon.png",
    },
    manifest: "/site.webmanifest",
    other: {
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
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
