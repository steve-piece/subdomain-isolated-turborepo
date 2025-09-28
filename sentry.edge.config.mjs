// sentry.edge.config.js
// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV,
  enableLogs: true,
  integrations: [
    Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
  ],
  tracesSampleRate: 1,
  tracePropagationTargets: [
    process.env.NEXT_PUBLIC_APP_DOMAIN
      ? `https://${process.env.NEXT_PUBLIC_APP_DOMAIN}`
      : undefined,
    process.env.NEXT_PUBLIC_MARKETING_DOMAIN
      ? `https://${process.env.NEXT_PUBLIC_MARKETING_DOMAIN}`
      : undefined,
    /^\/api/,
  ].filter(Boolean),
  debug: false,
});
