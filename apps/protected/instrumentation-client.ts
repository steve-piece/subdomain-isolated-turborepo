// apps/protected/instrumentation-client.ts 
// instrumentation-client.ts
// This file configures the initialization of Sentry for the client-side.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

// This will be loaded when the browser initializes
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Performance Monitoring
  tracesSampleRate: 1.0,

  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
    Sentry.replayIntegration({
      // The session sampling is configured below, not here
      maskAllText: false,
      blockAllMedia: false,
    }),
    Sentry.feedbackIntegration({
      colorScheme: "system",
    }),
  ],

  // Set tracePropagationTargets to control distributed tracing
  tracePropagationTargets: [
    "localhost",
    /^\//, // Same-origin requests
    /^\/api/, // API routes
    ...(process.env.NEXT_PUBLIC_APP_DOMAIN
      ? [`https://${process.env.NEXT_PUBLIC_APP_DOMAIN}`]
      : []),
    ...(process.env.NEXT_PUBLIC_MARKETING_DOMAIN
      ? [`https://${process.env.NEXT_PUBLIC_MARKETING_DOMAIN}`]
      : []),
  ],

  // Session Replay configuration
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Additional user context
  sendDefaultPii: true,

  debug: false,

  // Filter out known development and framework errors
  ignoreErrors: [
    "NEXT_REDIRECT",
    /Module.*was instantiated.*module factory is not available/,
    /Suspense Exception: This is not a real error/,
    /.*HMR update/,
    /ResizeObserver loop limit exceeded/,
    /Non-Error promise rejection captured/,
  ],

  beforeSend(event) {
    // Filter out Next.js and development-specific errors
    const errorMessage =
      event.message || event.exception?.values?.[0]?.value || "";

    if (
      errorMessage.includes("NEXT_REDIRECT") ||
      errorMessage.includes("module factory is not available") ||
      errorMessage.includes("Suspense Exception") ||
      errorMessage.includes("HMR update") ||
      errorMessage.includes("ResizeObserver loop limit")
    ) {
      return null; // Don't send these events
    }

    return event;
  },
});

// Export router instrumentation for Next.js App Router
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
