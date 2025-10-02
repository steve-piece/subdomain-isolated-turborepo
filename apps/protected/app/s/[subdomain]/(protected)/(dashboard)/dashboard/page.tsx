// apps/protected/app/s/[subdomain]/(protected)/(dashboard)/dashboard/page.tsx
/**
 * ✅ PHASE 1.3: Simplified dashboard page
 * - No duplicate auth checks (layout handles it)
 * - Caching enabled (revalidate = 60)
 * - Minimal page, logic in wrapper component
 */
import { DashboardWrapper } from "@/components/dashboard/dashboard-wrapper";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

// ✅ Enable caching - auth is handled by layout
export const revalidate = 60;

// ✅ Generate dynamic page title
export async function generateMetadata({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}): Promise<Metadata> {
  const { subdomain } = await params;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();

  const companyName = claims?.claims.company_name || subdomain;
  // Read APP_NAME from environment - ensure it's defined in .env.local
  const appName =
    process.env.NEXT_PUBLIC_APP_NAME || process.env.APP_NAME || "Your App Name";

  return {
    title: `${companyName} Dashboard | ${appName}`,
  };
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;

  // ✅ No auth calls - layout provides via context
  // Data fetching moved to wrapper component which reads from context
  return <DashboardWrapper subdomain={subdomain} />;
