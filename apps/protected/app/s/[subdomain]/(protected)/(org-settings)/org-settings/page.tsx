// apps/protected/app/s/[subdomain]/(org-settings)/org-settings/page.tsx
/**
 * ✅ PHASE 2: Refactored org settings page - centralized auth
 * - No duplicate auth checks (layout handles it)
 * - Role check moved to wrapper component
 * - Caching enabled (revalidate = 60)
 */
import { OrgSettingsWrapper } from "@/components/org-settings/org-settings-wrapper";

// ✅ Org settings change infrequently - cache for 60 seconds
export const revalidate = 60;

export default async function OrgSettingsPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;

  // ✅ No auth calls - layout provides via context
  return (
    <OrgSettingsWrapper
      subdomain={subdomain}
      appDomain={process.env.NEXT_PUBLIC_APP_DOMAIN || ""}
    />
  );
}
