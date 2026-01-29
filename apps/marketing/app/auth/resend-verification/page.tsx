// apps/marketing/app/auth/resend-verification/page.tsx
import { Suspense } from "react";
import { ResendVerificationForm } from "./resend-verification-form";

export default function ResendVerificationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
          <div className="w-full max-w-md text-sm text-muted-foreground">
            Loading verification form...
          </div>
        </div>
      }
    >
      <ResendVerificationForm />
    </Suspense>
  );
}
