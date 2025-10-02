// apps/protected/app/s/[subdomain]/(org-settings)/org-settings/team/page.tsx
/**
 * ✅ PHASE 2: Refactored team page - centralized auth
 * - No duplicate auth checks (layout handles it)
 * - Role check moved to wrapper component
 * - Caching enabled (revalidate = 30)
 */
import { TeamSettingsWrapper } from "@/components/org-settings/team/team-settings-wrapper";

// ✅ Team page is more dynamic - cache for 30 seconds
export const revalidate = 30;

export default async function TeamSettingsPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;

  // ✅ No auth calls - layout provides via context
  return <TeamSettingsWrapper subdomain={subdomain} />;
}
