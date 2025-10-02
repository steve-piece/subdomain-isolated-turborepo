// apps/marketing/app/layout.tsx
// Marketing app root layout that registers Sentry metadata and wraps providers.
import { Geist, Geist_Mono } from "next/font/google";

import "@workspace/ui/globals.css";
import { Providers } from "@/components/providers";
import * as Sentry from "@sentry/nextjs";
import type { Metadata } from "next";

export function generateMetadata(): Metadata {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "Your App";
  const description = "Transform your workflow with AI-powered tools";
  const marketingDomain = process.env.NEXT_PUBLIC_MARKETING_DOMAIN || "";
  const siteUrl = `https://${marketingDomain}`;

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
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased `}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
