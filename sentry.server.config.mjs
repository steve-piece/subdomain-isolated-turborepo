// sentry.server.config.js
// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

console.log(
  "🔧 SENTRY SERVER CONFIG: Initializing with DSN:",
  process.env.SENTRY_DSN ? "✅ Present" : "❌ Missing"
);
console.log(
  "🔧 SENTRY SERVER CONFIG: Environment:",
  process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV
);

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV,
  enableLogs: true,
  integrations: [
    Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
  ],
  tracesSampleRate: 1,
  tracePropagationTargets: [
    "localhost",
    /^\/api/,
    process.env.NEXT_PUBLIC_APP_DOMAIN
      ? `https://${process.env.NEXT_PUBLIC_APP_DOMAIN}`
      : undefined,
    process.env.NEXT_PUBLIC_MARKETING_DOMAIN
      ? `https://${process.env.NEXT_PUBLIC_MARKETING_DOMAIN}`
      : undefined,
  ].filter(Boolean),
  debug: true, // Enable debug mode temporarily

  beforeSend(event) {
    console.log("🚀 SENTRY: Sending event to Sentry", {
      type: event.type,
      level: event.level,
      message: event.message,
      exception: event.exception?.values?.[0]?.value,
    });
    return event;
  },
});

console.log("✅ SENTRY SERVER CONFIG: Initialization complete");
