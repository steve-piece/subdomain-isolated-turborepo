// apps/protected/app/s/[subdomain]/(protected)/(dashboard)/dashboard/page.tsx
/**
 * ✅ PHASE 1.3: Simplified dashboard page
 * - No duplicate auth checks (layout handles it)
 * - Caching enabled (revalidate = 60)
 * - Minimal page, logic in wrapper component
 */
import { DashboardWrapper } from "@/components/dashboard/dashboard-wrapper";

// ✅ Enable caching - auth is handled by layout
export const revalidate = 60;

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;

  // ✅ No auth checks needed - layout guarantees user is authenticated
  // ✅ No noStore() - can cache this page for 60 seconds
  // ✅ Optional: Fetch dashboard-specific data here if needed

  return <DashboardWrapper subdomain={subdomain} />;
}
