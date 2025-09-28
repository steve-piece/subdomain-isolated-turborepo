// Test API route to verify Sentry error capture
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Log before the error for tracing
    Sentry.logger.info("sentry_test_route_accessed", {
      timestamp: new Date().toISOString(),
      purpose: "testing_sentry_configuration",
      app: "protected",
    });

    // Intentionally throw an error to test Sentry
    throw new Error("Protected App Sentry Test Error - This is intentional for testing purposes");
  } catch (error) {
    // Capture the error with context
    Sentry.withScope((scope) => {
      scope.setTag("test", "sentry_configuration");
      scope.setTag("app", "protected");
      scope.setContext("test_info", {
        route: "/api/sentry-test",
        purpose: "verify_sentry_setup",
        app: "protected",
        timestamp: new Date().toISOString(),
      });
      Sentry.captureException(error);
    });

    // Still return an error response
    return NextResponse.json(
      { 
        error: "Protected app test error captured by Sentry",
        message: "This error should appear in your Sentry dashboard",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
