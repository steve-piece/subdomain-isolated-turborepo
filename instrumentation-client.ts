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
});

// Export router instrumentation for Next.js App Router
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
