// apps/protected/next.config.mjs
/* eslint-disable no-undef */
/** @type {import('next').NextConfig} */
import { withSentryConfig } from "@sentry/nextjs";

// Extract hostname from SUPABASE_URL
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseHostname = new URL(supabaseUrl).hostname;

const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHostname,
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "3mb", // Allow up to 3MB for avatar uploads (2MB max file + overhead)
    },
  },
  // Fix OpenTelemetry/Sentry instrumentation package conflicts
  serverExternalPackages: [
    "require-in-the-middle",
    "import-in-the-middle",
    "@opentelemetry/instrumentation",
  ],
};

const sentryWebpackPluginOptions = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Suppress build output logs
  silent: true,

  // Source maps configuration
  sourcemaps: {
    disable: process.env.NODE_ENV === "development",
    deleteSourcemapsAfterUpload: true, // Security: remove source maps from public access
  },
};

export default withSentryConfig(nextConfig, sentryWebpackPluginOptions);
