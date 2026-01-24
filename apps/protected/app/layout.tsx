// apps/protected/app/layout.tsx
// Protected app root layout wiring fonts, Sentry metadata, and global providers.
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";
import { Providers } from "@/components/shared/providers";
import * as Sentry from "@sentry/nextjs";
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
export function generateMetadata(): Metadata {
  const appName = process.env.APP_NAME || "Your App Name";

  return {
    title: {
      default: appName,
      template: `%s | ${appName}`,
    },
    icons: {
      icon: "/favicon.ico",
      apple: "/apple-touch-icon.png",
    },
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
