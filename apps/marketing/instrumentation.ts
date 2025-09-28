import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config.mjs");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config.mjs");
  }
}

// Capture errors from nested React Server Components (Next.js 15+)
export const onRequestError = Sentry.captureRequestError;
