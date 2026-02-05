// apps/protected/app/s/[subdomain]/(org-settings)/org-settings/team/page.tsx
/**
 * ✅ PHASE 2: Refactored team page - centralized auth
 * - No duplicate auth checks (layout handles it)
 * - Role check moved to wrapper component
 * - MIGRATED from: export const revalidate = 30
 *   → Dynamic by default with Cache Components; add "use cache" + cacheLife('seconds') if caching needed
 */
import type { ReactElement } from "react";
import { TeamSettingsWrapper } from "@/components/org-settings/team/team-settings-wrapper";

export default async function TeamSettingsPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}): Promise<ReactElement> {
  const { subdomain } = await params;

  // ✅ No auth calls - layout provides via context
  return <TeamSettingsWrapper subdomain={subdomain} />;
}
