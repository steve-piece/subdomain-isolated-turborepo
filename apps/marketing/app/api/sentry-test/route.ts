// apps/marketing/app/api/sentry-test/route.ts
// Test API route to verify Sentry error capture
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

export const dynamic = "force-dynamic";

export async function GET() {
  // Test console logging integration first
  console.error("🔥 SENTRY TEST: Console error from API route");
  console.warn("⚠️ SENTRY TEST: Console warning from API route");
  console.log("📝 SENTRY TEST: Console log from API route");

  // Test direct capture without try/catch
  Sentry.captureMessage("Direct message capture test", "info");

  try {
    // Log before the error for tracing using Sentry logger
    try {
      // Use logger if available (requires enableLogs: true)
      if (Sentry.logger && typeof Sentry.logger.info === "function") {
        Sentry.logger.info("Sentry test route accessed", {
          timestamp: new Date().toISOString(),
          purpose: "testing_sentry_configuration",
        });
      } else {
        // Fallback: use captureMessage with context
        Sentry.withScope((scope) => {
          scope.setLevel("info");
          scope.setContext("test_info", {
            timestamp: new Date().toISOString(),
            purpose: "testing_sentry_configuration",
          });
          Sentry.captureMessage("Sentry test route accessed", "info");
        });
      }
    } catch {
      // If logger fails, use console.log (will be captured by consoleLoggingIntegration)
      console.log("Sentry test route accessed", {
        timestamp: new Date().toISOString(),
        purpose: "testing_sentry_configuration",
      });
    }

    // Intentionally throw an error to test Sentry
    const testError = new Error(
      "Sentry Test Error - This is intentional for testing purposes",
    );
    testError.name = "SentryTestError";
    throw testError;
  } catch (error) {
    console.error("Error caught, attempting to send to Sentry:", error);

    // Capture the error with context
    Sentry.withScope((scope) => {
      scope.setTag("test", "sentry_configuration");
      scope.setTag("route", "api-sentry-test");
      scope.setLevel("error");
      scope.setContext("test_info", {
        route: "/api/sentry-test",
        purpose: "verify_sentry_setup",
        timestamp: new Date().toISOString(),
        app: "marketing",
      });

      console.log("Sending exception to Sentry...");
      Sentry.captureException(error);
      console.log("Exception sent to Sentry");
    });

    // Force flush to ensure event is sent
    try {
      await Sentry.flush(2000);
      console.log("Sentry flush completed");
    } catch (flushError) {
      console.error("Sentry flush error:", flushError);
    }

    // Still return an error response
    return NextResponse.json(
      {
        error: "Test error captured by Sentry",
        message: "This error should appear in your Sentry dashboard",
        timestamp: new Date().toISOString(),
        debug: "Check server logs for Sentry debug info",
      },
      { status: 500 },
    );
  }
}
