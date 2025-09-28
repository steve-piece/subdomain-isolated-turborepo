// sentry.client.config.js
// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever the browser loads a page.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

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
      // Capture 10% of all sessions,
      // plus 100% of sessions with an error
      sessionSampleRate: 0.1,
      errorSampleRate: 1.0,
    }),
    Sentry.feedbackIntegration({
      colorScheme: "system",
    }),
  ],

  // Set tracePropagationTargets to control distributed tracing
  tracePropagationTargets: [
    "localhost",
    /^\//, // Same-origin requests
    process.env.NEXT_PUBLIC_APP_DOMAIN ? `https://${process.env.NEXT_PUBLIC_APP_DOMAIN}` : undefined,
    process.env.NEXT_PUBLIC_MARKETING_DOMAIN ? `https://${process.env.NEXT_PUBLIC_MARKETING_DOMAIN}` : undefined,
    /^\/api/, // API routes
  ].filter(Boolean),

  // Session Replay configuration
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  
  // Additional user context
  sendDefaultPii: true,

  debug: false,
});

// Export router instrumentation for Next.js App Router
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
