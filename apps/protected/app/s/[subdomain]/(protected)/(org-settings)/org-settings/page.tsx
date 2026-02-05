// apps/protected/app/s/[subdomain]/(org-settings)/org-settings/page.tsx
/**
 * ✅ PHASE 2: Refactored org settings page - centralized auth
 * - No duplicate auth checks (layout handles it)
 * - Role check moved to wrapper component
 * - MIGRATED from: export const revalidate = 60
 *   → Dynamic by default with Cache Components; add "use cache" + cacheLife('minutes') if caching needed
 */
import type { ReactElement } from "react";
import { OrgSettingsWrapper } from "@/components/org-settings/org-settings-wrapper";

export default async function OrgSettingsPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}): Promise<ReactElement> {
  const { subdomain } = await params;

  // ✅ No auth calls - layout provides via context
  return (
    <OrgSettingsWrapper
      subdomain={subdomain}
      appDomain={process.env.NEXT_PUBLIC_APP_DOMAIN || ""}
    />
  );
}
