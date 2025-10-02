// apps/protected/app/s/[subdomain]/page.tsx
/**
 * ✅ PHASE 3: Subdomain landing page - centralized auth
 * - Auth is handled by parent layout
 * - Simply redirects to dashboard (no auth checks needed)
 */
import { redirect } from "next/navigation";

export default async function SubdomainPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  await params;

  // ✅ No auth checks - layout already verified access
  // Simply redirect to dashboard
  redirect("/dashboard");
}
