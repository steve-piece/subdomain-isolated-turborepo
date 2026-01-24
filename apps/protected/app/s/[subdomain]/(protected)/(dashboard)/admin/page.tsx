// apps/protected/app/s/[subdomain]/(protected)/(dashboard)/admin/page.tsx
/**
 * ✅ PHASE 2: Refactored admin page - centralized auth
 * - No duplicate auth checks (layout handles it)
 * - Role check moved to wrapper component
 * - Caching enabled (revalidate = 60)
 * - Minimal page, logic in wrapper component
 */
import { AdminWrapper } from "@/components/admin/admin-wrapper";
import { createClient } from "@workspace/supabase/server";
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
  const appName =
    process.env.NEXT_PUBLIC_APP_NAME || process.env.APP_NAME || "Your App Name";

  return {
    title: `${companyName} Admin | ${appName}`,
  };
}

export default async function AdminPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;

  // ✅ No auth calls - layout provides via context
  // Role check and data fetching moved to wrapper component
  return <AdminWrapper subdomain={subdomain} />;
}
