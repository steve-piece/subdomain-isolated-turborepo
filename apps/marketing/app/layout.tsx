// apps/marketing/app/layout.tsx
// Marketing app root layout that registers Sentry metadata and wraps providers.
import { Geist, Geist_Mono } from "next/font/google";

import "@workspace/ui/globals.css";
import { Providers } from "@/components/providers";
import * as Sentry from "@sentry/nextjs";
import type { Metadata } from "next";

export function generateMetadata(): Metadata {
  const appName = process.env.APP_NAME || "Your App Name";

  return {
    title: {
      default: appName,
      template: `%s | ${appName}`,
    },
    description: "Transform your workflow with AI-powered tools",
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
