// apps/marketing/next.config.mjs
/** @type {import('next').NextConfig} */
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig = {
  transpilePackages: ["@workspace/ui"],
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
