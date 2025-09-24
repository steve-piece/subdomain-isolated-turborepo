import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OrganizationDashboard } from "@/components/organization-dashboard";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;

  try {
    const supabase = await createClient();

    // Get claims for fast, local authentication + tenant verification
    const { data: claims, error } = await supabase.auth.getClaims();

    // If no claims or auth error, redirect to login
    if (!claims || error) {
      redirect("/auth/login");
    }

    // Verify user belongs to this specific subdomain/organization
    if (claims.claims.subdomain !== subdomain) {
      redirect("/auth/login?error=unauthorized");
    }

    const userName =
      claims.claims.user_metadata?.full_name ||
      claims.claims.email ||
      "Unknown User";

    const organizationName =
      claims.claims.company_name ?? claims.claims.subdomain;

    return (
      <OrganizationDashboard
        organizationName={organizationName}
        subdomain={subdomain}
        userEmail={userName}
      />
    );
  } catch (error) {
    console.error("Dashboard auth error:", error);
    redirect("/auth/login");
  }
}
