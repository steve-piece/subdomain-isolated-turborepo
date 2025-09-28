// apps/protected/app/global-error.tsx
"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
          <div className="w-full max-w-md space-y-8">
            <div>
              <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-foreground">
                Something went wrong!
              </h2>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                We&apos;ve been notified of this error and will work to fix it.
              </p>
            </div>
            <div className="space-y-4">
              <button
                onClick={() => reset()}
                className="group relative flex w-full justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Try again
              </button>
              <Link
                href="/"
                className="group relative flex w-full justify-center rounded-md border border-input px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                Go home
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
