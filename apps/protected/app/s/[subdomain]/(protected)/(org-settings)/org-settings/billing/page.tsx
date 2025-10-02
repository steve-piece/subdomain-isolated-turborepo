// apps/protected/app/s/[subdomain]/(protected)/(org-settings)/org-settings/billing/page.tsx
/**
 * ✅ PHASE 2: Refactored billing page - centralized auth
 * - No duplicate auth checks (layout handles it)
 * - Role check moved to wrapper component
 * - ⚠️ NO CACHING - billing needs real-time subscription status
 */
import { unstable_noStore as noStore } from "next/cache";
import { BillingSettingsWrapper } from "@/components/org-settings/billing/billing-settings-wrapper";

export default async function BillingSettingsPage() {
  // ⚠️ Keep noStore() - billing needs real-time data
  noStore();

  // ✅ No auth calls - layout provides via context
  return <BillingSettingsWrapper />;
}
