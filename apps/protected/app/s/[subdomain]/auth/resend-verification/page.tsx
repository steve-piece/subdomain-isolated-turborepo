// apps/protected/app/s/[subdomain]/auth/resend-verification/page.tsx
/**
 * ✅ Server component that unwraps params and passes to client component
 * - Follows Next.js 15+ pattern for handling Promise params
 * - Prevents React serialization errors
 */
import type { ReactElement } from "react";
import { ResendVerificationForm } from "@/components/auth/resend-verification-form";

export default async function ResendVerificationPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}): Promise<ReactElement> {
  // ✅ Await params in server component before passing to client component
  const { subdomain } = await params;

  return <ResendVerificationForm subdomain={subdomain} />;
}
