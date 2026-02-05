// apps/protected/app/s/[subdomain]/(protected)/(user-settings)/profile/page.tsx
/**
 * ✅ PHASE 2: Refactored profile page - centralized auth
 * - No duplicate auth checks (layout handles it)
 * - Data fetching moved to wrapper component
 * - MIGRATED from: export const revalidate = 120
 *   → Dynamic by default with Cache Components; add "use cache" + cacheLife({ revalidate: 120 }) if caching needed
 */
import type { ReactElement } from "react";
import { ProfileWrapper } from "@/components/profile/profile-wrapper";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}): Promise<ReactElement> {
  const { subdomain } = await params;

  // ✅ No auth calls - layout provides via context
  return <ProfileWrapper subdomain={subdomain} />;
}
