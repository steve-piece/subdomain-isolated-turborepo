"use client";

import { useState } from "react";
import * as Sentry from "@sentry/nextjs";

export function SentryTestButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<string>("");

  const testClientSideError = () => {
    try {
      Sentry.logger.info("client_side_sentry_test", {
        timestamp: new Date().toISOString(),
        purpose: "testing_client_side_sentry",
      });

      // Intentionally throw a client-side error
      throw new Error("Client-side Sentry Test Error - This is intentional");
    } catch (error) {
      Sentry.withScope((scope) => {
        scope.setTag("test", "client_side_sentry");
        scope.setContext("client_test", {
          component: "SentryTestButton",
          purpose: "verify_client_sentry_setup",
          timestamp: new Date().toISOString(),
        });
        Sentry.captureException(error);
      });

      setTestResult("Client-side error sent to Sentry!");
    }
  };

  const testServerSideError = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/sentry-test");
      const data = await response.json();

      if (!response.ok) {
        setTestResult(`Server error captured: ${data.message}`);
      } else {
        setTestResult("Unexpected success - should have been an error");
      }
    } catch (error) {
      setTestResult(
        `Network error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-4 bg-card">
      <h3 className="font-semibold text-lg">🧪 Sentry Test Suite</h3>
      <p className="text-sm text-muted-foreground">
        Use these buttons to verify Sentry error capture is working correctly.
      </p>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={testClientSideError}
          className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
        >
          Test Client Error
        </button>

        <button
          onClick={testServerSideError}
          disabled={isLoading}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 transition-colors"
        >
          {isLoading ? "Testing..." : "Test Server Error"}
        </button>
      </div>

      {testResult && (
        <div className="p-3 bg-muted rounded text-sm">
          <strong>Result:</strong> {testResult}
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        💡 Check your Sentry dashboard after clicking these buttons to see the
        captured errors.
      </div>
    </div>
  );
}
