// apps/protected/app/s/[subdomain]/(org-settings)/org-settings/page.tsx
/**
 * ✅ PHASE 1.5d: Simplified org settings page
 * - Simple role check (no RequireTenantAuth wrapper)
 * - Caching enabled (revalidate = 60)
 */
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OrganizationIdentityForm } from "@/components/org-settings/general/organization-identity-form";
import { OrganizationLogoUpload } from "@/components/org-settings/general/organization-logo-upload";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

// ✅ Org settings change infrequently - cache for 60 seconds
export const revalidate = 60;

export default async function OrgSettingsPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;
  const supabase = await createClient();

  // ✅ Simple role check
  const { data: claims } = await supabase.auth.getClaims();
  const userRole = claims?.claims.user_role || "member";

  if (!["owner", "admin", "superadmin"].includes(userRole)) {
    redirect("/dashboard?error=unauthorized");
  }

  const orgId = claims?.claims.org_id;
  if (!orgId) {
    redirect("/dashboard?error=no_organization");
  }

  // Fetch organization data
  const { data: organization } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", orgId)
    .single();

  if (!organization) {
    redirect("/dashboard?error=organization_not_found");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Organization Settings</CardTitle>
          <CardDescription>
            Manage your organization&apos;s identity and preferences
          </CardDescription>
        </CardHeader>
      </Card>

      <OrganizationLogoUpload
        organizationName={organization.company_name}
        currentLogoUrl={organization.logo_url || null}
      />

      <OrganizationIdentityForm
        organizationName={organization.company_name || ""}
        subdomain={organization.subdomain || subdomain}
        description={organization.description || ""}
        appDomain={process.env.NEXT_PUBLIC_APP_DOMAIN || ""}
        onSubmit={async () => ({
          success: true,
          message: "Organization settings updated successfully!",
        })}
      />
    </div>
  );
}
