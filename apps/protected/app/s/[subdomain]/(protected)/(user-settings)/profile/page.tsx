// apps/protected/app/s/[subdomain]/(protected)/(user-settings)/profile/page.tsx
/**
 * ✅ PHASE 2: Refactored profile page - centralized auth
 * - No duplicate auth checks (layout handles it)
 * - Data fetching moved to wrapper component
 * - Caching enabled (revalidate = 120)
 */
import type { ReactElement } from "react";
import { ProfileWrapper } from "@/components/profile/profile-wrapper";

// ✅ Profile changes infrequently - cache for 2 minutes
export const revalidate = 120;

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}): Promise<ReactElement> {
  const { subdomain } = await params;

  // ✅ No auth calls - layout provides via context
  return <ProfileWrapper subdomain={subdomain} />;
}
