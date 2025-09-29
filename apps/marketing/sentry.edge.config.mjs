// apps/marketing/sentry.edge.config.mjs 
// sentry.edge.config.js
// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV,

  // Adds request headers and IP for users, for more info visit:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for tracing.
  // We recommend adjusting this value in production
  tracesSampleRate: 1,
  integrations: [
    Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
  ],
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

  // Filter out known development and framework errors
  ignoreErrors: [
    "NEXT_REDIRECT",
    /Module.*was instantiated.*module factory is not available/,
    /Suspense Exception: This is not a real error/,
    /.*HMR update/,
  ],

  beforeSend(event) {
    // Filter out Next.js redirects and development-specific errors
    const errorMessage =
      event.message || event.exception?.values?.[0]?.value || "";

    if (
      errorMessage.includes("NEXT_REDIRECT") ||
      errorMessage.includes("module factory is not available") ||
      errorMessage.includes("Suspense Exception") ||
      errorMessage.includes("HMR update")
    ) {
      return null; // Don't send these events
    }

    return event;
  },
});
