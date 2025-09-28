// apps/protected/app/s/[subdomain]/(protected)/dashboard/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OrganizationDashboard } from "@/components/organization-dashboard";
import * as Sentry from "@sentry/nextjs";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;

  const supabase = await createClient();
  let claims;

  try {
    const { data, error } = await supabase.auth.getClaims();

    if (!data || error) {
      Sentry.logger.warn("dashboard_missing_claims", {
        subdomain,
        hasData: Boolean(data),
        errorMessage: error?.message,
      });
      redirect("/auth/login?reason=no_session");
    }

    claims = data;
  } catch (error) {
    Sentry.captureException(error);
    Sentry.logger.error("dashboard_claims_fetch_error", {
      message: error instanceof Error ? error.message : "Unknown error",
      subdomain,
    });
    throw error;
  }

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
}
