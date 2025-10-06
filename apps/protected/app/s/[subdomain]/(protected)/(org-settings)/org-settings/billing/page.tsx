// apps/protected/app/s/[subdomain]/(protected)/(org-settings)/org-settings/billing/page.tsx
/**
 * ✅ TIER-GATED: Billing page with Business+ access control
 * - Wrapped with RequireTierAccess for tier checking
 * - No duplicate auth checks (layout handles it)
 * - Role check moved to wrapper component
 * - ⚠️ NO CACHING - billing needs real-time subscription status
 */
import { unstable_noStore as noStore } from "next/cache";
import { BillingSettingsWrapper } from "@/components/org-settings/billing/billing-settings-wrapper";
import { RequireTierAccess } from "@/components/shared/require-tier-access";

export default async function BillingSettingsPage() {
  // ⚠️ Keep noStore() - billing needs real-time data
  noStore();

  // ✅ No auth calls - layout provides via context
  return (
    <RequireTierAccess
      featureName="Billing Management"
      featureDescription="Manage your subscription, view invoices, update payment methods, and track usage across your organization. Access detailed billing analytics and export reports."
    >
      <BillingSettingsWrapper />
    </RequireTierAccess>
  );
}
