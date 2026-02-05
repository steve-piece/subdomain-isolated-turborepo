// apps/protected/app/s/[subdomain]/(protected)/(user-settings)/security/page.tsx
/**
 * ✅ PHASE 1.5b: Simplified security page
 * - No duplicate auth checks (layout handles it)
 * - MIGRATED from: export const revalidate = 120
 *   → Dynamic by default with Cache Components; add "use cache" + cacheLife({ revalidate: 120 }) if caching needed
 */
import type { ReactElement } from "react";
import { createClient } from "@workspace/supabase/server";
import { SecurityWrapper } from "@/components/security/security-wrapper";

export default async function SecuritySettingsPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}): Promise<ReactElement> {
  const { subdomain } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const lastSignIn = user?.last_sign_in_at
    ? new Date(user.last_sign_in_at).toLocaleString()
    : "Never";

  return <SecurityWrapper subdomain={subdomain} lastSignIn={lastSignIn} />;
}
